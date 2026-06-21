import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Tag, message as antMessage } from 'antd';
import { Link } from 'react-router-dom';
import { liveChatApi } from '../../api/liveChatApi';

const roleClass = {
    ADMIN: 'text-amber-700',
    MANAGER: 'text-purple-700',
    USER: 'text-slate-800',
    SHIPPER: 'text-emerald-700',
};

const roleTagColor = {
    ADMIN: 'gold',
    MANAGER: 'purple',
    USER: 'blue',
    SHIPPER: 'green',
};

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

const LiveChatBox = ({ liveId, socket, disabled = false }) => {
    const listRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [banInfo, setBanInfo] = useState(null);
    const [warningText, setWarningText] = useState('');
    const pinnedMessage = useMemo(() => messages.find((item) => item.isPinned && !item.isDeleted), [messages]);
    const chatDisabled = disabled || Boolean(banInfo);

    const shouldAutoScroll = () => {
        const el = listRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    const upsertMessage = (nextMessage) => {
        const autoScroll = shouldAutoScroll();
        setMessages((current) => {
            const exists = current.some((item) => item._id === nextMessage._id);
            const next = exists
                ? current.map((item) => (item._id === nextMessage._id ? nextMessage : item))
                : [...current, nextMessage];
            return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        if (autoScroll) scrollToBottom();
    };

    useEffect(() => {
        let mounted = true;
        const loadMessages = async () => {
            if (!liveId) {
                setMessages([]);
                return;
            }
            try {
                const response = await liveChatApi.getRecentMessages(liveId);
                if (mounted) {
                    setMessages(response?.data || []);
                    scrollToBottom();
                }
            } catch (error) {
                antMessage.error(error?.message || 'Không thể tải lịch sử chat');
            }
        };

        void loadMessages();
        return () => {
            mounted = false;
        };
    }, [liveId]);

    useEffect(() => {
        if (!socket || !liveId) return undefined;

        socket.emit('join-live-chat', { liveId });
        const onReceive = ({ message }) => upsertMessage(message);
        const onDeleted = ({ message }) => upsertMessage(message);
        const onPinned = ({ message }) => {
            setMessages((current) => current.map((item) => ({ ...item, isPinned: item._id === message._id })));
            upsertMessage(message);
        };
        const onError = ({ message }) => antMessage.error(message || 'Lỗi live chat');
        const onWarning = ({ message }) => {
            setWarningText(message || 'Bình luận của bạn chưa phù hợp.');
            antMessage.warning(message || 'Bình luận của bạn chưa phù hợp.');
        };
        const onBanned = (payload) => {
            setBanInfo(payload);
            setWarningText('');
            antMessage.error(payload?.message || 'Bạn đang bị khóa chat.');
        };
        const onUnbanned = () => {
            setBanInfo(null);
            antMessage.success('Bạn đã được gỡ khóa chat.');
        };

        socket.on('receive-live-chat-message', onReceive);
        socket.on('live-chat-message-deleted', onDeleted);
        socket.on('live-chat-message-pinned', onPinned);
        socket.on('live-chat-error', onError);
        socket.on('live-chat-warning', onWarning);
        socket.on('live-chat-banned', onBanned);
        socket.on('live-chat-unbanned', onUnbanned);

        return () => {
            socket.off('receive-live-chat-message', onReceive);
            socket.off('live-chat-message-deleted', onDeleted);
            socket.off('live-chat-message-pinned', onPinned);
            socket.off('live-chat-error', onError);
            socket.off('live-chat-warning', onWarning);
            socket.off('live-chat-banned', onBanned);
            socket.off('live-chat-unbanned', onUnbanned);
        };
    }, [socket, liveId]);

    const sendMessage = () => {
        const text = content.trim();
        if (!text || !socket || !liveId || chatDisabled) return;

        setSending(true);
        socket.emit('send-live-chat-message', { liveId, content: text });
        setContent('');
        window.setTimeout(() => setSending(false), 250);
    };

    return (
        <div className="flex h-[calc(100vh-120px)] min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/60">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
                <div className="font-semibold">Tin nhắn trực tiếp</div>
                <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">LIVE</div>
            </div>
            <div className="px-3 pt-3">
                {banInfo ? (
                    <Alert
                        className="mb-3"
                        type="error"
                        showIcon
                        message="Bạn đang bị khóa chat"
                        description={(
                            <span>
                                Khóa đến {banInfo.bannedUntil ? new Date(banInfo.bannedUntil).toLocaleString('vi-VN') : 'chưa rõ'}.
                                {' '}<Link to="/live-chat/my-bans">Xem án phạt</Link>
                            </span>
                        )}
                    />
                ) : null}
                {warningText ? <Alert className="mb-3" type="warning" showIcon message={warningText} closable onClose={() => setWarningText('')} /> : null}
                {pinnedMessage ? (
                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <b className="text-amber-700">Đã ghim:</b> {pinnedMessage.content}
                    </div>
                ) : null}
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {!messages.length ? (
                    <Empty description={<span className="text-slate-400">Chưa có bình luận</span>} />
                ) : messages.map((item) => (
                    <div key={item._id} className="rounded-lg px-2 py-2 transition hover:bg-slate-50">
                        <div className="flex flex-wrap items-baseline gap-2 text-sm leading-6">
                            <span className="font-bold text-slate-900">{item.displayName}</span>
                            <Tag className="m-0 text-[10px] leading-4" color={roleTagColor[item.role] || 'default'}>{item.role}</Tag>
                            <span className="text-xs text-slate-400">{formatTime(item.createdAt)}</span>
                            <span className={`break-words ${item.isDeleted ? 'text-slate-400 italic' : roleClass[item.role] || 'text-slate-800'}`}>
                                {item.content}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="shrink-0 border-t border-slate-200 p-3">
                <div className="flex gap-2">
                    <Input
                        value={content}
                        maxLength={200}
                        disabled={chatDisabled}
                        placeholder={chatDisabled ? 'Chat đã đóng' : 'Trò chuyện với tư cách người đăng ký...'}
                        onChange={(event) => setContent(event.target.value)}
                        onPressEnter={sendMessage}
                        className="rounded-full border-slate-200 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400"
                    />
                    <Button className="rounded-full" type="primary" loading={sending} disabled={chatDisabled || !content.trim()} onClick={sendMessage}>Gửi</Button>
                </div>
            </div>
        </div>
    );
};

export default LiveChatBox;
