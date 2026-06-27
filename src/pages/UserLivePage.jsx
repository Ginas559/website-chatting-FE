import { useEffect, useRef, useState } from 'react';
import { Alert, Empty, message, Spin, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { LoadingOutlined } from '@ant-design/icons';
import { livestreamApi } from '../api/livestreamApi';
import { createLivestreamSocket } from '../sockets/livestreamSocket';
import LiveChatBox from '../components/livestream/LiveChatBox';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

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

                await peer.setRemoteDescription(new RTCSessionDescription(offer));

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
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />

            <main className="mx-auto max-w-[1800px] px-6 py-6">
                {loading ? (
                    <div className="grid min-h-[60vh] place-items-center"><Spin /></div>
                ) : ended ? (
                    <Alert className="text-left rounded-xl" type="info" showIcon message="Livestream đã kết thúc" />
                ) : !livestream ? (
                    <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-border-color bg-white">
                        <Empty description="Hiện chưa có livestream" />
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                        <section className="text-left">
                            <div className="overflow-hidden rounded-3xl bg-black shadow-lg">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    controls
                                    className="aspect-video w-full bg-black object-contain"
                                />
                            </div>
                            <div className="mt-4">
                                <h1 className="text-2xl font-bold leading-tight text-slate-950">{livestream.title}</h1>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <Tag color="red" className="font-bold px-2.5 py-0.5 rounded-full border-none">LIVE</Tag>
                                    <span className="text-sm text-slate-500">{livestream.description || 'Không có mô tả'}</span>
                                    <button
                                        type="button"
                                        onClick={startWatching}
                                        disabled={watching}
                                        className="ml-auto inline-flex items-center justify-center rounded-2xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-red/20 transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {watching && !peerRef.current && <LoadingOutlined className="mr-2" />}
                                        {watching ? 'Đang xem livestream' : 'Xem livestream'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <LiveChatBox liveId={livestream?._id} socket={liveSocket} disabled={!watching || ended} />
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default UserLivePage;
