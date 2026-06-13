import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    HomeOutlined,
    LoadingOutlined,
    ScanOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
    SnippetsOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { cancelMyOrderApi, getMyOrderDetailApi, getMyOrdersApi, repayVnpayOrderApi } from '../util/api';

const STATUS_LABELS = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    NEW: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị hàng',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã nhận hàng',
    CANCELLED: 'Đã hủy',
    CANCEL_REQUESTED: 'Yêu cầu hủy',
};

const STATUS_STYLES = {
    PENDING_PAYMENT: 'bg-amber-50 text-amber-700',
    NEW: 'bg-sky-50 text-sky-700',
    CONFIRMED: 'bg-indigo-50 text-indigo-700',
    PREPARING: 'bg-orange-50 text-orange-700',
    SHIPPING: 'bg-blue-50 text-blue-700',
    DELIVERED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
    CANCEL_REQUESTED: 'bg-rose-50 text-rose-700',
};

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
    { value: 'NEW', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'PREPARING', label: 'Đang chuẩn bị hàng' },
    { value: 'SHIPPING', label: 'Đang giao hàng' },
    { value: 'DELIVERED', label: 'Đã nhận hàng' },
    { value: 'CANCEL_REQUESTED', label: 'Yêu cầu hủy' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const SIDE_NAV = [
    { label: 'Trang chủ', icon: HomeOutlined, to: '/' },
    { label: 'Lịch sử mua hàng', icon: SnippetsOutlined, to: '/orders', active: true },
    { label: 'Thông tin tài khoản', icon: UserOutlined, to: '/user/profile' },
    { label: 'Tìm kiếm sản phẩm', icon: SearchOutlined, to: '/search' },
    { label: 'Giỏ hàng', icon: ShoppingCartOutlined, to: '/cart' },
];

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const formatDateTime = (value) => {
    if (!value) return 'N/A';

    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getErrorMessage = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.errMessage || error.message || error.error || fallback;
};

const isVnpayPaymentSyncing = (order) => {
    return (
        order?.paymentMethod === 'VNPAY'
        && order?.status === 'PENDING_PAYMENT'
        && order?.paymentStatus === 'UNPAID'
        && order?.paymentInfo?.returnVerifiedSuccess
    );
};

const canRepayVnpayOrder = (order) => {
    return (
        order?.paymentMethod === 'VNPAY'
        && order?.status === 'PENDING_PAYMENT'
        && order?.paymentStatus === 'UNPAID'
        && !order?.paymentInfo?.returnVerifiedSuccess
    );
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status || 'N/A';

const getOrderStatusLabel = (order) => {
    if (isVnpayPaymentSyncing(order)) {
        return 'Đang đồng bộ thanh toán';
    }

    return getStatusLabel(order?.status);
};

const getPaymentStatusLabel = (order) => {
    if (isVnpayPaymentSyncing(order)) {
        return 'Đang chờ hệ thống xác nhận';
    }

    const labels = {
        UNPAID: 'Chưa thanh toán',
        PAID: 'Đã thanh toán',
        FAILED: 'Thanh toán thất bại',
        REFUND_REQUIRED: 'Cần hoàn tiền',
        REFUNDED: 'Đã hoàn tiền',
    };

    return labels[order?.paymentStatus] || order?.paymentStatus || 'N/A';
};

const getTimelineStatusLabel = (status, order) => {
    if (status === 'PENDING_PAYMENT') {
        if (isVnpayPaymentSyncing(order)) {
            return 'Đang đồng bộ thanh toán';
        }

        if (order?.paymentMethod === 'VNPAY') {
            if (order?.paymentStatus === 'FAILED') {
                return 'Thanh toán không thành công';
            }

            if (order?.paymentStatus === 'REFUND_REQUIRED') {
                return 'Cần xử lý hoàn tiền';
            }

            if (order?.paymentStatus === 'REFUNDED') {
                return 'Đã hoàn tiền';
            }

            return 'Thanh toán thành công';
        }

        return 'Đặt hàng thành công';
    }

    if (status === 'NEW' && order?.paymentMethod === 'COD') {
        return 'Đặt hàng thành công';
    }

    return getStatusLabel(status);
};

const SHOP_UPDATE_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED'];

const SHOP_UPDATE_FALLBACK_NOTES = {
    CONFIRMED: 'Shop đã xác nhận đơn hàng của bạn',
    PREPARING: 'Shop đang chuẩn bị hàng cho đơn hàng của bạn',
    SHIPPING: 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển',
    DELIVERED: 'Đơn hàng đã được giao thành công',
};

const shouldShowTimelineNote = (note) => {
    const normalizedNote = String(note || '').trim();

    if (!normalizedNote) return false;

    return ![
        'Admin cập nhật trạng thái đơn hàng',
        'Đơn hàng COD mới được tạo',
    ].includes(normalizedNote);
};

const getShopUpdateNote = (entry) => {
    const normalizedNote = String(entry?.note || '').trim();

    if (shouldShowTimelineNote(normalizedNote)) {
        return normalizedNote;
    }

    return SHOP_UPDATE_FALLBACK_NOTES[entry?.status] || 'Shop cập nhật trạng thái đơn hàng';
};

const getLatestStatusEntry = (order, status) => {
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

    return [...history].reverse().find((entry) => entry?.status === status) || null;
};

const getCancelRequestRejectionEntry = (order) => {
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
    const lastCancelRequestIndex = history.map((entry) => entry?.status).lastIndexOf('CANCEL_REQUESTED');

    if (lastCancelRequestIndex < 0) {
        return null;
    }

    return history.slice(lastCancelRequestIndex + 1).find((entry) => entry?.status === 'PREPARING') || null;
};

const hasRejectedCancelRequest = (order) => Boolean(getCancelRequestRejectionEntry(order));

const canShowCancelButton = (order) => {
    if (order?.status === 'NEW') return true;
    if (order?.status === 'PREPARING') return !hasRejectedCancelRequest(order);
    return false;
};

const getFirstItem = (order) => Array.isArray(order?.items) && order.items.length ? order.items[0] : null;

const canReviewOrder = (order) => order?.status === 'DELIVERED';

const ORDER_TIMELINE = ['NEW', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED'];

const isCancelStatus = (status) => ['CANCELLED', 'CANCEL_REQUESTED'].includes(status);

const getTimelinePointTone = ({ entry, isCurrent }) => {
    if (entry.status === 'CANCELLED') {
        return {
            pointClass: 'border-red-100 bg-red-600 text-white shadow-red-200',
            labelClass: 'font-semibold text-red-600',
            marker: '×',
        };
    }

    if (entry.status === 'CANCEL_REQUESTED') {
        return {
            pointClass: 'border-amber-100 bg-amber-500 text-white shadow-amber-200',
            labelClass: 'font-semibold text-amber-700',
            marker: '!',
        };
    }

    if (!entry.reached) {
        return {
            pointClass: 'border-slate-200 bg-white text-slate-300',
            labelClass: 'font-medium text-slate-400',
            marker: null,
        };
    }

    if (entry.status === 'DELIVERED') {
        return {
            pointClass: 'border-emerald-100 bg-emerald-600 text-white shadow-emerald-200',
            labelClass: 'font-semibold text-emerald-700',
            marker: '✓',
        };
    }

    if (isCurrent) {
        return {
            pointClass: 'border-blue-100 bg-blue-600 text-white shadow-blue-200',
            labelClass: 'font-semibold text-slate-950',
            marker: '✓',
        };
    }

    return {
        pointClass: 'border-emerald-100 bg-emerald-500 text-white shadow-emerald-200',
        labelClass: 'font-medium text-slate-700',
        marker: '✓',
    };
};

const getTimelineEntries = (order) => {
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

    const historyMap = history.reduce((acc, item) => {
        if (item?.status && !acc[item.status]) {
            acc[item.status] = item;
        }
        return acc;
    }, {});

    const shouldShowPaymentStep = order?.paymentMethod === 'VNPAY' || Boolean(historyMap.PENDING_PAYMENT);
    const normalSteps = shouldShowPaymentStep ? ['PENDING_PAYMENT', ...ORDER_TIMELINE] : ORDER_TIMELINE;

    const steps = normalSteps.map((status) => {
        const historyItem = historyMap[status];
        return {
            status,
            changedAt: historyItem?.changedAt || null,
            note: historyItem?.note || '',
            reached: Boolean(historyItem) || status === order?.status,
        };
    });

    if (['CANCELLED', 'CANCEL_REQUESTED'].includes(order?.status) || historyMap.CANCELLED) {
        const cancelStatus = historyMap.CANCELLED ? 'CANCELLED' : 'CANCEL_REQUESTED';
        steps.push({
            status: cancelStatus,
            changedAt: historyMap[cancelStatus]?.changedAt || order?.updatedAt || null,
            note: historyMap[cancelStatus]?.note || '',
            reached: true,
        });
    }

    return steps;
};

const getShopUpdateEntries = (order) => {
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];

    return history
        .filter((entry) => SHOP_UPDATE_STATUSES.includes(entry?.status))
        .map((entry) => ({
            ...entry,
            note: getShopUpdateNote(entry),
        }));
};

const OrdersPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [summary, setSummary] = useState({ totalPurchasedOrders: 0, totalPurchasedAmount: 0 });
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [mutating, setMutating] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [viewMode, setViewMode] = useState('history');
    const [feedback, setFeedback] = useState('');
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const statusTabsRef = useRef(null);

    const currentPage = pagination.page || 1;
    const totalPages = Math.max(1, pagination.totalPages || 1);
    const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Member';
    const memberPhone = user?.phoneNumber || user?.phone || 'Chưa cập nhật';

    const queryParams = useMemo(() => ({
        page: currentPage,
        limit: 10,
        ...(status ? { status } : {}),
    }), [currentPage, status]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        let isMounted = true;

        const fetchOrders = async () => {
            setLoading(true);
            setFeedback('');

            try {
                const response = await getMyOrdersApi(queryParams);
                if (!isMounted) return;

                if (response?.errCode !== 0 || !response?.data) {
                    throw response;
                }

                setOrders(Array.isArray(response.data.items) ? response.data.items : []);
                setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
                setSummary(response.data.summary || { totalPurchasedOrders: 0, totalPurchasedAmount: 0 });
            } catch (error) {
                if (!isMounted) return;
                setFeedback(getErrorMessage(error, 'Không thể tải lịch sử đơn hàng.'));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchOrders();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, navigate, queryParams]);

    const refreshOrders = async (params = queryParams) => {
        setLoading(true);
        setFeedback('');

        try {
            const response = await getMyOrdersApi(params);
            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            setOrders(Array.isArray(response.data.items) ? response.data.items : []);
            setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
            setSummary(response.data.summary || { totalPurchasedOrders: 0, totalPurchasedAmount: 0 });
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể tải lịch sử đơn hàng.'));
        } finally {
            setLoading(false);
        }
    };

    const changeStatus = (nextStatus) => {
        setStatus(nextStatus);
        setPagination((current) => ({ ...current, page: 1 }));
        setSelectedOrder(null);
        setViewMode('history');
    };

    const changePage = (nextPage) => {
        setPagination((current) => ({ ...current, page: Math.min(Math.max(1, nextPage), totalPages) }));
        setSelectedOrder(null);
        setViewMode('history');
    };

    const scrollStatusTabs = (direction) => {
        const el = statusTabsRef.current;
        if (!el) return;

        el.scrollBy({
            left: direction * Math.max(220, el.clientWidth * 0.55),
            behavior: 'smooth',
        });
    };

    const openDetail = async (orderIdOrCode) => {
        setDetailLoading(true);
        setFeedback('');

        try {
            const response = await getMyOrderDetailApi(orderIdOrCode);
            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            setSelectedOrder(response.data);
            setViewMode('detail');
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể tải chi tiết đơn hàng.'));
        } finally {
            setDetailLoading(false);
        }
    };

    const backToHistory = () => {
        setViewMode('history');
        setSelectedOrder(null);
    };

    const openCancelModal = (order) => {
        setCancelTarget(order);
        setCancelReason('');
        setFeedback('');
    };

    const closeCancelModal = () => {
        if (mutating) return;
        setCancelTarget(null);
        setCancelReason('');
    };

    const confirmCancelOrder = async () => {
        if (!cancelTarget) return;
        setMutating(true);
        setFeedback('');

        try {
            const response = await cancelMyOrderApi(cancelTarget.orderCode || cancelTarget.id, cancelReason);
            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            setSelectedOrder(response.data);
            await refreshOrders(queryParams);
            setFeedback(response.errMessage || 'Cập nhật yêu cầu hủy đơn thành công.');
            setCancelTarget(null);
            setCancelReason('');
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể hủy đơn hàng.'));
        } finally {
            setMutating(false);
        }
    };

    const repayVnpayOrder = async (order) => {
        if (!order || mutating) return;

        setMutating(true);
        setFeedback('');

        try {
            const response = await repayVnpayOrderApi(order.orderCode || order.id);

            if (response?.errCode !== 0 || !response?.data?.paymentUrl) {
                throw response;
            }

            window.location.assign(response.data.paymentUrl);
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể tạo lại link thanh toán VNPay.'));
        } finally {
            setMutating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-xl font-black text-white shadow-lg shadow-orange-300/40">S</span>
                        <div className="text-left">
                            <div className="text-lg font-black text-slate-900">SmartZone Store</div>
                            <div className="text-xs uppercase tracking-[0.2em] text-orange-600">Tech Lifestyle</div>
                        </div>
                    </Link>

                        <Link to="/search" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Trang tìm kiếm
                        </Link>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Link to="/delivery/verify" className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                            <ScanOutlined className="text-base" />
                            Quét QR kiện hàng
                        </Link>
                        <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
                <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center">
                        <div className="flex items-center gap-4">
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-2xl font-bold text-red-600">
                                {memberName.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-lg font-medium">{memberName}</div>
                                <div className="mt-1 text-sm text-slate-500">{memberPhone}</div>
                                <div className="mt-2 inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600">S-Member</div>
                            </div>
                        </div>
                        <div className="border-l-0 border-red-500 pl-0 lg:border-l-2 lg:pl-6">
                            <div className="text-3xl font-medium">{summary.totalPurchasedOrders || 0}</div>
                            <div className="mt-1 text-sm text-slate-500">Tổng đơn đã mua thành công</div>
                        </div>
                        <div className="border-l-0 border-red-500 pl-0 lg:border-l-2 lg:pl-6">
                            <div className="text-3xl font-medium">{formatVnd(summary.totalPurchasedAmount)}</div>
                            <div className="mt-1 text-sm text-slate-500">Tổng tiền đã mua</div>
                        </div>
                    </div>
                </section>

                {feedback ? (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {feedback}
                    </div>
                ) : null}

                <div className="mt-3 grid gap-3 lg:grid-cols-[340px_1fr]">
                    <aside className="h-fit overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                        {SIDE_NAV.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.to}
                                    className={`flex items-center gap-3 border-l-4 px-6 py-4 text-base font-medium ${
                                        item.active
                                            ? 'border-red-600 bg-red-50 text-red-600'
                                            : 'border-transparent text-slate-800'
                                    }`}
                                >
                                    <Icon className="text-xl" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </aside>

                    <section className="min-w-0 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                        {viewMode === 'history' ? (
                            <>
                                <div className="relative border-b border-slate-300 pb-2">
                                    <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-10 w-12 items-center justify-start bg-gradient-to-r from-white via-white/95 to-transparent">
                                        <button
                                            type="button"
                                            onClick={() => scrollStatusTabs(-1)}
                                            className="pointer-events-auto ml-1 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-xl leading-none text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Lướt trạng thái sang trái"
                                        >
                                            ‹
                                        </button>
                                    </div>
                                    <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-10 w-12 items-center justify-end bg-gradient-to-l from-white via-white/95 to-transparent">
                                        <button
                                            type="button"
                                            onClick={() => scrollStatusTabs(1)}
                                            className="pointer-events-auto mr-1 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-xl leading-none text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Lướt trạng thái sang phải"
                                        >
                                            ›
                                        </button>
                                    </div>
                                    <div ref={statusTabsRef} className="flex gap-2 overflow-x-auto px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        {STATUS_OPTIONS.map((option) => (
                                            <button
                                                key={option.value || 'all'}
                                                type="button"
                                                onClick={() => changeStatus(option.value)}
                                                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                    status === option.value
                                                        ? 'border-red-200 bg-red-50 text-red-600 shadow-sm'
                                                        : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3 space-y-3">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Lịch sử mua hàng</h1>
                                    </div>

                                {loading ? (
                                    <div className="rounded-xl border border-slate-300 p-10 text-center text-sm font-medium text-slate-500">
                                        <LoadingOutlined className="mr-2" /> Đang tải đơn hàng...
                                    </div>
                                ) : orders.length ? orders.map((order) => {
                                    const firstItem = getFirstItem(order);
                                    const otherCount = Math.max(0, Number(order.items?.length || 0) - 1);
                                    return (
                                        <article key={order.id || order.orderCode} className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_1px_5px_rgba(15,23,42,0.06)]">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                                <span className="text-slate-500">Đơn hàng:</span>
                                                <span className="font-medium">#{order.orderCode}</span>
                                                <span className="hidden text-slate-300 sm:inline">•</span>
                                                <span className="text-slate-500">Ngày đặt hàng:</span>
                                                <span className="font-medium">{formatDateTime(order.createdAt)}</span>
                                                <span className={`ml-auto rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {getOrderStatusLabel(order)}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <img src={firstItem?.snapshot?.image} alt={firstItem?.snapshot?.name || 'Sản phẩm'} className="h-16 w-16 shrink-0 rounded-lg object-contain" />
                                                    <div className="min-w-0 text-left">
                                                        <div className="truncate text-sm font-medium uppercase">{firstItem?.snapshot?.name || 'Đơn hàng'}</div>
                                                        <div className="mt-1 text-sm font-medium">{formatVnd(firstItem?.lineTotal || order.totalAmount)}</div>
                                                        {otherCount ? <div className="mt-1 text-xs text-slate-500">Cùng {otherCount} sản phẩm khác</div> : null}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-left sm:text-right">
                                                    <div className="text-sm text-slate-500">Tổng thanh toán</div>
                                                    <div className="text-base font-medium text-red-600">{formatVnd(order.totalAmount)}</div>
                                                    <div className="mt-2 flex flex-wrap justify-start gap-2 sm:justify-end">
                                                        {canReviewOrder(order) && firstItem?.snapshot?.slug ? (
                                                            <Link
                                                                to={`/product/${firstItem.snapshot.slug}#reviews`}
                                                                className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                                                            >
                                                                Đánh giá
                                                            </Link>
                                                        ) : null}
                                                        {canRepayVnpayOrder(order) ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => repayVnpayOrder(order)}
                                                                disabled={mutating}
                                                                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Thanh toán lại
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetail(order.orderCode || order.id)}
                                                            className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                                        >
                                                            Xem chi tiết
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {canShowCancelButton(order) ? (
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCancelModal(order)}
                                                        disabled={mutating}
                                                        className="rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {order.status === 'PREPARING' ? 'Gửi yêu cầu hủy' : 'Hủy đơn'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </article>
                                    );
                                }) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                                        <div className="text-xl font-medium">Chưa có đơn hàng</div>
                                        <p className="mt-2 text-sm text-slate-500">Khi bạn đặt hàng, lịch sử mua hàng sẽ xuất hiện tại đây.</p>
                                        <Link to="/search" className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">
                                            Mua sắm ngay
                                        </Link>
                                    </div>
                                )}

                                {orders.length ? (
                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => changePage(currentPage - 1)}
                                            disabled={currentPage <= 1 || loading}
                                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Trước
                                        </button>
                                        <span className="text-sm font-medium text-slate-600">Trang {currentPage}/{totalPages}</span>
                                        <button
                                            type="button"
                                            onClick={() => changePage(currentPage + 1)}
                                            disabled={currentPage >= totalPages || loading}
                                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                ) : null}
                                </div>
                            </>
                        ) : (
                            <div>
                                <div className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={backToHistory}
                                        className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <span className="text-lg leading-none">←</span>
                                        Lịch sử mua hàng
                                    </button>
                                    <div className="text-left text-lg font-semibold text-slate-950 sm:flex-1 sm:text-center">
                                        Chi tiết đơn hàng
                                    </div>
                                    <div className="hidden w-[150px] sm:block" />
                                </div>

                                {detailLoading || !selectedOrder ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-medium text-slate-500">
                                        <LoadingOutlined className="mr-2" /> Đang tải chi tiết...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-300 bg-white p-4">
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span>Tổng quan</span>
                                                <span className="ml-0 text-slate-500 sm:ml-2">Đơn hàng:</span>
                                                <span className="font-medium">#{selectedOrder.orderCode}</span>
                                                <span className="hidden text-slate-300 sm:inline">•</span>
                                                <span className="text-slate-500">Ngày đặt hàng:</span>
                                                <span className="font-medium">{formatDateTime(selectedOrder.createdAt)}</span>
                                                <span className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[selectedOrder.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {getOrderStatusLabel(selectedOrder)}
                                                </span>
                                            </div>
                                            {selectedOrder.status === 'CANCEL_REQUESTED' ? (
                                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                                                    <div className="text-sm font-semibold text-amber-900">Yêu cầu hủy đang chờ shop xử lý</div>
                                                    <p className="mt-1 text-sm leading-6 text-amber-800">
                                                        Lý do của bạn: {getLatestStatusEntry(selectedOrder, 'CANCEL_REQUESTED')?.note || 'Không nhập lý do'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {selectedOrder.status === 'CANCELLED' ? (
                                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                                                    <div className="text-sm font-semibold text-slate-900">Đơn hàng đã hủy</div>
                                                    <p className="mt-1 text-sm leading-6 text-slate-700">
                                                        Lý do hủy: {getLatestStatusEntry(selectedOrder, 'CANCELLED')?.note || 'Không rõ lý do'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {!['CANCELLED', 'CANCEL_REQUESTED'].includes(selectedOrder.status) && hasRejectedCancelRequest(selectedOrder) ? (
                                                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left">
                                                    <div className="text-sm font-semibold text-rose-900">Shop đã từ chối yêu cầu hủy đơn</div>
                                                    <p className="mt-1 text-sm leading-6 text-rose-800">
                                                        Phản hồi từ shop: {getCancelRequestRejectionEntry(selectedOrder)?.note || 'Đơn hàng tiếp tục được chuẩn bị.'}
                                                    </p>
                                                    <p className="mt-1 text-xs font-medium text-rose-700">
                                                        Đơn hàng vẫn tiếp tục được xử lý theo tiến trình hiện tại.
                                                    </p>
                                                </div>
                                            ) : null}
                                            <div className="mt-5 space-y-4">
                                                {(selectedOrder.items || []).map((item) => (
                                                <div key={`${selectedOrder.orderCode}-${item.product}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-16 w-16 shrink-0 rounded-lg object-contain" />
                                                            <div className="min-w-0 text-left">
                                                                <div className="truncate text-sm font-medium uppercase">{item.snapshot?.name}</div>
                                                                <div className="mt-1 text-sm font-medium">{formatVnd(item.lineTotal)}</div>
                                                            </div>
                                                        </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-sm font-medium">Số lượng: {item.quantity}</div>
                                                        {selectedOrder.status === 'DELIVERED' && item.snapshot?.slug ? (
                                                            <Link
                                                                to={`/product/${item.snapshot.slug}#reviews`}
                                                                className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                                                            >
                                                                Đánh giá
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {canRepayVnpayOrder(selectedOrder) ? (
                                                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <div className="text-sm font-semibold text-amber-900">Đơn hàng đang chờ thanh toán VNPay</div>
                                                            <p className="mt-1 text-sm text-amber-800">Bạn có thể tạo lại link thanh toán cho đơn này mà không cần đặt đơn mới.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => repayVnpayOrder(selectedOrder)}
                                                            disabled={mutating}
                                                            className="inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {mutating ? 'Đang tạo link...' : 'Thanh toán lại'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-xl border border-slate-300 bg-white px-4 py-6">
                                            <div className="relative">
                                                <div className="absolute left-[10%] right-[10%] top-4 hidden h-1 rounded-full bg-slate-200 sm:block" />
                                                <div
                                                    className={`absolute left-[10%] top-4 hidden h-1 rounded-full transition-all duration-500 sm:block ${
                                                        isCancelStatus(selectedOrder.status)
                                                            ? 'bg-gradient-to-r from-emerald-500 to-red-500'
                                                            : selectedOrder.status === 'DELIVERED'
                                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                                                : 'bg-gradient-to-r from-emerald-500 to-blue-600'
                                                    }`}
                                                    style={{
                                                        width: `${Math.max(0, ((getTimelineEntries(selectedOrder).filter((entry) => entry.reached).length - 1) / Math.max(1, getTimelineEntries(selectedOrder).length - 1)) * 80)}%`,
                                                    }}
                                                />
                                                <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
                                                    {getTimelineEntries(selectedOrder).map((entry, index, entries) => {
                                                        const reachedCount = entries.filter((item) => item.reached).length;
                                                        const isCurrent = entry.reached && index === reachedCount - 1;
                                                        const tone = getTimelinePointTone({ entry, isCurrent });
                                                        return (
                                                            <div key={`${entry.status}-${entry.changedAt}-${index}`} className="relative text-center">
                                                                <div className={`relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-full border-4 text-sm shadow-sm transition ${tone.pointClass}`}>
                                                                    {tone.marker || index + 1}
                                                                </div>
                                                                <div className={`mt-2 text-sm ${tone.labelClass}`}>
                                                                    {getTimelineStatusLabel(entry.status, selectedOrder)}
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-500">{entry.changedAt ? formatDateTime(entry.changedAt) : 'Chưa cập nhật'}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {getShopUpdateEntries(selectedOrder).length ? (
                                                <div className="mt-6 border-t border-slate-200 pt-5">
                                                    <div className="mb-3 text-left text-sm font-semibold text-slate-900">Cập nhật từ shop</div>
                                                    <div className="space-y-3">
                                                        {getShopUpdateEntries(selectedOrder).map((entry, index) => (
                                                            <div key={`${entry.status}-${entry.changedAt}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:grid-cols-[150px_1fr]">
                                                                <div className="sm:border-r sm:border-slate-200 sm:pr-4">
                                                                    <div className="text-sm font-semibold text-slate-900">{getTimelineStatusLabel(entry.status, selectedOrder)}</div>
                                                                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(entry.changedAt)}</div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold uppercase text-slate-500">Ghi chú</div>
                                                                    <div className="mt-1 break-words text-sm leading-6 text-slate-700">{entry.note}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="grid gap-3 lg:grid-cols-2">
                                            <div className="rounded-xl border border-slate-300 bg-white p-4">
                                                <div className="text-base font-medium">Thông tin khách hàng</div>
                                                <div className="mt-4 divide-y divide-slate-200 text-sm">
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-500">Họ và tên</span><b>{selectedOrder.shippingInfo?.fullName}</b></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-500">Số điện thoại</span><b>{selectedOrder.shippingInfo?.phone}</b></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-500">Địa chỉ</span><b className="text-right">{selectedOrder.shippingInfo?.address}</b></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-500">Ghi chú</span><b>{selectedOrder.shippingInfo?.note || '-'}</b></div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-300 bg-white p-4">
                                                <div className="text-base font-medium">Thông tin thanh toán</div>
                                                <div className="mt-4 divide-y divide-slate-200 text-sm">
                                                    <div className="flex justify-between py-3"><span className="text-slate-500">Số lượng sản phẩm</span><b>{selectedOrder.items?.length || 0}</b></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-500">Phương thức</span><b>{selectedOrder.paymentMethod}</b></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-500">Trạng thái</span><b>{getPaymentStatusLabel(selectedOrder)}</b></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-500">Tổng số tiền</span><b className="text-red-600">{formatVnd(selectedOrder.totalAmount)}</b></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {cancelTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
                        <div className="text-center">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-xl font-semibold text-red-600">!</div>
                            <h2 className="mt-4 text-xl font-semibold text-slate-950">
                                {cancelTarget.status === 'PREPARING' ? 'Gửi yêu cầu hủy đơn?' : 'Xác nhận hủy đơn?'}
                            </h2>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Đơn hàng <span className="font-medium text-slate-900">#{cancelTarget.orderCode}</span> sẽ được cập nhật theo đúng trạng thái hiện tại.
                            </p>
                        </div>

                        <label className="mt-5 block text-left">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Lý do hủy (không bắt buộc)</span>
                            <textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                                placeholder="Ví dụ: muốn đổi sản phẩm, nhập sai địa chỉ..."
                            />
                        </label>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={closeCancelModal}
                                disabled={mutating}
                                className="h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Giữ đơn hàng
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancelOrder}
                                disabled={mutating}
                                className="h-12 rounded-xl bg-red-600 px-4 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {mutating ? 'Đang xử lý...' : cancelTarget.status === 'PREPARING' ? 'Gửi yêu cầu hủy' : 'Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default OrdersPage;
