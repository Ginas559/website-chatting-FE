import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftOutlined, LoadingOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { logoutUser } from '../redux/slices/authSlice';
import { checkoutOrderApi } from '../util/api';
import { fetchCart, getCartSnapshot, resetCartCache } from '../util/cart';

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

const CHECKOUT_SELECTION_KEY = 'smartzone.checkout.selectedProductIds';

const VIETNAM_PROVINCES = [
    'An Giang',
    'Bắc Ninh',
    'Cà Mau',
    'Cao Bằng',
    'Cần Thơ',
    'Đà Nẵng',
    'Đắk Lắk',
    'Điện Biên',
    'Đồng Nai',
    'Đồng Tháp',
    'Gia Lai',
    'Hà Nội',
    'Hà Tĩnh',
    'Hải Phòng',
    'Hồ Chí Minh',
    'Huế',
    'Hưng Yên',
    'Khánh Hòa',
    'Lai Châu',
    'Lâm Đồng',
    'Lạng Sơn',
    'Lào Cai',
    'Nghệ An',
    'Ninh Bình',
    'Phú Thọ',
    'Quảng Ngãi',
    'Quảng Ninh',
    'Quảng Trị',
    'Sơn La',
    'Tây Ninh',
    'Thái Nguyên',
    'Thanh Hóa',
    'Tuyên Quang',
    'Vĩnh Long',
];

