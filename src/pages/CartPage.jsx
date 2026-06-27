import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeftOutlined, LoadingOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { clearCart, fetchCart, getCartSnapshot, removeFromCart, updateCartQty } from '../util/cart';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

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
    const { isAuthenticated } = useSelector((state) => state.auth);
    const [cart, setCart] = useState(() => getCartSnapshot());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mutatingIds, setMutatingIds] = useState(() => new Set());
    const [selectedProductIds, setSelectedProductIds] = useState(() => new Set());

    const items = Array.isArray(cart.items) ? cart.items : [];

    // Automatically select all items in the cart on first load when items are retrieved
    const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
    useEffect(() => {
        if (items.length > 0 && !hasInitializedSelection) {
            setSelectedProductIds(new Set(items.map(item => String(item.productId))));
            setHasInitializedSelection(true);
        }
    }, [items, hasInitializedSelection]);

    // Keep selection synced when items are removed
    useEffect(() => {
        if (items.length > 0) {
            const currentItemIds = new Set(items.map(item => String(item.productId)));
            setSelectedProductIds((prev) => {
                const next = new Set(prev);
                let changed = false;
                for (const id of next) {
                    if (!currentItemIds.has(id)) {
                        next.delete(id);
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        } else {
            setSelectedProductIds(new Set());
        }
    }, [items]);

    const selectedItems = useMemo(() => {
        return items.filter((item) => selectedProductIds.has(String(item.productId)));
    }, [items, selectedProductIds]);

    const selectedTotalAmount = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + Number(item.snapshot?.price || item.unitPrice || 0) * Number(item.quantity || item.qty || 0), 0);
    }, [selectedItems]);

    const selectedTotalQuantity = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + Number(item.quantity || item.qty || 0), 0);
    }, [selectedItems]);

    const totalAmount = selectedTotalAmount;

    const toggleSelectProduct = (productId) => {
        const idStr = String(productId);
        setSelectedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(idStr)) {
                next.delete(idStr);
            } else {
                next.add(idStr);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        const allSelected = items.length > 0 && items.every((item) => selectedProductIds.has(String(item.productId)));
        if (allSelected) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(items.map((item) => String(item.productId))));
        }
    };

    useEffect(() => {
        let isMounted = true;

        const syncFromCache = () => {
            const snapshot = getCartSnapshot();
            setCart(snapshot);
        };

        const loadCart = async () => {
            setLoading(true);
            setError('');

            try {
                const snapshot = await fetchCart();
                if (!isMounted) return;
                setCart(snapshot);
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
        setItemMutating(itemKey, true);
        setError('');

        try {
            const snapshot = await updateCartQty(productId, nextQty);
            setCart(snapshot);
        } catch (err) {
            setCart(previousCart);
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
        setItemMutating(itemKey, true);
        setError('');

        try {
            const snapshot = await removeFromCart(productId);
            setCart(snapshot);
        } catch (err) {
            setCart(previousCart);
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
        setError('');

        try {
            const snapshot = await clearCart();
            setCart(snapshot);
        } catch (err) {
            setCart(previousCart);
            setError(err?.errMessage || err?.message || 'Không thể xóa toàn bộ giỏ hàng.');
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-dark">
            <Header />

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* Breadcrumbs / Page Heading - 101:1501 */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-left mb-6">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-brand-red font-sans">Shopping Cart</div>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-dark leading-none">Giỏ hàng của bạn</h1>
                        <p className="mt-2 text-sm text-brand-gray">Quản lý số lượng, kiểm tra tồn kho và đồng bộ giỏ hàng.</p>
                    </div>
                </div>

                {error ? (
                    <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 shadow-sm text-left">
                        {error}
                    </div>
                ) : null}

                {/* Main Content Layout Container - 101:1510 */}
                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
                    
                    {/* Left Column: Product List Area - 101:1511 */}
                    <section className="space-y-4">
                        {loading ? (
                            <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                                <LoadingOutlined className="mr-2" /> Đang tải giỏ hàng...
                            </div>
                        ) : items.length ? (
                            <>
                                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm text-left">
                                    <input
                                        type="checkbox"
                                        checked={items.length > 0 && items.every((item) => selectedProductIds.has(String(item.productId)))}
                                        onChange={toggleSelectAll}
                                        className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red cursor-pointer"
                                        id="select-all-cart"
                                    />
                                    <label htmlFor="select-all-cart" className="text-sm font-bold text-slate-700 select-none cursor-pointer">
                                        Chọn tất cả ({items.length} sản phẩm)
                                    </label>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {items.map((item) => {
                                        const itemKey = String(item.productId);
                                        const isMutating = mutatingIds.has(itemKey);
                                        const stock = item.availability?.stock;
                                        const remaining = item.availability?.remainingToIncrease;
                                        const canIncrease = item.availability?.canIncrease;

                                        return (
                                            <div key={item.id || item.cartItemId || itemKey} className="flex flex-row gap-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm items-center">
                                                {/* Checkbox selection */}
                                                <div className="flex items-center justify-center flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProductIds.has(itemKey)}
                                                        onChange={() => toggleSelectProduct(itemKey)}
                                                        className="h-5 w-5 rounded border-slate-300 text-brand-red focus:ring-brand-red cursor-pointer"
                                                    />
                                                </div>

                                                {/* Thumbnail Image - 101:1513 */}
                                                <div className="h-24 w-24 md:h-28 md:w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
                                                    <img src={item.snapshot?.image} alt={item.snapshot?.name} className="max-h-full max-w-full object-contain" />
                                                </div>
                                                
                                                {/* Details & Controls Area */}
                                                <div className="flex-1 text-left min-w-0 flex flex-col gap-2">
                                                    {/* Brand & Product Name */}
                                                    <div>
                                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">{item.snapshot?.brand}</span>
                                                        <h2 className="mt-0.5 text-base md:text-lg font-bold text-slate-900 leading-snug break-words">{item.snapshot?.name}</h2>
                                                    </div>

                                                    {/* Specs: Color, Capacity, Price */}
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-slate-500">
                                                        <div className="text-sm md:text-base font-bold text-brand-red mr-1">{formatVnd(item.snapshot?.price)}</div>
                                                        
                                                        {item.snapshot?.color && (
                                                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 border border-slate-200/60 shadow-sm">
                                                                Màu: {item.snapshot.color}
                                                            </span>
                                                        )}
                                                        {item.snapshot?.capacity && (
                                                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 border border-slate-200/60 shadow-sm">
                                                                Dung lượng: {item.snapshot.capacity}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Stock status */}
                                                    <div className="text-xs text-slate-400 font-semibold">
                                                        {stock === null || stock === undefined
                                                            ? 'Sản phẩm đã ngừng kinh doanh'
                                                            : remaining > 0
                                                                ? `Chỉ còn lại ${remaining} sản phẩm trong kho`
                                                                : 'Đã đạt giới hạn tồn kho'}
                                                    </div>

                                                    {/* Quantity, Total Price & Delete Action */}
                                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 mt-1">
                                                        {/* Quantity Stepper */}
                                                        <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                            <button
                                                                type="button"
                                                                disabled={isMutating || item.quantity <= 1}
                                                                onClick={() => updateItem(itemKey, Math.max(1, Number(item.quantity || 1) - 1))}
                                                                className="grid h-9 w-9 place-items-center text-brand-dark transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 font-bold"
                                                                aria-label="Giảm số lượng"
                                                            >
                                                                <MinusOutlined />
                                                            </button>
                                                            <span className="min-w-[32px] px-1 text-center text-sm font-black text-slate-800">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={isMutating || !canIncrease}
                                                                onClick={() => updateItem(itemKey, Number(item.quantity || 0) + 1)}
                                                                className="grid h-9 w-9 place-items-center text-brand-dark transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 font-bold"
                                                                aria-label="Tăng số lượng"
                                                            >
                                                                <PlusOutlined />
                                                            </button>
                                                        </div>

                                                        {/* Total line item price */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-slate-400">Tạm tính:</span>
                                                            <div className="text-base font-black text-brand-red">
                                                                {formatVnd(Number(item.snapshot?.price || 0) * Number(item.quantity || 0))}
                                                            </div>
                                                        </div>

                                                        {/* Delete button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(itemKey)}
                                                            disabled={isMutating}
                                                            className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-100 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Continue Shopping - 101:1586 */}
                                <div className="mt-4 flex justify-start">
                                    <Link to="/search" className="inline-flex items-center gap-2 text-sm font-black text-brand-red hover:underline transition">
                                        &larr; Tiếp tục mua sắm
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-red/5 text-3xl text-brand-red">
                                    <ShoppingCartOutlined />
                                </div>
                                <h2 className="mt-5 text-2xl font-black text-brand-dark font-sans">Giỏ hàng trống</h2>
                                <p className="mt-3 text-sm text-brand-gray">Chưa có sản phẩm nào trong giỏ. Hãy khám phá những sản phẩm phù hợp ngay bây giờ.</p>
                                <div className="mt-6">
                                    <Link to="/search" className="inline-flex items-center justify-center rounded-2xl bg-brand-red px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-red/20 transition hover:bg-[#a0101d]">
                                        Mua sắm ngay
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Right Column: Summary Sidebar - 101:1590 */}
                    <aside className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm text-left flex flex-col gap-5">
                        <h2 className="text-xl font-black text-brand-dark font-sans border-b border-slate-100 pb-3">Tóm tắt đơn hàng</h2>
                        
                        <div className="flex flex-col gap-3 text-sm font-bold text-slate-500">
                            <div className="flex items-center justify-between">
                                <span>Sản phẩm được chọn</span>
                                <span className="text-slate-800">{selectedItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Tổng số lượng</span>
                                <span className="text-slate-800">{selectedTotalQuantity}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Tạm tính</span>
                                <span className="text-slate-800">{formatVnd(selectedTotalAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Phí vận chuyển</span>
                                <span className="text-emerald-600 font-bold">Miễn phí</span>
                            </div>
                        </div>

                        {/* Voucher Input - 101:1610 */}
                        <div className="border-t border-slate-100 pt-5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Mã giảm giá (Voucher)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nhập mã ưu đãi..."
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-red placeholder:text-slate-400 font-semibold"
                                />
                                <button
                                    type="button"
                                    className="rounded-xl border border-brand-red bg-brand-red/5 px-4 py-2 text-xs font-bold text-brand-red transition hover:bg-brand-red/10"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>

                        {/* Total pricing with big red button - 101:1627 */}
                        <div className="border-t border-slate-100 pt-5">
                            <div className="flex items-baseline justify-between mb-4">
                                <span className="text-base font-bold text-slate-800">Tổng cộng</span>
                                <span className="text-2xl font-black text-brand-red">{formatVnd(selectedTotalAmount)}</span>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedItems.length === 0) return;
                                    navigate('/checkout', { state: { productIds: selectedItems.map(item => String(item.productId)) } });
                                }}
                                disabled={selectedItems.length === 0 || loading}
                                className={`inline-flex w-full items-center justify-center rounded-2xl py-3.5 font-bold shadow-lg transition ${
                                    selectedItems.length && !loading
                                        ? 'bg-brand-red text-white shadow-brand-red/20 hover:bg-[#a0101d] cursor-pointer'
                                        : 'pointer-events-none bg-slate-200 text-slate-450 shadow-none'
                                }`}
                            >
                                TIẾN HÀNH THANH TOÁN
                            </button>

                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={!items.length || loading}
                                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Xóa toàn bộ giỏ hàng
                            </button>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CartPage;
