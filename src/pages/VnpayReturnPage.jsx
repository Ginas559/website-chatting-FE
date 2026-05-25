import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoadingOutlined } from '@ant-design/icons';
import { verifyVnpayReturnApi } from '../util/api';
import { fetchCart } from '../util/cart';

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

                setResult(response.data);

                if (response.data.isSuccess) {
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

    const isSuccess = Boolean(result?.isVerified && result?.isSuccess);

    return (
        <div className="flex min-h-screen items-start justify-center bg-slate-100 px-4 py-3 text-slate-900">
            <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                {loading ? (
                    <div className="py-10 text-center text-sm font-semibold text-slate-500">
                        <LoadingOutlined className="mr-2" />
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
                        <header className={`border-b px-6 pb-4 pt-5 text-center ${isSuccess ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
                            <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                VNPay Sandbox
                            </div>
                            <div className={`mx-auto mt-3 grid h-11 w-11 place-items-center rounded-full text-2xl font-bold shadow-inner ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isSuccess ? '✓' : '!'}
                            </div>
                            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
                                {isSuccess ? 'Thanh toán thành công' : 'Thanh toán chưa thành công'}
                            </h1>
                            <div className="mt-2 flex justify-center">
                                <p className="max-w-lg text-center text-sm leading-6 text-slate-500">
                                    {isSuccess
                                        ? 'VNPay đã trả kết quả giao dịch. Đơn hàng sẽ được xử lý theo trạng thái thanh toán trong hệ thống.'
                                        : result?.message || 'Giao dịch chưa hoàn tất, vui lòng kiểm tra lại hoặc chọn phương thức khác.'}
                                </p>
                            </div>
                            <div className="mt-3 flex justify-center">
                                <div className={`inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-semibold shadow-sm ${isSuccess ? 'border-emerald-100 text-emerald-700' : 'border-amber-100 text-amber-700'}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {isSuccess ? 'Đã ghi nhận thanh toán' : 'Cần kiểm tra lại'}
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-12">
                            <section className="border-b border-slate-100 bg-white p-4 lg:col-span-7 lg:border-b-0 lg:border-r">
                                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Thông tin giao dịch
                                </h2>
                                <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5 md:col-span-2">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã đơn hàng</p>
                                        <p className="break-all text-base font-bold text-slate-900">{result?.orderCode || 'N/A'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5 md:col-span-2">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Số tiền</p>
                                        <p className="text-2xl font-extrabold text-rose-600">{formatVnd(result?.amount)}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã giao dịch</p>
                                        <p className="text-base font-bold text-slate-800">{result?.transactionNo || 'N/A'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Thời gian</p>
                                        <p className="text-base font-bold text-slate-800">{formatVnpayDate(result?.payDate)}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Ngân hàng</p>
                                        <p className="text-base font-bold text-slate-800">{result?.bankCode || 'N/A'}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Mã phản hồi</p>
                                        <p className="text-base font-bold text-slate-800">{result?.responseCode || 'N/A'} / {result?.transactionStatus || 'N/A'}</p>
                                    </div>
                                </div>
                            </section>

                            <aside className="bg-slate-50/50 p-4 lg:col-span-5">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Bước tiếp theo
                                </h2>
                                <div className="mt-3 space-y-2.5">
                                    <div className="flex gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm transition-transform hover:translate-x-1">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-600">1</div>
                                        <div>
                                            <p className="text-base font-bold text-slate-800">Kiểm tra đơn hàng</p>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">Xem lại trạng thái xử lý và thông tin giao hàng trong lịch sử đơn.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm transition-transform hover:translate-x-1">
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

                <div className="flex flex-col justify-center gap-3 border-t border-slate-100 bg-white p-4 md:flex-row">
                    <Link to="/" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg bg-rose-600 px-7 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 active:scale-[0.98]">
                        Về trang chủ
                    </Link>
                    <Link to="/cart" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg border border-slate-200 px-7 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]">
                        Xem giỏ hàng
                    </Link>
                    <Link to="/orders" className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg border-2 border-emerald-500 px-7 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50 active:scale-[0.98]">
                        Xem đơn hàng
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VnpayReturnPage;