const getStoredCheckoutSelection = () => {
    try {
        const rawValue = sessionStorage.getItem(CHECKOUT_SELECTION_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];

        return Array.isArray(parsedValue) ? parsedValue.map((productId) => String(productId)).filter(Boolean) : [];
    } catch {
        return [];
    }
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

    if (!VIETNAM_PROVINCES.includes(values.city.trim())) {
        errors.city = 'Chọn tỉnh/thành phố trong danh sách.';
    }

    if (values.note.trim().length > 300) {
        errors.note = 'Ghi chú không được vượt quá 300 ký tự.';
    }

    return errors;
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [selectedProductIds, setSelectedProductIds] = useState(() => {
        const routeSelection = location.state?.selectedProductIds;

        return Array.isArray(routeSelection)
            ? routeSelection.map((productId) => String(productId)).filter(Boolean)
            : getStoredCheckoutSelection();
    });
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

    const cartItems = Array.isArray(cart.items) ? cart.items : [];
    const selectedIdSet = useMemo(() => (
        selectedProductIds.length ? new Set(selectedProductIds) : null
    ), [selectedProductIds]);
    const items = useMemo(() => (
        selectedIdSet
            ? cartItems.filter((item) => selectedIdSet.has(String(item.productId)))
            : cartItems
    ), [cartItems, selectedIdSet]);
    const checkoutProductIds = useMemo(
        () => items.map((item) => String(item.productId)).filter(Boolean),
        [items]
    );
    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.lineTotal ?? Number(item.snapshot?.price || item.unitPrice || 0) * Number(item.quantity || item.qty || 0)), 0),
        [items]
    );
    const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Member';
    const memberTag = memberName.charAt(0).toUpperCase() || 'M';

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
                if (selectedProductIds.length) {
                    const availableIds = new Set((snapshot.items || []).map((item) => String(item.productId)));
                    const availableSelection = selectedProductIds.filter((productId) => availableIds.has(productId));
                    setSelectedProductIds(availableSelection);

                    if (!availableSelection.length) {
                        setFeedback('Các sản phẩm đã chọn không còn trong giỏ hàng. Vui lòng quay lại giỏ hàng để chọn lại.');
                    }
                }
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

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

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
            setFeedback(selectedProductIds.length ? 'Các sản phẩm đã chọn không còn trong giỏ hàng.' : 'Giỏ hàng đang trống, vui lòng thêm sản phẩm trước khi thanh toán.');
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
                selectedProductIds: checkoutProductIds,
                shippingInfo: {
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    city: form.city.trim(),
                    note: form.note.trim(),
                },
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

            sessionStorage.removeItem(CHECKOUT_SELECTION_KEY);
            const nextCart = await fetchCart().catch(() => {
                resetCartCache();
                return getCartSnapshot();
            });
            setCart(nextCart);
            setCreatedOrder(response.data);
        } catch (error) {
            setFeedback(getErrorMessage(error, 'Không thể đặt hàng. Vui lòng kiểm tra lại giỏ hàng.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (createdOrder) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 px-4 py-10 text-slate-900">
                <div className="mx-auto max-w-3xl rounded-[32px] border border-emerald-200 bg-white p-8 text-left shadow-sm">
                    <div className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600">Order Created</div>
                    <h1 className="mt-3 text-3xl font-black">Đặt hàng thành công</h1>
                    <p className="mt-3 text-slate-600">Shop đã ghi nhận đơn hàng của bạn. Bạn có thể theo dõi trạng thái đơn hàng sau khi đặt.</p>

                    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
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
                            <span className="font-bold text-red-600">{formatVnd(createdOrder.totalAmount)}</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link to="/" className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700">
                            Về trang chủ
                        </Link>
                        <Link to="/search" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Tiếp tục mua sắm
                        </Link>
                        <Link to="/orders" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                            Xem đơn hàng
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3 whitespace-nowrap font-black text-slate-900">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-400 text-white shadow-lg shadow-red-500/20">S</span>
                        <span className="text-xl">SmartZone Store</span>
                    </Link>

                    <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <ShoppingCartOutlined />
                        Giỏ hàng
                    </Link>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 font-bold text-red-700">{memberTag}</div>
                            <div>
                                <div className="text-xs text-slate-500">Thanh toán bởi</div>
                                <div className="font-bold text-slate-900">{memberName}</div>
                            </div>
                        </div>
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onLogout} type="button">
                            <LogoutOutlined />
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 text-left">
                    <div>
                        <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">Checkout</div>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Thanh toán đơn hàng</h1>
                        <p className="mt-2 text-slate-500">Kiểm tra thông tin nhận hàng và phương thức thanh toán trước khi đặt đơn.</p>
                    </div>
                    <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
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
                    <form onSubmit={submitOrder} className="rounded-[32px] border border-slate-200 bg-white p-6 text-left shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">Thông tin nhận hàng</h2>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Họ tên người nhận</span>
                                <input value={form.fullName} onChange={updateForm('fullName')} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white" placeholder="Nguyễn Văn A" />
                                {errors.fullName ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.fullName}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Số điện thoại</span>
                                <input value={form.phone} onChange={updateForm('phone')} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white" placeholder="0900000000" />
                                {errors.phone ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.phone}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-sm font-semibold text-slate-700">Địa chỉ nhận hàng</span>
                                <input value={form.address} onChange={updateForm('address')} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white" placeholder="Số nhà, đường, phường/xã, quận/huyện" />
                                {errors.address ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.address}</span> : null}
                            </label>

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">Tỉnh/thành phố</span>
                                <select value={form.city} onChange={updateForm('city')} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white">
                                    <option value="">Chọn tỉnh/thành phố</option>
                                    {VIETNAM_PROVINCES.map((province) => (
                                        <option key={province} value={province}>{province}</option>
                                    ))}
                                </select>
                                {errors.city ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.city}</span> : null}
                            </label>

                            <label className="block md:col-span-2">
                                <span className="text-sm font-semibold text-slate-700">Ghi chú</span>
                                <textarea value={form.note} onChange={updateForm('note')} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:bg-white" placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao..." />
                                {errors.note ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.note}</span> : null}
                            </label>
                        </div>

                        <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm text-slate-700">
                            <div className="font-bold text-slate-900">Phương thức thanh toán</div>

                            <label className="mt-4 flex cursor-pointer items-start gap-3">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="COD"
                                    checked={paymentMethod === 'COD'}
                                    onChange={() => setPaymentMethod('COD')}
                                    className="mt-1 accent-red-600"
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
                                    className="mt-1 accent-red-600"
                                />
                                <span>
                                    <span className="block font-bold text-slate-900">VNPay - Thanh toán online</span>
                                    <span className="mt-1 block text-slate-600">Bạn sẽ được chuyển sang cổng thanh toán VNPay sandbox.</span>
                                </span>
                            </label>
                        </div>
                    </form>

                    <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-5 text-left shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900">Tóm tắt đơn hàng</h2>

                        {loading ? (
                            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                                <LoadingOutlined className="mr-2" /> Đang tải giỏ hàng...
                            </div>
                        ) : items.length ? (
                            <>
                                <div className="mt-5 space-y-3">
                                    {items.map((item) => (
                                        <div key={item.cartItemId || item.productId} className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-3">
                                            <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-16 w-14 rounded-2xl object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-bold text-slate-900">{item.snapshot?.name}</div>
                                                <div className="mt-1 text-xs text-slate-500">SL: {item.quantity}</div>
                                                <div className="mt-1 text-sm font-semibold text-red-600">{formatVnd(item.lineTotal)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 border-t border-slate-200 pt-4">
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
                                        <span className="text-red-600">{formatVnd(subtotal)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={submitOrder}
                                    disabled={submitting || loading || !items.length}
                                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Đang xử lý...' : paymentMethod === 'VNPAY' ? 'Thanh toán qua VNPay' : 'Đặt hàng'}
                                </button>
                            </>
                        ) : (
                            <div className="mt-5 rounded-3xl border border-dashed border-orange-200 p-8 text-center">
                                <ShoppingCartOutlined className="text-3xl text-orange-500" />
                                <p className="mt-3 text-sm font-semibold text-slate-600">Giỏ hàng đang trống.</p>
                                <Link to="/search" className="mt-4 inline-flex rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                                    Chọn sản phẩm
                                </Link>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default CheckoutPage;
