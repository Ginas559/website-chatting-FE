import { useEffect, useState } from 'react';
import { Alert, Empty, Input, Modal, Spin, Table, Tag, message } from 'antd';
import { Link } from 'react-router-dom';
import { liveChatModerationApi } from '../api/liveChatModerationApi';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const statusColor = {
    ACTIVE: 'red',
    UNBANNED: 'green',
    EXPIRED: 'default',
};

const violationText = {
    LEVEL_2_SINGLE: 'Bình luận nghiêm trọng',
    THREE_LEVEL_1_IN_LIVE: '3 bình luận chưa phù hợp trong cùng phiên live',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const buildCommentColumns = () => [
    {
        title: 'STT',
        width: 80,
        render: (_, __, index) => index + 1,
    },
    {
        title: 'Bình luận vi phạm',
        dataIndex: 'content',
        render: (text) => <span className="font-medium text-slate-900">{text}</span>,
    },
    {
        title: 'Thời gian',
        dataIndex: 'createdAt',
        width: 220,
        render: formatDateTime,
    },
];

const MyLiveChatBansPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await liveChatModerationApi.getMyBans();
            setItems(response?.data || []);
        } catch (error) {
            message.error(error?.message || 'Không thể tải án phạt live chat');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const openRequestModal = (item) => {
        let reason = '';
        Modal.confirm({
            title: 'Gửi yêu cầu gỡ ban',
            content: (
                <Input.TextArea
                    rows={4}
                    placeholder="Nhập lý do xin gỡ ban, tối thiểu 5 ký tự"
                    onChange={(event) => {
                        reason = event.target.value;
                    }}
                />
            ),
            okText: 'Gửi yêu cầu',
            cancelText: 'Hủy',
            onOk: async () => {
                await liveChatModerationApi.createUnbanRequest(item._id, reason);
                message.success('Đã gửi yêu cầu gỡ ban');
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />
            <main className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-left">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Án phạt live chat</h1>
                        <p className="mt-2 text-slate-600">Xem bình luận dẫn đến khóa chat và gửi yêu cầu gỡ ban nếu cần.</p>
                    </div>
                    <Link className="rounded-2xl border border-border-color bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-brand-red transition" to="/livestream">
                        Quay lại livestream
                    </Link>
                </div>

                <Alert
                    className="mb-4 text-left rounded-xl border-blue-100 bg-blue-50/50"
                    showIcon
                    type="info"
                    message="AI Bot chỉ lưu các bình luận dẫn đến án phạt, bình luận cảnh báo chưa đủ 3 lần sẽ không tạo án phạt."
                />

                <Spin spinning={loading}>
                    {!items.length ? (
                        <div className="rounded-3xl border border-border-color bg-white p-10 shadow-sm">
                            <Empty description="Bạn chưa có án phạt live chat" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item._id} className="rounded-3xl border border-border-color bg-white p-5 shadow-sm">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 text-left">
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{violationText[item.violationType] || item.violationType}</div>
                                            <div className="text-sm text-slate-500">Tạo lúc {formatDateTime(item.createdAt)}</div>
                                        </div>
                                        <Tag color={statusColor[item.status]}>{item.status}</Tag>
                                    </div>

                                    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 text-left">
                                        Thời hạn khóa: <b>{item.banDays} ngày</b>, đến <b>{formatDateTime(item.bannedUntil)}</b>
                                    </div>

                                    <Table
                                        rowKey={(_, index) => `${item._id}-${index}`}
                                        size="small"
                                        pagination={false}
                                        columns={buildCommentColumns()}
                                        dataSource={item.comments || []}
                                        className="text-left overflow-hidden rounded-xl border border-border-color"
                                    />

                                    {item.status === 'ACTIVE' ? (
                                        <div className="text-left">
                                            <button
                                                type="button"
                                                onClick={() => openRequestModal(item)}
                                                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-red/20 transition hover:bg-brand-red-hover hover:-translate-y-0.5"
                                            >
                                                Gửi yêu cầu gỡ ban
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Spin>
            </main>
            <Footer />
        </div>
    );
};

export default MyLiveChatBansPage;
