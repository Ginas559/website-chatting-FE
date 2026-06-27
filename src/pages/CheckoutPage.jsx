import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeftOutlined, LoadingOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { checkoutOrderApi } from '../util/api';
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
                } : undefined
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
            <div className="min-h-screen bg-slate-50 text-slate-900">
                <Header />
                <main className="mx-auto max-w-3xl px-4 py-16 text-left">
                    <div className="rounded-[32px] border border-border-color bg-white p-8 shadow-sm">
                        <div className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600">Order Created</div>
                        <h1 className="mt-3 text-3xl font-black">Đặt hàng thành công</h1>
                        <p className="mt-3 text-slate-600">Shop đã ghi nhận đơn hàng của bạn. Bạn có thể theo dõi trạng thái đơn hàng sau khi đặt.</p>

                        <div className="mt-6 rounded-3xl border border-border-color bg-slate-50 p-5">
                            <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                                <span>Mã đơn hàng</span>
                                <span className="font-bold text-slate-900">{createdOrder.orderCode}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-600">
                                <span>Phương thức</span>
                                <span className="font-bold text-slate-900">{createdOrder.paymentMethod}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-600">
                                <span>Tổng tiền</span>
                                <span className="font-bold text-brand-red">{formatVnd(createdOrder.totalAmount)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to="/" className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition hover:bg-brand-red-hover">
                                Về trang chủ
                            </Link>
                            <Link to="/search" className="rounded-2xl border border-border-color bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Tiếp tục mua sắm
                            </Link>
                            <Link to="/orders" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                                Xem đơn hàng
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 text-left">
                    <div>
                        <div className="text-sm font-black uppercase tracking-[0.22em] text-brand-red">Checkout</div>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Thanh toán đơn hàng</h1>
                        <p className="mt-2 text-slate-500">Kiểm tra thông tin nhận hàng và phương thức thanh toán trước khi đặt đơn.</p>
                    </div>
                    <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-border-color bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        <ArrowLeftOutlined />
                        Quay lại giỏ hàng
                    </Link>
                </div>

                {feedback ? (
                    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 shadow-sm">
                        {feedback}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
                    <form onSubmit={submitOrder} className="rounded-[32px] border border-border-color bg-white p-6 text-left shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">Thông tin nhận hàng</h2>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Họ tên người nhận</span>
                                <input value={form.fullName} onChange={updateForm('fullName')} className="mt-2 w-full rounded-2xl border border-border-color bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white" placeholder="Nguyễn Văn A" />
                                {errors.fullName ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.fullName}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Số điện thoại</span>
                                <input value={form.phone} onChange={updateForm('phone')} className="mt-2 w-full rounded-2xl border border-border-color bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white" placeholder="0900000000" />
                                {errors.phone ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.phone}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-sm font-semibold text-slate-700">Địa chỉ nhận hàng</span>
                                <input value={form.address} onChange={updateForm('address')} className="mt-2 w-full rounded-2xl border border-border-color bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white" placeholder="Số nhà, đường, phường/xã, quận/huyện" />
                                {errors.address ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.address}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Tỉnh/thành phố</span>
                                <input value={form.city} onChange={updateForm('city')} className="mt-2 w-full rounded-2xl border border-border-color bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white" placeholder="TP. Hồ Chí Minh" />
                                {errors.city ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.city}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-sm font-semibold text-slate-700">Ghi chú</span>
                                <textarea value={form.note} onChange={updateForm('note')} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-border-color bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white" placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..." />
                                {errors.note ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.note}</span> : null}
                            </label>
                        </div>

                        <div className="mt-6 rounded-3xl border border-brand-red/10 bg-brand-red/5 px-5 py-4 text-sm text-slate-700">
                            <div className="font-bold text-slate-900">Phương thức thanh toán</div>

                            <label className="mt-4 flex cursor-pointer items-start gap-3">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="COD"
                                    checked={paymentMethod === 'COD'}
                                    onChange={() => setPaymentMethod('COD')}
                                    className="mt-1 accent-brand-red"
                                />
                                <span>
                                    <span className="block font-bold text-slate-900">COD - Thanh toán khi nhận hàng</span>
                                    <span className="mt-1 block text-slate-600">Mặc định, không cần thanh toán trước.</span>
                                </span>
                            </label>

                            <label className="mt-4 flex cursor-pointer items-start gap-3">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="VNPAY"
                                    checked={paymentMethod === 'VNPAY'}
                                    onChange={() => setPaymentMethod('VNPAY')}
                                    className="mt-1 accent-brand-red"
                                />
                                <span>
                                    <span className="block font-bold text-slate-900">VNPay - Thanh toán online</span>
                                    <span className="mt-1 block text-slate-600">Bạn sẽ được chuyển sang cổng thanh toán VNPay sandbox.</span>
                                </span>
                            </label>
                        </div>
                    </form>

                    <aside className="h-fit rounded-[32px] border border-border-color bg-white p-5 text-left shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">Tóm tắt đơn hàng</h2>

                        {loading ? (
                            <div className="mt-5 rounded-3xl border border-dashed border-border-color p-8 text-center text-sm font-semibold text-slate-500">
                                <LoadingOutlined className="mr-2" /> Đang tải giỏ hàng...
                            </div>
                        ) : items.length ? (
                            <>
                                <div className="mt-5 space-y-3">
                                    {items.map((item) => (
                                        <div key={item.cartItemId || item.productId} className="flex gap-3 rounded-3xl border border-border-color bg-slate-50 p-3">
                                            <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-16 w-14 rounded-2xl object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold text-slate-900 leading-snug break-words">{item.snapshot?.name}</div>
                                                {(item.snapshot?.color || item.snapshot?.capacity) && (
                                                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500 font-bold">
                                                        {item.snapshot.color && <span className="rounded bg-slate-200/60 px-1.5 py-0.5">{item.snapshot.color}</span>}
                                                        {item.snapshot.capacity && <span className="rounded bg-slate-200/60 px-1.5 py-0.5">{item.snapshot.capacity}</span>}
                                                    </div>
                                                )}
                                                <div className="mt-1.5 text-xs text-slate-500 font-semibold">SL: {item.quantity}</div>
                                                <div className="mt-1 text-sm font-semibold text-brand-red">{formatVnd(item.lineTotal)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 border-t border-border-color pt-4">
                                    <div className="flex items-center justify-between text-sm text-slate-600">
                                        <span>Tạm tính</span>
                                        <span>{formatVnd(subtotal)}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                                        <span>Phí vận chuyển</span>
                                        <span>{formatVnd(0)}</span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-base font-black text-slate-900">
                                        <span>Tổng thanh toán</span>
                                        <span className="text-brand-red">{formatVnd(subtotal)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={submitOrder}
                                    disabled={submitting || loading || !items.length}
                                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-brand-red px-4 py-3 font-semibold text-white shadow-lg shadow-brand-red/20 transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Đang xử lý...' : paymentMethod === 'VNPAY' ? 'Thanh toán qua VNPay' : 'Đặt hàng'}
                                </button>
                            </>
                        ) : (
                            <div className="mt-5 rounded-3xl border border-dashed border-brand-red/20 p-8 text-center">
                                <ShoppingCartOutlined className="text-3xl text-brand-red" />
                                <p className="mt-3 text-sm font-semibold text-slate-600">Giỏ hàng đang trống.</p>
                                <Link to="/search" className="mt-4 inline-flex rounded-2xl bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-hover">
                                    Chọn sản phẩm
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
