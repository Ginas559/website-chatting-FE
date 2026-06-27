import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoadingOutlined } from '@ant-design/icons';
import { getMyOrderDetailApi, verifyVnpayReturnApi } from '../util/api';
import { fetchCart } from '../util/cart';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const ORDER_CONFIRMATION_ATTEMPTS = 5;
const ORDER_CONFIRMATION_DELAY_MS = 1200;

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const getErrorMessage = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.errMessage || error.message || error.error || fallback;
};

const formatVnpayDate = (value) => {
    if (!value || String(value).length < 14) return 'N/A';

    const raw = String(value);
    const date = new Date(
        Number(raw.slice(0, 4)),
        Number(raw.slice(4, 6)) - 1,
        Number(raw.slice(6, 8)),
        Number(raw.slice(8, 10)),
        Number(raw.slice(10, 12)),
        Number(raw.slice(12, 14))
    );

    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForOrderPaymentConfirmation = async (orderCode) => {
    if (!orderCode) return null;

    let latestOrder = null;

    for (let attempt = 0; attempt < ORDER_CONFIRMATION_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
            await wait(ORDER_CONFIRMATION_DELAY_MS);
        }

        const response = await getMyOrderDetailApi(orderCode);
        latestOrder = response?.data || null;

        if (latestOrder?.paymentStatus === 'PAID') {
            return latestOrder;
        }
    }

    return latestOrder;
};

const getSystemPaymentStatusLabel = (result) => {
    if (result?.order?.paymentStatus === 'PAID') return 'Đã ghi nhận thanh toán';
    if (result?.order?.paymentStatus === 'FAILED') return 'Thanh toán không thành công';
    if (result?.order?.paymentStatus === 'REFUND_REQUIRED') return 'Cần xử lý hoàn tiền';
    if (result?.order?.paymentStatus === 'REFUNDED') return 'Đã hoàn tiền';
    if (result?.isVerified && result?.isSuccess) return 'Đang chờ hệ thống xác nhận';

    return 'Chưa cập nhật';
};

