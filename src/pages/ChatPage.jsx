import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Spin, Modal, Input, Select, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { initiateSocketConnection, getSocket } from '../services/socket';
import { getChatContactsApi, getChatHistoryApi, sendChatMessageApi, markChatAsReadApi, getChatUsersApi, getChatUserByIdApi } from '../api/chatApi';

const formatVnd = (value) => {
    return Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });
};

const ChatPage = () => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const myUserId = user?.id || user?._id;
    const roleId = user?.roleId;

    const location = useLocation();
    const navigate = useNavigate();

    const [loadingContacts, setLoadingContacts] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
    const messagesContainerRef = useRef(null);
    const prevMessagesRef = useRef([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    // Fetch initial chat contacts
    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await getChatContactsApi();
            if (res?.success) {
                setContacts(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load contacts:', err);
            message.error('Không thể tải danh sách cuộc trò chuyện');
        } finally {
            setLoadingContacts(false);
        }
    };

    // Load contacts on mount
    useEffect(() => {
        if (myUserId) {
            fetchContacts();
        }
    }, [myUserId]);

    // Handle Query Param `?userId=...` to start direct chat
    useEffect(() => {
        if (!myUserId) return;

        const params = new URLSearchParams(location.search);
        const targetUserId = params.get('userId');

        if (targetUserId) {
            const handleDirectChatStart = async () => {
                try {
                    // Check if contact already exists in loaded contacts list
                    const existing = contacts.find(c => c._id === targetUserId);
                    if (existing) {
                        setActiveContact(existing);
                    } else {
                        // Fetch details of target user
                        const res = await getChatUserByIdApi(targetUserId);
                        if (res?.success && res.data) {
                            const newContact = res.data;
                            setContacts(prev => [
                                { ...newContact, unreadCount: 0 },
                                ...prev
                            ]);
                            setActiveContact(newContact);
                        } else {
                            message.error('Không tìm thấy người dùng này');
                        }
                    }
                } catch (err) {
                    console.error('Error starting direct chat:', err);
                }
            };
            handleDirectChatStart();
        }
    }, [location.search, myUserId, contacts.length === 0]); // Trigger once contacts loaded or when search query updates

    // Fetch history when active contact changes
    useEffect(() => {
        if (!myUserId || !activeContact) return;

        const fetchHistory = async () => {
            setLoadingHistory(true);
            setHasMoreMessages(true);
            try {
                const res = await getChatHistoryApi(myUserId, activeContact._id, { limit: 20 });
                if (res?.success) {
                    setMessages(res.data || []);
                    setHasMoreMessages(res.hasMore ?? (res.data?.length === 20));

                    // Mark as read
                    await markChatAsReadApi(activeContact._id);

                    // Reset unread count locally
                    setContacts(prev => prev.map(c =>
                        c._id === activeContact._id ? { ...c, unreadCount: 0 } : c
                    ));

                    // Scroll to bottom initially
                    setTimeout(() => {
                        if (messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                        }
                    }, 50);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [myUserId, activeContact]);

    const handleScroll = async () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (container.scrollTop === 0 && hasMoreMessages && !loadingMoreHistory && !loadingHistory && messages.length > 0) {
            setLoadingMoreHistory(true);
            const oldestMessage = messages[0];
            const beforeTimestamp = oldestMessage.createdAt;
            const scrollHeightBefore = container.scrollHeight;

            try {
                const res = await getChatHistoryApi(myUserId, activeContact._id, {
                    before: beforeTimestamp,
                    limit: 20
                });
                if (res?.success && res.data?.length > 0) {
                    const newMessages = res.data;
                    setMessages(prev => [...newMessages, ...prev]);
                    setHasMoreMessages(res.hasMore ?? (newMessages.length === 20));

                    // Restore scroll position so it doesn't jump
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight - scrollHeightBefore;
                    }, 0);
                } else {
                    setHasMoreMessages(false);
                }
            } catch (err) {
                console.error('Failed to load older messages:', err);
            } finally {
                setLoadingMoreHistory(false);
            }
        }
    };

    // Socket real-time message listener
    useEffect(() => {
        if (!myUserId) return;

        // Ensure socket is connected
        const socket = getSocket() || initiateSocketConnection(myUserId, roleId);
        if (!socket) return;

        // Join chat room
        socket.emit('join_chat', { userId: myUserId });

        const handleIncomingChatMessage = (msg) => {
            console.log('[Socket ChatPage] Received message:', msg);

            // Check if message belongs to the active conversation
            if (activeContact && (msg.senderId === activeContact._id || msg.receiverId === activeContact._id)) {
                setMessages((prev) => [...prev, msg]);
                if (msg.senderId === activeContact._id) {
                    markChatAsReadApi(activeContact._id).catch(() => { });
                }
            } else {
                // If it is from another user, increment unread count or reload contacts
                setContacts(prev => {
                    const existing = prev.some(c => c._id === msg.senderId);
                    if (existing) {
                        return prev.map(c => c._id === msg.senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c);
                    } else {
                        fetchContacts();
                        return prev;
                    }
                });
            }
        };

        socket.on('chat_message', handleIncomingChatMessage);

        return () => {
            socket.off('chat_message', handleIncomingChatMessage);
        };
    }, [myUserId, activeContact, roleId]);

    // Fetch all users for new chat modal
    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await getChatUsersApi();
            if (res?.success) {
                setAllUsers(res.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch system users:', err);
            message.error('Không thể tải danh sách người dùng');
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (isModalOpen) {
            fetchAllUsers();
        }
    }, [isModalOpen]);

    const handleSelectUser = (selectedUser) => {
        const exists = contacts.some(c => c._id === selectedUser._id);
        if (!exists) {
            setContacts(prev => [
                { ...selectedUser, unreadCount: 0 },
                ...prev
            ]);
        }
        setActiveContact(selectedUser);
        setIsModalOpen(false);
        setSearchQuery('');
        setRoleFilter('ALL');
        navigate('/chat', { replace: true }); // Clear query params if any
    };

    const filteredUsers = allUsers.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.roleId === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Scroll to bottom helper - only trigger for initial loads and appended new messages
    useEffect(() => {
        const prev = prevMessagesRef.current;
        const current = messages;
        
        const hasNewAppended = current.length > 0 && (
            prev.length === 0 || 
            current[current.length - 1]?._id !== prev[prev.length - 1]?._id ||
            current[current.length - 1]?.createdAt !== prev[prev.length - 1]?.createdAt
        );

        if (hasNewAppended) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        
        prevMessagesRef.current = messages;
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        if (!activeContact) return;

        try {
            const res = await sendChatMessageApi(activeContact._id, inputText);
            if (res?.success && res.message) {
                setMessages((prev) => [...prev, res.message]);
                setInputText('');

                setContacts(prev => {
                    const withoutCurrent = prev.filter(c => c._id !== activeContact._id);
                    return [activeContact, ...withoutCurrent];
                });
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            message.error('Không thể gửi tin nhắn');
        }
    };

    const displayRole = (role) => {
        switch (role) {
            case 'R1': return 'Admin';
            case 'R3': return 'Manager';
            case 'R4': return 'Shipper';
            default: return 'Khách';
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
                <div className="text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm">
                    <h3 className="text-lg font-bold text-slate-800">Yêu cầu đăng nhập</h3>
                    <p className="text-xs text-slate-500 mt-2">Vui lòng đăng nhập để sử dụng tính năng nhắn tin.</p>
                    <Link to="/login" className="mt-4 inline-block bg-brand-red hover:bg-brand-red/90 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition">
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="shrink-0 sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-red to-rose-600 text-xl font-black text-white shadow-lg shadow-brand-red/20">S</span>
                        <div className="text-left">
                            <div className="text-lg font-black text-slate-900 font-sans">SmartZone Store</div>
                            <div className="text-xs uppercase tracking-[0.2em] text-brand-red font-bold">Tech Lifestyle</div>
                        </div>
                    </Link>
                    <div className="ml-auto flex items-center gap-3">
                        <Link to="/" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Trang chủ
                        </Link>
                        <Link className="inline-flex items-center gap-2 rounded-xl border border-brand-red/20 bg-brand-red/5 px-4 py-2 text-sm font-semibold text-brand-red" to="/cart">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Chat Layout Container */}
            <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col p-6 overflow-hidden min-h-0">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden min-h-0">

                    {/* Left Pane: Contacts List */}
                    <div className="md:col-span-4 border-r border-slate-100 flex flex-col bg-white h-full min-h-0">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="text-left">
                                <h2 className="text-lg font-black text-slate-800">Tin nhắn</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Danh sách cuộc trò chuyện</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 transition"
                            >
                                + Chat mới
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto chat-scrollbar">
                            <Spin spinning={loadingContacts}>
                                {contacts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        Không có cuộc trò chuyện nào. Bấm "+ Chat mới" để bắt đầu.
                                    </div>
                                ) : (
                                    contacts.map((contact) => {
                                        const isSelected = activeContact?._id === contact._id;
                                        return (
                                            <button
                                                key={contact._id}
                                                onClick={() => {
                                                    setActiveContact(contact);
                                                    navigate('/chat', { replace: true }); // Clear query params if any
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-4 text-left border-b border-slate-50 transition ${isSelected ? 'bg-brand-red/5 border-l-4 border-l-brand-red' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                {/* Profile Avatar */}
                                                <div className="relative">
                                                    {contact.image ? (
                                                        <img src={contact.image} alt="" className="h-11 w-11 rounded-full object-cover border border-slate-200" />
                                                    ) : (
                                                        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500 font-bold text-sm">
                                                            {contact.firstName?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                    {contact.unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                                                            {contact.unreadCount}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex justify-between items-baseline">
                                                        <h4 className="text-sm font-bold text-slate-800 truncate">
                                                            {contact.firstName} {contact.lastName}
                                                        </h4>
                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 uppercase tracking-wider font-semibold">
                                                            {displayRole(contact.roleId)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">{contact.email}</p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </Spin>
                        </div>
                    </div>

                    {/* Right Pane: Conversation Area */}
                    <div className="md:col-span-8 flex flex-col bg-slate-50/50 h-full min-h-0">
                        {activeContact ? (
                            <div className="flex flex-col flex-1 h-full overflow-hidden">
                                {/* Chat Header */}
                                <div className="flex items-center gap-3 bg-white border-b border-slate-100 px-6 py-4 shadow-sm">
                                    {activeContact.image ? (
                                        <img src={activeContact.image} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-100" />
                                    ) : (
                                        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-red/10 text-brand-red font-bold">
                                            {activeContact.firstName?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                    <div className="text-left flex-1">
                                        <h3 className="text-sm font-bold text-slate-800 leading-tight">
                                            {activeContact.firstName} {activeContact.lastName}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{activeContact.email} · {displayRole(activeContact.roleId)}</p>
                                    </div>
                                </div>

                                {/* Messages View */}
                                <div 
                                    ref={messagesContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50 chat-scrollbar"
                                >
                                    {loadingMoreHistory && (
                                        <div className="text-center py-2 shrink-0">
                                            <Spin size="small" />
                                        </div>
                                    )}

                                    <Spin spinning={loadingHistory && messages.length === 0}>
                                        {messages.length === 0 && !loadingHistory ? (
                                            <div className="my-auto text-center text-slate-400 p-8">
                                                Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện.
                                            </div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isMe = msg.senderId === myUserId;
                                                return (
                                                    <div key={msg._id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm text-left ${isMe
                                                                ? 'bg-gradient-to-br from-brand-red to-rose-600 text-white rounded-br-none shadow-md shadow-brand-red/10'
                                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                                            }`}>
                                                            <div>{msg.content}</div>
                                                            <span className={`block text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </Spin>
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Send Input Form */}
                                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white border-t border-slate-100 p-4">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={`Nhập phản hồi gửi đến ${activeContact.firstName}...`}
                                        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-800 outline-none focus:border-brand-red focus:bg-white focus:ring-4 focus:ring-brand-red/5 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 px-6 text-sm font-bold text-white transition active:scale-95"
                                    >
                                        Gửi
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <h3 className="text-lg font-black text-slate-700">Chọn cuộc trò chuyện</h3>
                                <p className="text-sm mt-1">Chọn một liên hệ ở danh sách bên trái hoặc tạo mới để bắt đầu chat.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal Bắt đầu chat mới */}
            <Modal
                title={<span className="text-lg font-bold text-slate-800">Bắt đầu cuộc trò chuyện mới</span>}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setSearchQuery('');
                    setRoleFilter('ALL');
                }}
                footer={null}
                width={500}
                centered
            >
                <div className="space-y-4 mt-4 font-sans text-left">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Tìm theo tên hoặc email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 rounded-xl"
                            allowClear
                        />
                        <Select
                            value={roleFilter}
                            onChange={(value) => setRoleFilter(value)}
                            className="w-32"
                            options={[
                                { value: 'ALL', label: 'Tất cả' },
                                { value: 'R1', label: 'Admin' },
                                { value: 'R2', label: 'Khách hàng' },
                                { value: 'R3', label: 'Manager' },
                                { value: 'R4', label: 'Shipper' },
                            ]}
                        />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 pr-1">
                        <Spin spinning={loadingUsers}>
                            {filteredUsers.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    Không tìm thấy người dùng nào
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <button
                                        key={u._id}
                                        onClick={() => handleSelectUser(u)}
                                        className="w-full flex items-center gap-3 py-3 px-2 text-left hover:bg-slate-50 transition rounded-xl"
                                    >
                                        {u.image ? (
                                            <img src={u.image} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-100" />
                                        ) : (
                                            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-red/10 text-brand-red font-bold text-sm">
                                                {u.firstName?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm font-bold text-slate-800 truncate">
                                                    {u.firstName} {u.lastName}
                                                </span>
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-semibold uppercase tracking-wider">
                                                    {displayRole(u.roleId)}
                                                </span>
                                            </div>
                                            <span className="block text-xs text-slate-400 truncate mt-0.5">{u.email}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </Spin>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ChatPage;
