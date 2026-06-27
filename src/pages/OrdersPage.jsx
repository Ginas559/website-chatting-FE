import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    HomeOutlined,
    LoadingOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
    SnippetsOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { cancelMyOrderApi, getMyOrderDetailApi, getMyOrdersApi, repayVnpayOrderApi } from '../util/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const STATUS_LABELS = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    NEW: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    PREPARING: 'Đang chuẩn bị hàng',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã nhận hàng',
    DELIVERY_FAILED: 'Giao thất bại',
    CANCELLED: 'Đã hủy',
    CANCEL_REQUESTED: 'Yêu cầu hủy',
};

const STATUS_STYLES = {
    PENDING_PAYMENT: 'bg-amber-50 text-amber-700',
    NEW: 'bg-sky-50 text-sky-700',
    CONFIRMED: 'bg-indigo-50 text-indigo-700',
    PREPARING: 'bg-brand-red/5 text-brand-red border border-brand-red/10',
    SHIPPING: 'bg-blue-50 text-blue-700',
    DELIVERED: 'bg-emerald-50 text-emerald-700',
    DELIVERY_FAILED: 'bg-red-50 text-red-700',
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
    { value: 'DELIVERY_FAILED', label: 'Giao thất bại' },
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

const SHOP_UPDATE_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED', 'DELIVERY_FAILED'];

const SHOP_UPDATE_FALLBACK_NOTES = {
    CONFIRMED: 'Shop đã xác nhận đơn hàng của bạn',
    PREPARING: 'Shop đang chuẩn bị hàng cho đơn hàng của bạn',
    SHIPPING: 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển',
    DELIVERED: 'Đơn hàng đã được giao thành công',
    DELIVERY_FAILED: 'Đơn hàng giao thất bại',
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

const isCancelStatus = (status) => ['CANCELLED', 'CANCEL_REQUESTED', 'DELIVERY_FAILED'].includes(status);

const getTimelinePointTone = ({ entry, isCurrent }) => {
    if (entry.status === 'CANCELLED') {
        return {
            pointClass: 'border-red-100 bg-brand-red text-white shadow-brand-red/20',
            labelClass: 'font-semibold text-brand-red',
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

    if (entry.status === 'DELIVERY_FAILED') {
        return {
            pointClass: 'border-red-100 bg-brand-red text-white shadow-brand-red/20',
            labelClass: 'font-semibold text-brand-red',
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

    if (order?.status === 'DELIVERY_FAILED' || historyMap.DELIVERY_FAILED) {
        steps.push({
            status: 'DELIVERY_FAILED',
            changedAt: historyMap.DELIVERY_FAILED?.changedAt || order?.updatedAt || null,
            note: historyMap.DELIVERY_FAILED?.note || '',
            reached: true,
        });
    }

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
        <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 space-y-6">
                {/* Premium S-Member Overview */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center">
                        <div className="flex items-center gap-4">
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-red/5 border border-brand-red/15 text-2xl font-black text-brand-red shadow-inner">
                                {memberName.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div className="min-w-0 text-left">
                                <div className="truncate text-lg font-black text-slate-900 font-sans">{memberName}</div>
                                <div className="mt-0.5 text-xs font-semibold text-slate-400">{memberPhone}</div>
                                <div className="mt-2.5 inline-flex rounded-full bg-brand-red/5 border border-brand-red/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-brand-red">
                                    S-Member
                                </div>
                            </div>
                        </div>
                        <div className="border-l-0 border-slate-100 pl-0 lg:border-l lg:pl-6 text-left">
                            <div className="text-3xl font-black text-slate-900 leading-none">{summary.totalPurchasedOrders || 0}</div>
                            <div className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">Đơn hàng thành công</div>
                        </div>
                        <div className="border-l-0 border-slate-100 pl-0 lg:border-l lg:pl-6 text-left">
                            <div className="text-3xl font-black text-brand-red leading-none">{formatVnd(summary.totalPurchasedAmount)}</div>
                            <div className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Tổng chi tiêu tích lũy</div>
                        </div>
                    </div>
                </section>

                {feedback ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800 text-left">
                        ⚠️ {feedback}
                    </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* Left Nav Menu */}
                    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm space-y-1">
                        {SIDE_NAV.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.to}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
                                        item.active
                                            ? 'bg-brand-red/5 text-brand-red'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className="text-lg shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </aside>

                    {/* Right Panel content */}
                    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        {viewMode === 'history' ? (
                            <div className="space-y-6">
                                {/* Horizontal Scrolling Status Tabs */}
                                <div className="relative border-b border-slate-100 pb-3">
                                    <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-start bg-gradient-to-r from-white via-white/80 to-transparent">
                                        <button
                                            type="button"
                                            onClick={() => scrollStatusTabs(-1)}
                                            className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-base leading-none text-slate-400 shadow-sm transition hover:border-brand-red/35 hover:bg-brand-red/5 hover:text-brand-red"
                                            aria-label="Lướt trạng thái sang trái"
                                        >
                                            ‹
                                        </button>
                                    </div>
                                    <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-end bg-gradient-to-l from-white via-white/80 to-transparent">
                                        <button
                                            type="button"
                                            onClick={() => scrollStatusTabs(1)}
                                            className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-base leading-none text-slate-400 shadow-sm transition hover:border-brand-red/35 hover:bg-brand-red/5 hover:text-brand-red"
                                            aria-label="Lướt trạng thái sang phải"
                                        >
                                            ›
                                        </button>
                                    </div>
                                    <div ref={statusTabsRef} className="flex gap-2 overflow-x-auto px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        {STATUS_OPTIONS.map((option) => {
                                            const isActive = status === option.value;
                                            return (
                                                <button
                                                    key={option.value || 'all'}
                                                    type="button"
                                                    onClick={() => changeStatus(option.value)}
                                                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                                                        isActive
                                                            ? 'border-brand-red bg-brand-red/5 text-brand-red shadow-sm'
                                                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 font-sans">Lịch sử đơn hàng</h1>
                                    </div>

                                    {loading ? (
                                        <div className="rounded-3xl border border-dashed border-slate-200 p-16 text-center text-sm font-semibold text-slate-400 bg-slate-50/50">
                                            <LoadingOutlined className="mr-2 text-brand-red" /> Đang đồng bộ danh sách đơn hàng...
                                        </div>
                                    ) : orders.length ? (
                                        <div className="space-y-4">
                                            {orders.map((order) => {
                                                const firstItem = getFirstItem(order);
                                                const otherCount = Math.max(0, Number(order.items?.length || 0) - 1);
                                                return (
                                                    <article key={order.id || order.orderCode} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs font-semibold text-slate-400">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                <span className="font-bold text-slate-700">Mã đơn: #{order.orderCode}</span>
                                                                <span>&bull;</span>
                                                                <span>Ngày đặt: {formatDateTime(order.createdAt)}</span>
                                                            </div>
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                                                {getOrderStatusLabel(order)}
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex min-w-0 items-center gap-4">
                                                                <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1 shrink-0">
                                                                    <img 
                                                                        src={firstItem?.snapshot?.image} 
                                                                        alt={firstItem?.snapshot?.name || 'Sản phẩm'} 
                                                                        className="max-h-full max-w-full object-contain" 
                                                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100x100?text=No+Img'; }}
                                                                    />
                                                                </div>
                                                                <div className="min-w-0 text-left space-y-1">
                                                                    <div className="text-sm font-bold text-slate-900 leading-snug break-words break-all">{firstItem?.snapshot?.name || 'Đơn hàng'}</div>
                                                                    {(firstItem?.snapshot?.color || firstItem?.snapshot?.capacity) && (
                                                                        <div className="flex flex-wrap gap-1 text-[9px] text-slate-400 font-extrabold uppercase">
                                                                            {firstItem.snapshot.color && <span className="rounded border border-slate-200/50 bg-slate-50 px-1.5 py-0.2">Màu: {firstItem.snapshot.color}</span>}
                                                                            {firstItem.snapshot.capacity && <span className="rounded border border-slate-200/50 bg-slate-50 px-1.5 py-0.2">GB: {firstItem.snapshot.capacity}</span>}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs font-bold text-slate-500">Giá: {formatVnd(firstItem?.lineTotal || order.totalAmount)}</div>
                                                                    {otherCount > 0 && (
                                                                        <div className="text-[11px] font-semibold text-brand-red">Cùng {otherCount} sản phẩm khác</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-left sm:text-right flex flex-col justify-between h-full space-y-3">
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng thanh toán</div>
                                                                    <div className="text-lg font-black text-brand-red leading-none mt-1">{formatVnd(order.totalAmount)}</div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                                                    {canReviewOrder(order) && firstItem?.snapshot?.slug && (
                                                                        <Link
                                                                            to={`/product/${firstItem.snapshot.slug}#reviews`}
                                                                            className="inline-flex h-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                                                        >
                                                                            Đánh giá
                                                                        </Link>
                                                                    )}
                                                                    {canRepayVnpayOrder(order) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => repayVnpayOrder(order)}
                                                                            disabled={mutating}
                                                                            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#b71423] px-4 text-xs font-bold text-white shadow-md shadow-brand-red/10 hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            Thanh toán lại
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openDetail(order.orderCode || order.id)}
                                                                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        Xem chi tiết
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {canShowCancelButton(order) && (
                                                            <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openCancelModal(order)}
                                                                    disabled={mutating}
                                                                    className="rounded-xl border border-brand-red/30 bg-white px-4 py-2 text-xs font-bold text-brand-red hover:bg-brand-red/5 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {order.status === 'PREPARING' ? 'Gửi yêu cầu hủy' : 'Hủy đơn'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </article>
                                                );
                                            })}

                                            {/* Paginated Navigation */}
                                            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => changePage(currentPage - 1)}
                                                    disabled={currentPage <= 1 || loading}
                                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Trước
                                                </button>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trang {currentPage} / {totalPages}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => changePage(currentPage + 1)}
                                                    disabled={currentPage >= totalPages || loading}
                                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-200 p-16 text-center bg-slate-50/50">
                                            <SnippetsOutlined className="text-4xl text-slate-300" />
                                            <div className="mt-4 text-sm font-bold text-slate-500">Chưa có đơn hàng nào khớp bộ lọc</div>
                                            <p className="mt-1 text-xs text-slate-400">Khi bạn mua hàng, lịch sử đặt đơn sẽ xuất hiện tại đây.</p>
                                            <Link to="/search" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-5 text-xs font-bold text-white hover:bg-brand-red-hover">
                                                Mua sắm ngay
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Detail View Mode */
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={backToHistory}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        &larr; Lịch sử đơn hàng
                                    </button>
                                    <div className="text-left text-sm font-black uppercase tracking-wider text-slate-900 font-sans sm:flex-1 sm:text-center">
                                        Chi tiết đơn hàng
                                    </div>
                                    <div className="hidden w-[120px] sm:block" />
                                </div>

                                {detailLoading || !selectedOrder ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center text-sm font-semibold text-slate-400">
                                        <LoadingOutlined className="mr-2 text-brand-red" /> Đang lấy chi tiết đơn hàng...
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Status Header Overview */}
                                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="font-bold text-slate-900 text-sm">Mã đơn: #{selectedOrder.orderCode}</span>
                                                    <span>&bull;</span>
                                                    <span>Ngày đặt: {formatDateTime(selectedOrder.createdAt)}</span>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[selectedOrder.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {getOrderStatusLabel(selectedOrder)}
                                                </span>
                                            </div>

                                            {selectedOrder.status === 'CANCEL_REQUESTED' && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                                                    <div className="text-sm font-bold text-amber-900">Yêu cầu hủy đơn hàng đang chờ phản hồi</div>
                                                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                                                        Lý do hủy đơn: {getLatestStatusEntry(selectedOrder, 'CANCEL_REQUESTED')?.note || 'Chưa cung cấp lý do.'}
                                                    </p>
                                                </div>
                                            )}

                                            {selectedOrder.status === 'CANCELLED' && (
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                                                    <div className="text-sm font-bold text-slate-900">Đơn hàng đã được hủy bỏ</div>
                                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                                        Lý do hủy đơn: {getLatestStatusEntry(selectedOrder, 'CANCELLED')?.note || 'Chưa cung cấp lý do.'}
                                                    </p>
                                                </div>
                                            )}

                                            {(!['CANCELLED', 'CANCEL_REQUESTED'].includes(selectedOrder.status)) && hasRejectedCancelRequest(selectedOrder) && (
                                                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left space-y-1">
                                                    <div className="text-sm font-bold text-rose-900">Yêu cầu hủy đơn hàng bị từ chối</div>
                                                    <p className="text-xs text-rose-700 leading-relaxed">
                                                        Lý do từ chối: {getCancelRequestRejectionEntry(selectedOrder)?.note || 'Đơn hàng đã vào khâu chuẩn bị không thể hủy.'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Products In Order */}
                                            <div className="divide-y divide-slate-100">
                                                {(selectedOrder.items || []).map((item) => (
                                                    <div key={`${selectedOrder.orderCode}-${item.product}`} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0">
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1 shrink-0">
                                                                <img 
                                                                    src={item.snapshot?.image} 
                                                                    alt={item.snapshot?.name} 
                                                                    className="max-h-full max-w-full object-contain" 
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100x100?text=No+Img'; }}
                                                                />
                                                            </div>
                                                            <div className="min-w-0 text-left space-y-1">
                                                                    <div className="text-sm font-bold text-slate-900 leading-snug break-words break-all">{item.snapshot?.name}</div>
                                                                    {(item.snapshot?.color || item.snapshot?.capacity) && (
                                                                        <div className="flex flex-wrap gap-1 text-[9px] text-slate-400 font-extrabold uppercase">
                                                                            {item.snapshot.color && <span className="rounded border border-slate-200/50 bg-slate-50 px-1.5 py-0.2">Màu: {item.snapshot.color}</span>}
                                                                            {item.snapshot.capacity && <span className="rounded border border-slate-200/50 bg-slate-50 px-1.5 py-0.2">GB: {item.snapshot.capacity}</span>}
                                                                        </div>
                                                                    )}
                                                                <div className="text-xs font-bold text-brand-red">{formatVnd(item.lineTotal)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                                                            <div className="text-xs font-bold text-slate-400 uppercase">Số lượng: {item.quantity}</div>
                                                            {selectedOrder.status === 'DELIVERED' && item.snapshot?.slug && (
                                                                <Link
                                                                    to={`/product/${item.snapshot.slug}#reviews`}
                                                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                                                >
                                                                    Đánh giá
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {canRepayVnpayOrder(selectedOrder) && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 mt-3">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-left">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-bold text-amber-900">Đơn hàng đang chờ thanh toán VNPay</div>
                                                            <p className="text-xs text-amber-700 leading-relaxed">Nhấp để liên kết trực tiếp cổng thanh toán VNPay và hoàn tất giao dịch.</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => repayVnpayOrder(selectedOrder)}
                                                            disabled={mutating}
                                                            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-red px-4 text-xs font-bold text-white shadow-md shadow-brand-red/10 hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {mutating ? 'Đang khởi tạo...' : 'Thanh toán ngay'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stepper Timeline Progress */}
                                        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
                                            <div className="relative">
                                                <div className="absolute left-[10%] right-[10%] top-4 hidden h-1 bg-slate-100 sm:block" />
                                                <div
                                                    className={`absolute left-[10%] top-4 hidden h-1 rounded-full transition-all duration-500 sm:block ${
                                                        isCancelStatus(selectedOrder.status)
                                                            ? 'bg-gradient-to-r from-emerald-500 to-brand-red'
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
                                                                <div className={`relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-full border-4 text-xs font-black shadow-sm transition ${tone.pointClass}`}>
                                                                    {tone.marker || index + 1}
                                                                </div>
                                                                <div className={`mt-2.5 text-xs font-bold ${tone.labelClass}`}>
                                                                    {getTimelineStatusLabel(entry.status, selectedOrder)}
                                                                </div>
                                                                <div className="mt-1 text-[10px] text-slate-400 font-semibold">{entry.changedAt ? formatDateTime(entry.changedAt) : 'Chưa cập nhật'}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {getShopUpdateEntries(selectedOrder).length > 0 && (
                                                <div className="mt-8 border-t border-slate-100 pt-6">
                                                    <div className="mb-4 text-left text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Cập nhật và Nhật ký từ Shop</div>
                                                    <div className="space-y-3">
                                                        {getShopUpdateEntries(selectedOrder).map((entry, index) => (
                                                            <div key={`${entry.status}-${entry.changedAt}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left sm:grid-cols-[160px_1fr]">
                                                                <div className="sm:border-r sm:border-slate-200 sm:pr-4">
                                                                    <div className="text-xs font-black uppercase tracking-wider text-slate-900 font-sans">{getTimelineStatusLabel(entry.status, selectedOrder)}</div>
                                                                    <div className="mt-1 text-[10px] font-bold text-slate-400">{formatDateTime(entry.changedAt)}</div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-[10px] font-black uppercase text-slate-400">Ghi chú phản hồi</div>
                                                                    <div className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{entry.note}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Customer and billing split view */}
                                        <div className="grid gap-6 lg:grid-cols-2 text-left">
                                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-sans border-b border-slate-100 pb-3">Thông tin nhận hàng</h3>
                                                <div className="mt-4 divide-y divide-slate-100 text-xs font-semibold text-slate-500">
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-400">Họ và tên</span><span className="font-bold text-slate-800">{selectedOrder.shippingInfo?.fullName}</span></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-400">Số điện thoại</span><span className="font-bold text-slate-800">{selectedOrder.shippingInfo?.phone}</span></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-400">Địa chỉ cụ thể</span><span className="font-bold text-slate-800 text-right break-words break-all">{selectedOrder.shippingInfo?.address}</span></div>
                                                    <div className="flex justify-between gap-3 py-3"><span className="text-slate-400">Ghi chú giao hàng</span><span className="font-bold text-slate-800 text-right">{selectedOrder.shippingInfo?.note || 'Không có ghi chú'}</span></div>
                                                </div>
                                            </div>

                                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-sans border-b border-slate-100 pb-3">Thông tin thanh toán</h3>
                                                <div className="mt-4 divide-y divide-slate-100 text-xs font-semibold text-slate-500">
                                                    <div className="flex justify-between py-3"><span className="text-slate-400">Tổng chủng loại mặt hàng</span><span className="font-bold text-slate-800">{selectedOrder.items?.length || 0}</span></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-400">Hình thức thanh toán</span><span className="font-bold text-slate-800">{selectedOrder.paymentMethod}</span></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-400">Trạng thái thanh toán</span><span className="font-bold text-slate-800">{getPaymentStatusLabel(selectedOrder)}</span></div>
                                                    <div className="flex justify-between py-3"><span className="text-slate-400 text-sm">Tổng cộng thanh toán</span><span className="font-black text-brand-red text-base">{formatVnd(selectedOrder.totalAmount)}</span></div>
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

            {/* Premium Cancel Order Dialog Modal */}
            {cancelTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xl space-y-5 text-left relative overflow-hidden">
                        <div className="text-center space-y-3">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-red/5 border border-brand-red/10 text-xl font-bold text-brand-red shadow-inner">
                                !
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">
                                {cancelTarget.status === 'PREPARING' ? 'Gửi yêu cầu hủy đơn?' : 'Xác nhận hủy đơn?'}
                            </h2>
                            <p className="max-w-sm mx-auto text-xs text-slate-400 font-semibold leading-relaxed">
                                Đơn hàng <span className="font-bold text-slate-900">#{cancelTarget.orderCode}</span> sẽ chuyển trạng thái yêu cầu hủy. Quyết định này không thể hoàn tác.
                            </p>
                        </div>

                        <label className="block">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Lý do hủy đơn hàng (không bắt buộc)</span>
                            <textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs text-slate-800 outline-none transition focus:border-brand-red focus:bg-white focus:ring-4 focus:ring-brand-red/5"
                                placeholder="Ví dụ: tôi muốn đổi sản phẩm, tôi nhập sai thông tin địa chỉ..."
                            />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={closeCancelModal}
                                disabled={mutating}
                                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Giữ đơn hàng
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancelOrder}
                                disabled={mutating}
                                className="h-11 rounded-2xl bg-brand-red px-4 text-xs font-bold text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {mutating ? 'Đang xử lý...' : cancelTarget.status === 'PREPARING' ? 'Gửi yêu cầu' : 'Hủy đơn'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <Footer />
        </div>
    );
};

export default OrdersPage;

