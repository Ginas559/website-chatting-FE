import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Spin, Table, Tag, message } from 'antd';
import { Link } from 'react-router-dom';
import { liveChatModerationApi } from '../api/liveChatModerationApi';

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
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Án phạt live chat</h1>
                        <p className="mt-2 text-slate-600">Xem bình luận dẫn đến khóa chat và gửi yêu cầu gỡ ban nếu cần.</p>
                    </div>
                    <Link className="rounded-full border border-slate-200 bg-white px-5 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-100" to="/livestream">
                        Quay lại livestream
                    </Link>
                </div>

                <Alert
                    className="mb-4"
                    showIcon
                    type="info"
                    message="AI Bot chỉ lưu các bình luận dẫn đến án phạt, bình luận cảnh báo chưa đủ 3 lần sẽ không tạo án phạt."
                />

                <Spin spinning={loading}>
                    {!items.length ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
                            <Empty description="Bạn chưa có án phạt live chat" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{violationText[item.violationType] || item.violationType}</div>
                                            <div className="text-sm text-slate-500">Tạo lúc {formatDateTime(item.createdAt)}</div>
                                        </div>
                                        <Tag color={statusColor[item.status]}>{item.status}</Tag>
                                    </div>

                                    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                                        Thời hạn khóa: <b>{item.banDays} ngày</b>, đến <b>{formatDateTime(item.bannedUntil)}</b>
                                    </div>

                                    <Table
                                        rowKey={(_, index) => `${item._id}-${index}`}
                                        size="small"
                                        pagination={false}
                                        columns={buildCommentColumns()}
                                        dataSource={item.comments || []}
                                        className="text-left"
                                    />

                                    {item.status === 'ACTIVE' ? (
                                        <Button className="mt-4" type="primary" onClick={() => openRequestModal(item)}>
                                            Gửi yêu cầu gỡ ban
                                        </Button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Spin>
            </div>
        </div>
    );
};

export default MyLiveChatBansPage;