const VnpayReturnPage = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

    useEffect(() => {
        let isMounted = true;

        const verifyPayment = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await verifyVnpayReturnApi(params);
                if (!isMounted) return;

                if (response?.errCode !== 0 || !response?.data) {
                    throw response;
                }

                let confirmedOrder = null;
                let orderConfirmationError = '';

                if (response.data.isVerified && response.data.isSuccess) {
                    try {
                        confirmedOrder = await waitForOrderPaymentConfirmation(response.data.orderCode);
                    } catch (orderError) {
                        orderConfirmationError = getErrorMessage(orderError, 'Chưa thể kiểm tra trạng thái đơn hàng.');
                    }
                }

                setResult({
                    ...response.data,
                    order: confirmedOrder,
                    orderConfirmationError,
                });

                if (confirmedOrder?.paymentStatus === 'PAID') {
                    fetchCart().catch(() => {});
                }
            } catch (err) {
                if (!isMounted) return;
                setError(getErrorMessage(err, 'Không thể xác thực kết quả thanh toán VNPay.'));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        verifyPayment();

        return () => {
            isMounted = false;
        };
    }, [params]);

    const isVnpaySuccess = Boolean(result?.isVerified && result?.isSuccess);
    const isPaymentConfirmed = result?.order?.paymentStatus === 'PAID';
    const isSuccess = isVnpaySuccess && isPaymentConfirmed;
    const isWaitingForIpn = isVnpaySuccess && !isPaymentConfirmed;

    return (
        <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
            <Header />

            <main className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex w-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
                    {loading ? (
                        <div className="py-24 text-center text-sm font-semibold text-slate-400">
                            <LoadingOutlined className="mr-2 text-brand-red animate-spin text-lg" />
                            Đang xác thực kết quả thanh toán với VNPay...
                        </div>
                    ) : error ? (
                        <div className="px-8 py-16 text-center space-y-4 text-left sm:text-center">
                            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                                VNPay Gateway
                            </div>
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100/60 border border-amber-200/50 text-2xl font-black text-amber-600 shadow-inner">
                                !
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 font-sans">Không thể xác thực thanh toán</h1>
                            <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-500 font-semibold">{error}</p>
                        </div>
                    ) : (
                        <>
                            <header className={`border-b border-slate-200/80 px-6 py-10 text-center space-y-4 ${isSuccess ? 'bg-emerald-50/20' : 'bg-brand-red/5'}`}>
                                <div className={`inline-flex rounded-full border px-3.5 py-1 text-[9px] font-black uppercase tracking-wider ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm' : 'border-brand-red/20 bg-brand-red/5 text-brand-red'}`}>
                                    VNPay Gateway
                                </div>
                                <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full text-xl font-black shadow-inner ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-red/10 text-brand-red'}`}>
                                    {isSuccess ? '✓' : '!'}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                                    {isSuccess ? 'Thanh toán thành công!' : isWaitingForIpn ? 'Thanh toán đang được xử lý' : 'Thanh toán thất bại'}
                                </h1>
                                <div className="flex justify-center">
                                    <p className="max-w-lg text-xs leading-relaxed text-slate-400 font-bold">
                                        {isSuccess
                                            ? 'VNPay đã xác thực giao dịch thành công. Cảm ơn bạn đã lựa chọn mua sắm.'
                                            : isWaitingForIpn
                                                ? result?.orderConfirmationError || 'Giao dịch đã được ghi nhận. Đơn hàng đang chờ đồng bộ tự động trên hệ thống.'
                                            : result?.message || 'Giao dịch chưa hoàn tất hoặc bị hủy bỏ. Vui lòng thanh toán lại hoặc liên hệ hỗ trợ.'}
                                    </p>
                                </div>
                                <div className="flex justify-center pt-2">
                                    <div className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs font-bold shadow-sm ${isSuccess ? 'border-emerald-100 text-emerald-700' : 'border-brand-red/20 text-brand-red'}`}>
                                        <span className={`h-2 w-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-brand-red'}`} />
                                        {isSuccess ? 'Đã hoàn tất thanh toán' : isWaitingForIpn ? 'Đang đồng bộ giao dịch' : 'Yêu cầu kiểm tra lại'}
                                    </div>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-12 text-left">
                                <section className="bg-white p-6 lg:col-span-7 lg:border-r border-slate-200/80 space-y-4">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                                        Chi tiết giao dịch
                                    </h2>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Mã đơn hàng</p>
                                            <p className="break-all text-sm font-bold text-slate-800">{result?.orderCode || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Số tiền thanh toán</p>
                                            <p className="text-xl font-black text-brand-red leading-none mt-1">{formatVnd(result?.amount)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Mã giao dịch VNPay</p>
                                            <p className="text-sm font-bold text-slate-800">{result?.transactionNo || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Thời gian giao dịch</p>
                                            <p className="text-sm font-bold text-slate-800">{formatVnpayDate(result?.payDate)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Ngân hàng thanh toán</p>
                                            <p className="text-sm font-bold text-slate-800">{result?.bankCode || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Mã phản hồi cổng</p>
                                            <p className="text-sm font-bold text-slate-800">{result?.responseCode || 'N/A'} / {result?.transactionStatus || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                            <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Trạng thái hệ thống</p>
                                            <p className="text-sm font-bold text-slate-800">{getSystemPaymentStatusLabel(result)}</p>
                                        </div>
                                    </div>
                                </section>

                                <aside className="bg-slate-50/40 p-6 lg:col-span-5 space-y-4">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                                        Hướng dẫn tiếp theo
                                    </h2>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition hover:shadow-md">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-600">1</div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-800">Kiểm tra đơn hàng</p>
                                                <p className="text-xs leading-relaxed text-slate-400 font-semibold">Xem thông tin chi tiết và tình trạng chuẩn bị hàng trong lịch sử đơn.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition hover:shadow-md">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-600">2</div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-800">Theo dõi vận chuyển</p>
                                                <p className="text-xs leading-relaxed text-slate-400 font-semibold">SmartZone sẽ chuyển hàng và shipper sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50/50 p-6 sm:flex-row">
                        <Link to="/" className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-2xl bg-brand-red px-6 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition hover:bg-brand-red-hover active:scale-[0.98]">
                            Về trang chủ
                        </Link>
                        <Link to="/cart" className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]">
                            Xem giỏ hàng
                        </Link>
                        <Link to="/orders" className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-6 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100 active:scale-[0.98]">
                            Lịch sử đơn hàng
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default VnpayReturnPage;
