import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftOutlined, LoadingOutlined, LogoutOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { logoutUser } from '../redux/slices/authSlice';
import { clearCart, fetchCart, getCartCount, getCartSnapshot, removeFromCart, updateCartQty } from '../util/cart';

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const recalculateCart = (snapshot) => {
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal ?? Number(item.snapshot?.price || item.unitPrice || 0) * Number(item.quantity || item.qty || 0)), 0);

    return {
        ...snapshot,
        items,
        totalItems,
        totalQuantity,
        subtotal,
    };
};

const CartPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [cart, setCart] = useState(() => getCartSnapshot());
    const [cartCount, setCartCount] = useState(() => getCartCount());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mutatingIds, setMutatingIds] = useState(() => new Set());

    const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Member';
    const items = Array.isArray(cart.items) ? cart.items : [];
    const totalAmount = useMemo(() => Number(cart.subtotal || 0), [cart.subtotal]);

    useEffect(() => {
        let isMounted = true;

        const syncFromCache = () => {
            const snapshot = getCartSnapshot();
            setCart(snapshot);
            setCartCount(snapshot.totalQuantity || 0);
        };

        const loadCart = async () => {
            setLoading(true);
            setError('');

            try {
                const snapshot = await fetchCart();
                if (!isMounted) return;
                setCart(snapshot);
                setCartCount(snapshot.totalQuantity || 0);
            } catch (err) {
                if (!isMounted) return;
                syncFromCache();
                setError(err?.errMessage || err?.message || (isAuthenticated ? 'Không thể tải giỏ hàng.' : 'Vui lòng đăng nhập để xem giỏ hàng.'));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadCart();

        const onCartUpdated = () => {
            if (!isMounted) return;
            syncFromCache();
        };

        window.addEventListener('cart:updated', onCartUpdated);
        window.addEventListener('storage', onCartUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener('cart:updated', onCartUpdated);
            window.removeEventListener('storage', onCartUpdated);
        };
    }, [isAuthenticated]);

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const setItemMutating = (productId, value) => {
        setMutatingIds((current) => {
            const next = new Set(current);
            if (value) {
                next.add(String(productId));
            } else {
                next.delete(String(productId));
            }
            return next;
        });
    };

    const updateItem = async (productId, nextQty) => {
        const itemKey = String(productId);
        if (mutatingIds.has(itemKey)) return;

        const previousCart = cart;
        const optimisticCart = recalculateCart({
            ...cart,
            items: items.map((item) => (
                String(item.productId) === itemKey
                    ? {
                        ...item,
                        quantity: nextQty,
                        qty: nextQty,
                        lineTotal: Number(item.snapshot?.price || item.unitPrice || 0) * nextQty,
                    }
                    : item
            )),
        });

        setCart(optimisticCart);
        setCartCount(optimisticCart.totalQuantity);
        setItemMutating(itemKey, true);
        setError('');

        try {
            const snapshot = await updateCartQty(productId, nextQty);
            setCart(snapshot);
            setCartCount(snapshot.totalQuantity || 0);
        } catch (err) {
            setCart(previousCart);
            setCartCount(previousCart.totalQuantity || 0);
            setError(err?.errMessage || err?.message || 'Không thể cập nhật số lượng.');
        } finally {
            setItemMutating(itemKey, false);
        }
    };

    const removeItem = async (productId) => {
        const itemKey = String(productId);
        if (mutatingIds.has(itemKey)) return;

        const previousCart = cart;
        const optimisticCart = recalculateCart({
            ...cart,
            items: items.filter((item) => String(item.productId) !== itemKey),
        });

        setCart(optimisticCart);
        setCartCount(optimisticCart.totalQuantity);
        setItemMutating(itemKey, true);
        setError('');

        try {
            const snapshot = await removeFromCart(productId);
            setCart(snapshot);
            setCartCount(snapshot.totalQuantity || 0);
        } catch (err) {
            setCart(previousCart);
            setCartCount(previousCart.totalQuantity || 0);
            setError(err?.errMessage || err?.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.');
        } finally {
            setItemMutating(itemKey, false);
        }
    };

    const clearAll = async () => {
        if (!items.length) return;

        const previousCart = cart;
        const optimisticCart = recalculateCart({
            ...cart,
            items: [],
        });

        setCart(optimisticCart);
        setCartCount(0);
        setError('');

        try {
            const snapshot = await clearCart();
            setCart(snapshot);
            setCartCount(snapshot.totalQuantity || 0);
        } catch (err) {
            setCart(previousCart);
            setCartCount(previousCart.totalQuantity || 0);
            setError(err?.errMessage || err?.message || 'Không thể xóa toàn bộ giỏ hàng.');
        }
    };

    const memberTag = memberName.charAt(0).toUpperCase() || 'M';

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3 whitespace-nowrap font-black text-slate-900">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-400 text-white shadow-lg shadow-red-500/20">S</span>
                        <span className="text-xl">SmartZone Store</span>
                    </Link>

                    <Link to="/search" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Trang tìm kiếm
                    </Link>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Link className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" to="/cart">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng ({cartCount})</span>
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                    <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 font-bold text-red-700">{memberTag}</div>
                                    <div>
                                        <div className="text-xs text-slate-500">Chào bạn,</div>
                                        <div className="font-bold text-slate-900">{memberName}</div>
                                    </div>
                                </div>
                                <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onLogout} type="button">
                                    <LogoutOutlined />
                                    <span>Đăng xuất</span>
                                </button>
                            </>
                        ) : (
                            <Link className="inline-flex items-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700" to="/login">
                                Đăng nhập
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 text-left">
                    <div>
                        <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">Shopping Cart</div>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Giỏ hàng của bạn</h1>
                        <p className="mt-2 text-slate-500">Quản lý số lượng, kiểm tra tồn kho và giữ dữ liệu đồng bộ với backend.</p>
                    </div>
                    <Link to="/search" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        <ArrowLeftOutlined />
                        Tiếp tục mua sắm
                    </Link>
                </div>

                {error ? (
                    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 shadow-sm">
                        {error}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                    <section className="space-y-4">
                        {loading ? (
                            <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                                <LoadingOutlined className="mr-2" /> Đang tải giỏ hàng...
                            </div>
                        ) : items.length ? items.map((item) => {
                            const itemKey = String(item.productId);
                            const isMutating = mutatingIds.has(itemKey);
                            const stock = item.availability?.stock;
                            const remaining = item.availability?.remainingToIncrease;
                            const canIncrease = item.availability?.canIncrease;

                            return (
                                <div key={item.id || item.cartItemId || itemKey} className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                                    <img src={item.snapshot?.image} alt={item.snapshot?.name} className="h-28 w-24 rounded-2xl object-cover" />
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{item.snapshot?.brand}</div>
                                        <h2 className="mt-1 text-lg font-bold text-slate-900">{item.snapshot?.name}</h2>
                                        <p className="text-sm text-slate-500">Giá lưu tại thời điểm thêm vào giỏ</p>
                                        <div className="mt-2 font-semibold text-red-600">{formatVnd(item.snapshot?.price)}</div>
                                        <div className="mt-2 text-sm text-slate-500">
                                            {stock === null || stock === undefined
                                                ? 'Sản phẩm đã ngừng kinh doanh'
                                                : remaining > 0
                                                    ? `Chỉ còn ${remaining} sản phẩm`
                                                    : 'Đã đạt giới hạn tồn kho'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-start gap-3 md:items-end">
                                        <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            <button
                                                type="button"
                                                disabled={isMutating || item.quantity <= 1}
                                                onClick={() => updateItem(itemKey, Math.max(1, Number(item.quantity || 1) - 1))}
                                                className="grid h-11 w-11 place-items-center text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Giảm số lượng"
                                            >
                                                <MinusOutlined />
                                            </button>
                                            <div className="min-w-16 px-4 text-center text-sm font-bold text-slate-900">
                                                {item.quantity}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isMutating || !canIncrease}
                                                onClick={() => updateItem(itemKey, Number(item.quantity || 0) + 1)}
                                                className="grid h-11 w-11 place-items-center text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Tăng số lượng"
                                            >
                                                <PlusOutlined />
                                            </button>
                                        </div>

                                        <div className="text-sm font-semibold text-slate-900">{formatVnd(Number(item.snapshot?.price || 0) * Number(item.quantity || 0))}</div>

                                        <button
                                            type="button"
                                            onClick={() => removeItem(itemKey)}
                                            disabled={isMutating}
                                            className="rounded-2xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="rounded-[32px] border border-dashed border-orange-200 bg-white px-6 py-16 text-center shadow-sm">
                                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-50 text-3xl text-orange-500">
                                    <ShoppingCartOutlined />
                                </div>
                                <h2 className="mt-5 text-2xl font-black text-slate-900">Giỏ hàng trống</h2>
                                <p className="mt-3 text-slate-500">Chưa có sản phẩm nào trong giỏ. Hãy khám phá những sản phẩm phù hợp ngay bây giờ.</p>
                                <div className="mt-6">
                                    <Link to="/search" className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700">
                                        Tiếp tục mua sắm
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm text-left">
                        <h2 className="text-xl font-bold text-slate-900">Tổng đơn</h2>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                            <span>Sản phẩm</span>
                            <span>{cart.totalItems || items.length}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                            <span>Tổng số lượng</span>
                            <span>{cart.totalQuantity || 0}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                            <span>Tổng tiền</span>
                            <span>{formatVnd(totalAmount)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={clearAll}
                            disabled={!items.length || loading}
                            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Xóa toàn bộ giỏ hàng
                        </button>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default CartPage;
