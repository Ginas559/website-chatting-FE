import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeftOutlined, LoadingOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { checkoutOrderApi, getUserProfileApi } from '../util/api';
import { fetchCart, getCartSnapshot, resetCartCache } from '../util/cart';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const initialForm = {
    fullName: '',
    phone: '',
    address: '',
    city: '',
    note: '',
};

const getErrorMessage = (error, fallback) => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.errMessage || error.message || error.error || fallback;
};

const validateForm = (values) => {
    const errors = {};
    const phonePattern = /^[0-9+\-\s()]{8,20}$/;

    if (values.fullName.trim().length < 2) {
        errors.fullName = 'Nhập họ tên người nhận ít nhất 2 ký tự.';
    }

    if (!phonePattern.test(values.phone.trim())) {
        errors.phone = 'Số điện thoại chưa hợp lệ.';
    }

    if (values.address.trim().length < 8) {
        errors.address = 'Địa chỉ nhận hàng cần rõ hơn.';
    }

    if (values.city.trim().length > 80) {
        errors.city = 'Tỉnh/thành phố quá dài.';
    }

    if (values.note.trim().length > 300) {
        errors.note = 'Ghi chú không được vượt quá 300 ký tự.';
    }

    return errors;
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [cart, setCart] = useState(() => getCartSnapshot());
    const [form, setForm] = useState(() => ({
        ...initialForm,
        fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        phone: user?.phoneNumber || '',
        address: user?.address || '',
    }));
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [createdOrder, setCreatedOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('COD');

    // Extract productIds from location.state
    const productIds = useMemo(() => {
        return location.state?.productIds || [];
    }, [location.state?.productIds]);

    const directItem = useMemo(() => {
        return location.state?.directItem || null;
    }, [location.state?.directItem]);

    const items = useMemo(() => {
        if (directItem) {
            return [directItem];
        }
        const rawItems = Array.isArray(cart.items) ? cart.items : [];
        if (productIds.length > 0) {
            const productIdsStr = productIds.map(String);
            return rawItems.filter((item) => productIdsStr.includes(String(item.productId)));
        }
        return rawItems;
    }, [cart.items, productIds, directItem]);

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + Number(item.lineTotal ?? Number(item.snapshot?.price || item.unitPrice || 0) * Number(item.quantity || item.qty || 0)), 0);
    }, [items]);

    const couponCode = useMemo(() => {
        return location.state?.couponCode || '';
    }, [location.state?.couponCode]);

    const [coupons, setCoupons] = useState([]);
    useEffect(() => {
        if (!isAuthenticated) return;
        getUserProfileApi()
            .then((res) => {
                if (res?.user?.rewardCoupons) {
                    setCoupons(res.user.rewardCoupons);
                }
            })
            .catch(() => {});
    }, [isAuthenticated]);

    const appliedCoupon = useMemo(() => {
        if (!couponCode || coupons.length === 0) return null;
        return coupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase());
    }, [couponCode, coupons]);

    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        return Math.round(subtotal * (appliedCoupon.discountPercent / 100));
    }, [appliedCoupon, subtotal]);

    const finalTotalAmount = useMemo(() => {
        return Math.max(0, subtotal - discountAmount);
    }, [subtotal, discountAmount]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        let isMounted = true;

        const loadCart = async () => {
            setLoading(true);
            setFeedback('');

            try {
                const snapshot = await fetchCart();
                if (!isMounted) return;
                setCart(snapshot);
            } catch (error) {
                if (!isMounted) return;
                setCart(getCartSnapshot());
                setFeedback(getErrorMessage(error, 'Không thể tải giỏ hàng để thanh toán.'));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadCart();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, navigate]);

    const updateForm = (field) => (event) => {
        setForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));

        if (errors[field]) {
            setErrors((current) => ({ ...current, [field]: '' }));
        }

        if (feedback) {
            setFeedback('');
        }
    };

    const submitOrder = async (event) => {
        if (event?.preventDefault) {
            event.preventDefault();
        }

        if (!items.length) {
            setFeedback('Giỏ hàng đang trống, vui lòng thêm sản phẩm trước khi thanh toán.');
            return;
        }

        const nextErrors = validateForm(form);
        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setSubmitting(true);
        setFeedback('');

        try {
            const response = await checkoutOrderApi({
                paymentMethod,
                shippingInfo: {
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    city: form.city.trim(),
                    note: form.note.trim(),
                },
                productIds: productIds.length > 0 ? productIds : undefined,
                directItem: directItem ? {
                    productId: directItem.productId,
                    quantity: directItem.quantity,
                    color: directItem.snapshot?.color,
                    capacity: directItem.snapshot?.capacity
                } : undefined,
                couponCode: couponCode || undefined
            });

            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            if (paymentMethod === 'VNPAY') {
                const paymentUrl = response.data.paymentUrl;

                if (!paymentUrl) {
                    throw new Error('Không nhận được link thanh toán VNPay.');
                }

                window.location.href = paymentUrl;
                return;
            }

            await fetchCart().catch(() => {});
            setCart(getCartSnapshot());
            setCreatedOrder(response.data);
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể đặt hàng. Vui lòng kiểm tra lại giỏ hàng.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (createdOrder) {
        return (
            <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
                <Header />
                <main className="mx-auto max-w-3xl px-4 py-16 text-left">
                    <div className="rounded-[32px] border border-slate-200 bg-white p-8 md:p-10 shadow-xl relative overflow-hidden">
                        {/* Success background decoration */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
                        
                        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                            Đơn hàng đã được tạo
                        </div>
                        
                        <div className="mt-6 flex items-center gap-4">
                            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600 shadow-inner">
                                ✓
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight font-sans">Đặt hàng thành công!</h1>
                                <p className="mt-1 text-sm text-slate-500 font-semibold">Cảm ơn bạn đã lựa chọn mua sắm tại SmartZone.</p>
                            </div>
                        </div>

                        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-4">
                            <div className="flex items-center justify-between gap-4 text-sm text-slate-500 font-semibold">
                                <span>Mã đơn hàng</span>
                                <span className="font-extrabold text-slate-900 break-all text-base">{createdOrder.orderCode}</span>
                            </div>
                            <hr className="border-slate-200/60" />
                            <div className="flex items-center justify-between gap-4 text-sm text-slate-500 font-semibold">
                                <span>Phương thức thanh toán</span>
                                <span className="font-bold text-slate-900">{createdOrder.paymentMethod === 'COD' ? 'COD - Nhận hàng thanh toán' : 'VNPay - Đã thanh toán'}</span>
                            </div>
                            <hr className="border-slate-200/60" />
                            <div className="flex items-center justify-between gap-4 text-sm text-slate-500 font-semibold">
                                <span>Tổng cộng thanh toán</span>
                                <span className="font-black text-brand-red text-xl">{formatVnd(createdOrder.totalAmount)}</span>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link to="/" className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-red px-6 text-sm font-bold text-white shadow-lg shadow-brand-red/20 transition hover:bg-brand-red-hover active:scale-[0.98]">
                                Về trang chủ
                            </Link>
                            <Link to="/search" className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]">
                                Tiếp tục mua sắm
                            </Link>
                            <Link to="/orders" className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-6 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100 active:scale-[0.98]">
                                Xem lịch sử đơn hàng
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
                {/* Top header navigation */}
                <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-red font-sans">Checkout Process</div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Thanh toán đơn hàng</h1>
                        <p className="mt-1 text-sm text-slate-500">Xem lại thông tin và xác nhận đặt đơn hàng của bạn.</p>
                    </div>
                    <Link to="/cart" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]">
                        <ArrowLeftOutlined />
                        Quay lại giỏ hàng
                    </Link>
                </div>

                {/* Stepper Progress */}
                <div className="mt-6 flex items-center justify-center gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span className="text-brand-red flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px]">1</span> Giỏ hàng</span>
                    <span className="text-slate-300">&rarr;</span>
                    <span className="text-brand-red flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-brand-red text-white flex items-center justify-center text-[10px]">2</span> Thông tin đặt hàng</span>
                    <span className="text-slate-300">&rarr;</span>
                    <span className="flex items-center gap-1.5"><span className="h-5 w-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">3</span> Hoàn tất</span>
                </div>

                {feedback ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 shadow-sm text-left">
                        ⚠️ {feedback}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
                    {/* Delivery Form */}
                    <form onSubmit={submitOrder} className="rounded-[32px] border border-slate-200 bg-white p-6 md:p-8 text-left shadow-sm space-y-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide font-sans border-b border-slate-100 pb-3">Thông tin giao hàng</h2>
                            <p className="mt-1.5 text-xs text-slate-400">Vui lòng điền thông tin chính xác để nhân viên giao hàng liên lạc.</p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Họ tên người nhận</span>
                                <input 
                                    value={form.fullName} 
                                    onChange={updateForm('fullName')} 
                                    className={`w-full rounded-2xl border ${errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-slate-200 bg-slate-50'} px-4 py-3.5 text-sm outline-none transition focus:border-brand-red focus:bg-white`} 
                                    placeholder="Nguyễn Văn A" 
                                />
                                {errors.fullName ? <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.fullName}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Số điện thoại</span>
                                <input 
                                    value={form.phone} 
                                    onChange={updateForm('phone')} 
                                    className={`w-full rounded-2xl border ${errors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-200 bg-slate-50'} px-4 py-3.5 text-sm outline-none transition focus:border-brand-red focus:bg-white`} 
                                    placeholder="0900000000" 
                                />
                                {errors.phone ? <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.phone}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Địa chỉ nhận hàng</span>
                                <input 
                                    value={form.address} 
                                    onChange={updateForm('address')} 
                                    className={`w-full rounded-2xl border ${errors.address ? 'border-red-500 bg-red-50/20' : 'border-slate-200 bg-slate-50'} px-4 py-3.5 text-sm outline-none transition focus:border-brand-red focus:bg-white`} 
                                    placeholder="Số nhà, tên đường, phường/xã..." 
                                />
                                {errors.address ? <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.address}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Tỉnh/Thành phố</span>
                                <input 
                                    value={form.city} 
                                    onChange={updateForm('city')} 
                                    className={`w-full rounded-2xl border ${errors.city ? 'border-red-500 bg-red-50/20' : 'border-slate-200 bg-slate-50'} px-4 py-3.5 text-sm outline-none transition focus:border-brand-red focus:bg-white`} 
                                    placeholder="TP. Hồ Chí Minh" 
                                />
                                {errors.city ? <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.city}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Ghi chú giao hàng (Tùy chọn)</span>
                                <textarea 
                                    value={form.note} 
                                    onChange={updateForm('note')} 
                                    rows={3} 
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-brand-red focus:bg-white" 
                                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..." 
                                />
                                {errors.note ? <span className="mt-1.5 block text-xs font-bold text-red-600">{errors.note}</span> : null}
                            </label>
                        </div>

                        {/* Payment Selection Methods */}
                        <div className="pt-4">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide font-sans border-b border-slate-100 pb-3">Phương thức thanh toán</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {/* COD Card */}
                                <label 
                                    className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                        paymentMethod === 'COD' 
                                            ? 'border-brand-red bg-brand-red/5' 
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="COD"
                                        checked={paymentMethod === 'COD'}
                                        onChange={() => setPaymentMethod('COD')}
                                        className="sr-only"
                                    />
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-lg">💵</div>
                                        {paymentMethod === 'COD' && (
                                            <span className="text-brand-red text-xs font-bold">✓ Đã chọn</span>
                                        )}
                                    </div>
                                    <span className="block font-bold text-slate-900 text-sm">COD</span>
                                    <span className="block text-slate-500 text-[11px] mt-1 leading-snug">Thanh toán bằng tiền mặt khi shipper giao hàng tận nơi.</span>
                                </label>

                                {/* VNPay Card */}
                                <label 
                                    className={`relative flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                        paymentMethod === 'VNPAY' 
                                            ? 'border-brand-red bg-brand-red/5' 
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="VNPAY"
                                        checked={paymentMethod === 'VNPAY'}
                                        onChange={() => setPaymentMethod('VNPAY')}
                                        className="sr-only"
                                    />
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-lg">💳</div>
                                        {paymentMethod === 'VNPAY' && (
                                            <span className="text-brand-red text-xs font-bold">✓ Đã chọn</span>
                                        )}
                                    </div>
                                    <span className="block font-bold text-slate-900 text-sm">Cổng VNPay</span>
                                    <span className="block text-slate-500 text-[11px] mt-1 leading-snug">Thanh toán qua ví/ATM/QR code của VNPay Sandbox lập tức.</span>
                                </label>
                            </div>
                        </div>
                    </form>

                    {/* Order Summary Sidebar */}
                    <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-6 text-left shadow-sm">
                        <h2 className="text-base font-black text-[#1a1c1c] uppercase tracking-wider font-sans border-b border-slate-100 pb-3">Tóm tắt đơn hàng</h2>

                        {loading ? (
                            <div className="py-12 text-center text-sm font-semibold text-slate-400">
                                <LoadingOutlined className="mr-2 text-brand-red" /> Đang đồng bộ thông tin giỏ hàng...
                            </div>
                        ) : items.length ? (
                            <>
                                {/* Items list container */}
                                <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                                    {items.map((item) => (
                                        <div key={item.cartItemId || item.productId} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                                            <div className="h-16 w-16 bg-white rounded-xl border border-slate-100 flex items-center justify-center p-1 shrink-0">
                                                <img 
                                                    src={item.snapshot?.image} 
                                                    alt={item.snapshot?.name} 
                                                    className="max-h-full max-w-full object-contain" 
                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100x100?text=No+Img'; }}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 leading-snug break-words line-clamp-2 break-all">{item.snapshot?.name}</div>
                                                    {(item.snapshot?.color || item.snapshot?.capacity) && (
                                                        <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-slate-400 font-extrabold uppercase">
                                                            {item.snapshot.color && <span className="rounded border border-slate-200/60 bg-slate-100 px-1 py-0.2">{item.snapshot.color}</span>}
                                                            {item.snapshot.capacity && <span className="rounded border border-slate-200/60 bg-slate-100 px-1 py-0.2">{item.snapshot.capacity}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 font-semibold">
                                                    <span>SL: {item.quantity}</span>
                                                    <span className="font-bold text-brand-red">{formatVnd(item.lineTotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals pricing summary */}
                                <div className="mt-6 border-t border-slate-100 pt-4 space-y-3 font-semibold text-slate-500 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span>Tạm tính</span>
                                        <span className="text-[#1a1c1c]">{formatVnd(subtotal)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex items-center justify-between text-brand-red">
                                            <span>Giảm giá ({appliedCoupon?.code})</span>
                                            <span>-{formatVnd(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Phí vận chuyển</span>
                                        <span className="text-emerald-600 font-bold">Miễn phí</span>
                                    </div>
                                    <hr className="border-slate-100" />
                                    <div className="flex items-center justify-between text-base font-black text-[#1a1c1c] pt-1">
                                        <span>Tổng cộng</span>
                                        <span className="text-brand-red text-lg">{formatVnd(finalTotalAmount)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={submitOrder}
                                    disabled={submitting || loading || !items.length}
                                    className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand-red px-4 py-3 font-bold text-white shadow-lg shadow-brand-red/20 transition-all duration-300 hover:bg-brand-red-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <LoadingOutlined className="animate-spin" /> Đang tạo đơn hàng...
                                        </span>
                                    ) : paymentMethod === 'VNPAY' ? (
                                        'Thanh toán qua VNPay'
                                    ) : (
                                        'Xác nhận đặt hàng'
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                                <ShoppingCartOutlined className="text-3xl text-slate-300" />
                                <p className="mt-3 text-xs font-semibold text-slate-500">Không có sản phẩm nào để thanh toán.</p>
                                <Link to="/search" className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-brand-red px-4 text-xs font-bold text-white hover:bg-brand-red-hover">
                                    Tìm sản phẩm
                                </Link>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutPage;

