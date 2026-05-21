import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { logoutUser } from '../redux/slices/authSlice';
import { clearCart, getCartCount, getCartItems, removeFromCart, updateCartQty } from '../util/cart';

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const CartPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [items, setItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);

    const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Member';

    const loadCart = () => {
        setItems(getCartItems());
        setCartCount(getCartCount());
    };

    useEffect(() => {
        loadCart();

        const onCartUpdated = () => loadCart();
        window.addEventListener('cart:updated', onCartUpdated);
        window.addEventListener('storage', onCartUpdated);

        return () => {
            window.removeEventListener('cart:updated', onCartUpdated);
            window.removeEventListener('storage', onCartUpdated);
        };
    }, []);

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const onChangeQty = (itemId, qty) => {
        updateCartQty(itemId, qty);
        loadCart();
    };

    const onRemove = (itemId) => {
        removeFromCart(itemId);
        loadCart();
    };

    const totalAmount = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0), [items]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
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
                                <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                                    <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 font-bold text-red-700">{memberName.charAt(0)}</div>
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
                <h1 className="text-left text-3xl font-black tracking-tight text-slate-900">Giỏ hàng sản phẩm công nghệ</h1>
                <p className="mt-2 text-left text-slate-500">Kiểm tra lại sản phẩm trước khi đặt hàng.</p>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
                    <section className="space-y-4">
                        {items.length ? items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                                <img src={item.image} alt={item.name} className="h-28 w-24 rounded-2xl object-cover" />
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{item.category}</div>
                                    <h2 className="mt-1 text-lg font-bold text-slate-900">{item.name}</h2>
                                    <p className="text-sm text-slate-500">{item.brand}</p>
                                    <div className="mt-2 font-semibold text-red-600">{formatVnd(item.price)}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.qty}
                                        onChange={(event) => onChangeQty(item.id, Number(event.target.value || 1))}
                                        className="w-20 rounded-2xl border border-slate-200 px-3 py-2"
                                    />
                                    <button type="button" onClick={() => onRemove(item.id)} className="rounded-2xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">Xóa</button>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
                                Giỏ hàng đang trống. <Link to="/search" className="font-semibold text-red-700">Xem sản phẩm ngay</Link>
                            </div>
                        )}
                    </section>

                    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-left">
                        <h2 className="text-xl font-bold text-slate-900">Tổng đơn</h2>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                            <span>Sản phẩm</span>
                            <span>{items.length}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                            <span>Tổng tiền</span>
                            <span>{formatVnd(totalAmount)}</span>
                        </div>
                        <button type="button" onClick={() => { clearCart(); loadCart(); }} disabled={!items.length} className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Xóa toàn bộ giỏ hàng</button>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default CartPage;
