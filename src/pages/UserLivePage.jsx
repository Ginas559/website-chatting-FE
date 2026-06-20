import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, message, Spin, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { livestreamApi } from '../api/livestreamApi';
import { createLivestreamSocket } from '../sockets/livestreamSocket';
import LiveChatBox from '../components/livestream/LiveChatBox';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const PEER_CONNECT_TIMEOUT_MS = 30000;
const rtcConfig = { iceServers: ICE_SERVERS };

const UserLivePage = () => {
    const videoRef = useRef(null);
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const peerTimeoutRef = useRef(null);
    const adminSocketIdRef = useRef('');
    const remoteStreamRef = useRef(new MediaStream());

    const [livestream, setLivestream] = useState(null);
    const [liveSocket, setLiveSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [watching, setWatching] = useState(false);
    const [ended, setEnded] = useState(false);

    const closeConnection = () => {
        window.clearTimeout(peerTimeoutRef.current);
        peerTimeoutRef.current = null;
        peerRef.current?.close();
        peerRef.current = null;
        adminSocketIdRef.current = '';
        remoteStreamRef.current = new MediaStream();

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        socketRef.current?.emit('user-disconnect');
        socketRef.current?.disconnect();
        socketRef.current = null;
        setLiveSocket(null);
        setWatching(false);
    };

    const loadCurrentLive = async () => {
        setLoading(true);
        try {
            const response = await livestreamApi.getCurrent();
            const current = response?.data || {};
            setLivestream(current.hasLive && current.hasActiveAdminSocket ? current.live : null);
            setEnded(false);
        } catch (error) {
            message.error(error?.message || error?.errMessage || 'Không thể kiểm tra livestream');
        } finally {
            setLoading(false);
        }
    };

    const createPeerConnection = () => {
        const peer = new RTCPeerConnection(rtcConfig);
        peerRef.current = peer;

        peer.ontrack = (event) => {
            event.streams[0]?.getTracks().forEach((track) => {
                remoteStreamRef.current.addTrack(track);
            });

            if (videoRef.current) {
                videoRef.current.srcObject = remoteStreamRef.current;
            }
        };

        peer.onicecandidate = (event) => {
            if (event.candidate && adminSocketIdRef.current) {
                // ICE Candidate la thong tin duong mang de hai trinh duyet tim cach ket noi.
                socketRef.current?.emit('ice-candidate', {
                    liveId: livestream?._id,
                    targetSocketId: adminSocketIdRef.current,
                    candidate: event.candidate,
                });
            }
        };

        peer.onconnectionstatechange = () => {
            if (['connected', 'completed'].includes(peer.connectionState)) {
                window.clearTimeout(peerTimeoutRef.current);
                peerTimeoutRef.current = null;
            }
            if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
                closeConnection();
            }
        };

        peerTimeoutRef.current = window.setTimeout(() => {
            if (peerRef.current && !['connected', 'completed'].includes(peerRef.current.connectionState)) {
                message.error('Kết nối livestream quá thời gian chờ');
                closeConnection();
            }
        }, PEER_CONNECT_TIMEOUT_MS);

        return peer;
    };

    const startWatching = () => {
        if (!livestream?._id || watching) return;

        const socket = createLivestreamSocket();
        socketRef.current = socket;
        setLiveSocket(socket);
        setWatching(true);
        setEnded(false);

        socket.on('connect', () => {
            socket.emit('user-join-live', { liveId: livestream._id });
        });

        socket.on('offer', async ({ liveId, fromSocketId, offer }) => {
            if (String(liveId) !== String(livestream._id)) return;
            try {
                adminSocketIdRef.current = fromSocketId;
                const peer = peerRef.current || createPeerConnection();

                // Offer la mo ta ket noi do Admin tao va gui qua Socket.IO.
                await peer.setRemoteDescription(new RTCSessionDescription(offer));

                // Answer la phan hoi ket noi do User tao de Admin setRemoteDescription.
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);

                socket.emit('answer', {
                    liveId,
                    targetSocketId: fromSocketId,
                    answer,
                });
            } catch (error) {
                message.error(error?.message || 'Không thể nhận livestream');
                closeConnection();
            }
        });

        socket.on('ice-candidate', async ({ liveId, candidate }) => {
            if (String(liveId) !== String(livestream._id)) return;
            if (!peerRef.current || !candidate) return;
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('admin-end-live', ({ liveId }) => {
            if (String(liveId) !== String(livestream._id)) return;
            closeConnection();
            setLivestream(null);
            setEnded(true);
        });

        socket.on('livestream-error', ({ message: errorMessage }) => {
            message.error(errorMessage || 'Không thể xem livestream');
            closeConnection();
        });
    };

    useEffect(() => {
        void loadCurrentLive();
        return () => closeConnection();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Livestream SmartZone</h1>
                        <p className="mt-1 text-sm text-slate-500">Xem livestream realtime bằng WebRTC native.</p>
                    </div>
                    <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/">
                        Trang chủ
                    </Link>
                </div>

                {loading ? (
                    <Card><Spin /></Card>
                ) : ended ? (
                    <Alert type="info" showIcon message="Livestream đã kết thúc" />
                ) : !livestream ? (
                    <Card>
                        <Empty description="Hiện chưa có livestream" />
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <Card>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                controls
                                className="aspect-video w-full rounded-xl bg-slate-950"
                            />
                        </Card>

                        <Card title="Phiên đang live">
                            <div className="space-y-4">
                                <Tag color="red">LIVE</Tag>
                                <h2 className="text-xl font-bold text-slate-900">{livestream.title}</h2>
                                <p className="text-sm leading-6 text-slate-500">{livestream.description || 'Không có mô tả'}</p>
                                <Button type="primary" block loading={watching && !peerRef.current} onClick={startWatching} disabled={watching}>
                                    {watching ? 'Đang xem livestream' : 'Xem livestream'}
                                </Button>
                            </div>
                        </Card>
                        <div className="lg:col-span-2">
                            <LiveChatBox liveId={livestream?._id} socket={liveSocket} disabled={!watching || ended} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserLivePage;
