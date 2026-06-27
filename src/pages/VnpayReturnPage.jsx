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
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />

            <main className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex w-full flex-col overflow-hidden rounded-[32px] border border-border-color bg-white shadow-xl">
                    {loading ? (
                        <div className="py-20 text-center text-sm font-semibold text-slate-500">
                            <LoadingOutlined className="mr-2 text-brand-red" />
                            Đang xác thực kết quả thanh toán...
                        </div>
                    ) : error ? (
                        <div className="px-8 py-12 text-center">
                            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
                                VNPay Sandbox
                            </div>
                            <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-4xl font-bold text-amber-600">
                                !
                            </div>
                            <h1 className="mt-6 text-3xl font-extrabold text-slate-900">Không thể xác thực thanh toán</h1>
                            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-500">{error}</p>
                        </div>
                    ) : (
                        <>
                            <header className={`border-b border-border-color px-6 pb-6 pt-6 text-center ${isSuccess ? 'bg-emerald-50/50' : 'bg-brand-red/5'}`}>
                                <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-brand-red/20 bg-brand-red/5 text-brand-red'}`}>
                                    VNPay Sandbox
                                </div>
                                <div className={`mx-auto mt-3 grid h-11 w-11 place-items-center rounded-full text-2xl font-bold shadow-inner ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-red/10 text-brand-red'}`}>
                                    {isSuccess ? '✓' : '!'}
                                </div>
                                <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
                                    {isSuccess ? 'Thanh toán thành công' : isWaitingForIpn ? 'Thanh toán đang được xác nhận' : 'Thanh toán chưa thành công'}
                                </h1>
                                <div className="mt-2 flex justify-center text-left sm:text-center">
                                    <p className="max-w-lg text-sm leading-6 text-slate-500">
                                        {isSuccess
                                            ? 'VNPay đã xác nhận giao dịch và hệ thống đã cập nhật đơn hàng.'
                                            : isWaitingForIpn
                                                ? result?.orderConfirmationError || 'Giao dịch đã được VNPay ghi nhận thành công. Đơn hàng đang chờ hệ thống xác nhận tự động. Nếu trạng thái chưa cập nhật sau vài phút, vui lòng liên hệ hỗ trợ kèm mã đơn hàng.'
                                            : result?.message || 'Giao dịch chưa hoàn tất, vui lòng kiểm tra lại hoặc chọn phương thức khác.'}
                                    </p>
                                </div>
                                <div className="mt-3 flex justify-center">
                                    <div className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-semibold shadow-sm ${isSuccess ? 'border-emerald-100 text-emerald-700' : 'border-brand-red/20 text-brand-red'}`}>
                                        <span className={`h-2.5 w-2.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-brand-red'}`} />
                                        {isSuccess ? 'Đã ghi nhận thanh toán' : isWaitingForIpn ? 'Đang đồng bộ thanh toán' : 'Cần kiểm tra lại'}
                                    </div>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-12 text-left">
                                <section className="border-b border-border-color bg-white p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
                                    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
                                        Thông tin giao dịch
                                    </h2>
                                    <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3 md:col-span-2">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã đơn hàng</p>
                                            <p className="break-all text-base font-bold text-slate-900">{result?.orderCode || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3 md:col-span-2">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Số tiền</p>
                                            <p className="text-2xl font-extrabold text-brand-red">{formatVnd(result?.amount)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã giao dịch</p>
                                            <p className="text-base font-bold text-slate-800">{result?.transactionNo || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Thời gian</p>
                                            <p className="text-base font-bold text-slate-800">{formatVnpayDate(result?.payDate)}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Ngân hàng</p>
                                            <p className="text-base font-bold text-slate-800">{result?.bankCode || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã phản hồi</p>
                                            <p className="text-base font-bold text-slate-800">{result?.responseCode || 'N/A'} / {result?.transactionStatus || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border-color bg-slate-50 px-4 py-3 md:col-span-2">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Trạng thái hệ thống</p>
                                            <p className="text-base font-bold text-slate-800">{getSystemPaymentStatusLabel(result)}</p>
                                        </div>
                                    </div>
                                </section>

                                <aside className="bg-slate-50/50 p-6 lg:col-span-5">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                        Bước tiếp theo
                                    </h2>
                                    <div className="mt-3 space-y-2.5">
                                        <div className="flex gap-3 rounded-2xl border border-border-color bg-white p-4 shadow-sm transition-transform hover:translate-x-1">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-600">1</div>
                                            <div>
                                                <p className="text-base font-bold text-slate-800">Kiểm tra đơn hàng</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">Xem lại trạng thái xử lý và thông tin giao hàng trong lịch sử đơn.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 rounded-2xl border border-border-color bg-white p-4 shadow-sm transition-transform hover:translate-x-1">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-600">2</div>
                                            <div>
                                                <p className="text-base font-bold text-slate-800">Theo dõi trạng thái</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">Đơn sẽ chuyển qua các bước xác nhận, chuẩn bị hàng và giao hàng.</p>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col justify-center gap-3 border-t border-border-color bg-white p-6 md:flex-row">
                        <Link to="/" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-2xl bg-brand-red px-7 text-sm font-bold text-white shadow-lg shadow-brand-red/20 transition hover:bg-brand-red-hover active:scale-[0.98]">
                            Về trang chủ
                        </Link>
                        <Link to="/cart" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-2xl border border-border-color px-7 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]">
                            Xem giỏ hàng
                        </Link>
                        <Link to="/orders" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-2xl border-2 border-emerald-500 px-7 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50 active:scale-[0.98]">
                            Xem đơn hàng
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default VnpayReturnPage;
