import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../../services/socket';
import { getChatHistoryApi, sendChatMessageApi, getSupportUserApi, markChatAsReadApi } from '../../api/chatApi';

const ChatWidget = () => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [supportAgent, setSupportAgent] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    const myUserId = user?.id || user?._id;

    // Load support agent and history when authenticated and chat is open
    useEffect(() => {
        if (!isAuthenticated || !myUserId) return;

        const loadSupportAndHistory = async () => {
            try {
                const supportRes = await getSupportUserApi();
                if (supportRes?.success && supportRes.data) {
                    const support = supportRes.data;
                    setSupportAgent(support);

                    // Fetch history
                    const historyRes = await getChatHistoryApi(myUserId, support._id);
                    if (historyRes?.success) {
                        // Bug 5: History is sorted descending (newest first) by backend, 
                        // we store it directly so it renders reversed.
                        setMessages(historyRes.data || []);
                    }
                }
            } catch (error) {
                console.error('[ChatWidget] Error loading chat setup:', error);
            }
        };

        if (isOpen) {
            loadSupportAndHistory();
            setUnreadCount(0);
        }
    }, [isAuthenticated, myUserId, isOpen]);

    // Socket real-time message listener
    useEffect(() => {
        if (!isAuthenticated || !myUserId) return;

        const socket = getSocket();
        if (!socket) return;

        // Join chat room (sends user ID)
        socket.emit('join_chat', { userId: myUserId });

        const handleIncomingChatMessage = (message) => {
            console.log('[Socket] Received new chat message:', message);
            
            // Only append if it belongs to this conversation
            if (
                (message.senderId === supportAgent?._id && message.receiverId === myUserId) ||
                (message.senderId === myUserId && message.receiverId === supportAgent?._id)
            ) {
                setMessages((prev) => [...prev, message]); // Append to end because backend list is now sorted ascending
            }

            if (!isOpen) {
                setUnreadCount((prev) => prev + 1);
            } else if (message.senderId === supportAgent?._id) {
                // If open, call API to mark as read
                markChatAsReadApi(supportAgent._id).catch(() => {});
            }
        };

        socket.on('chat_message', handleIncomingChatMessage);

        return () => {
            socket.off('chat_message', handleIncomingChatMessage);
        };
    }, [isAuthenticated, myUserId, supportAgent, isOpen]);

    // Scroll to bottom helper
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        // Bug 1: Allow sending whitespace-only messages if inputText is not completely empty
        if (!inputText) return;
        if (!supportAgent?._id) return;

        try {
            const res = await sendChatMessageApi(supportAgent._id, inputText);
            if (res?.success && res.message) {
                // Append to state list (matching the ascending order of history)
                setMessages((prev) => [...prev, res.message]);
                setInputText('');
            }
        } catch (error) {
            console.error('[ChatWidget] Error sending message:', error);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {/* Chat Window Panel */}
            {isOpen && (
                <div className="mb-4 flex h-[450px] w-[350px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300">
                    {/* Header */}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 px-4 py-4 text-white">
                        <div className="relative">
                            {supportAgent?.image ? (
                                <img src={supportAgent.image} alt="" className="h-10 w-10 rounded-full border border-white/20 object-cover" />
                            ) : (
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/25 text-lg font-bold">SP</div>
                            )}
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></span>
                        </div>
                        <div className="flex-1 text-left">
                            <h4 className="text-sm font-bold leading-tight">
                                {supportAgent ? `${supportAgent.firstName} ${supportAgent.lastName}` : 'Hỗ trợ SmartZone'}
                            </h4>
                            <p className="text-[11px] text-white/80">Liên hệ hỗ trợ trực tuyến</p>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="rounded-full p-1 hover:bg-white/10 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 flex flex-col gap-3">
                        {/* Messages display */}
                        {messages.length === 0 ? (
                            <div className="my-auto text-center text-slate-400 p-4">
                                <p className="text-sm">Bắt đầu trò chuyện với nhân viên hỗ trợ.</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === myUserId;
                                return (
                                    <div key={msg._id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                            isMe 
                                                ? 'bg-orange-500 text-white rounded-br-none' 
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                        }`}>
                                            {/* Fix Bug 7: Render safely as text node to prevent Stored XSS */}
                                            <div>{msg.content}</div>
                                            
                                            <span className={`block text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer Form */}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none focus:border-orange-500 focus:bg-white"
                        />
                        <button
                            type="submit"
                            className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Chat Bubble Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition"
                aria-label="Mở chat hỗ trợ"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white border border-white">
                                {unreadCount}
                            </span>
                        )}
                    </>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
