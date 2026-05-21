import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { logoutUser } from '../redux/slices/authSlice';
import { getHomeArticlesApi, getHomeProductsApi } from '../util/api';
import { getCartCount } from '../util/cart';

const formatVnd = (value) => {
    return Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });
};

const decodeJwtPayload = (token) => {
    if (!token) return {};

    try {
        const payload = token.split('.')[1];
        if (!payload) return {};

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

        return JSON.parse(window.atob(padded));
    } catch {
        return {};
    }
};

const ProductSection = ({ code, title, subtitle, products, showSold = false }) => {
    return (
        <section className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">{code}</div>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">{title}</h2>
                </div>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                    <Link key={product.id || product.slug} to={`/product/${product.slug || product.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100/60">
                        <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                            {product.discount > 0 ? <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{product.discount}%</span> : null}
                        </div>
                        <div className="p-4 text-left">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.brand}</div>
                            <h3 className="mt-2 min-h-[56px] text-lg font-bold leading-7 text-slate-900">{product.name}</h3>
                            <div className="mt-3 text-lg font-black text-orange-600">{formatVnd(product.price)}</div>
                            <div className="text-sm text-slate-400 line-through">{formatVnd(product.oldPrice)}</div>
                            {showSold ? <div className="mt-2 text-sm font-semibold text-emerald-600">Đã bán: {product.sold}</div> : null}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

const ArticleSection = ({ articles, id }) => {
    return (
        <section id={id} className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">NEWS</div>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Tin tức mới nhất</h2>
                </div>
                <p className="text-sm text-slate-500">Bài viết công nghệ nổi bật, chia sẻ nhanh và dễ đọc</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {articles.map((article) => (
                    <Link key={article.slug} to={`/article/${article.slug}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100/60">
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                            <img src={article.coverImage} alt={article.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        </div>
                        <div className="p-4 text-left">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{article.category}</div>
                            <h3 className="mt-2 min-h-[56px] text-lg font-bold leading-7 text-slate-900">{article.title}</h3>
                            <p className="mt-2 line-clamp-3 text-sm text-slate-500">{article.summary}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

const StoreHomePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [sections, setSections] = useState({
        promotion: [],
        latest: [],
        bestseller: [],
    });
    const [articles, setArticles] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingArticles, setLoadingArticles] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            setLoadError('');

            try {
                const res = await getHomeProductsApi(8);
                if (res?.errCode === 0 && res?.data) {
                    setSections({
                        promotion: res.data.promotion || [],
                        latest: res.data.latest || [],
                        bestseller: res.data.bestseller || [],
                    });
                    return;
                }

                setLoadError(res?.errMessage || 'Không tải được danh sách sản phẩm.');
            } catch {
                setLoadError('Không thể kết nối đến API sản phẩm.');
            } finally {
                setLoadingProducts(false);
            }
        };

        const fetchArticles = async () => {
            setLoadingArticles(true);
            try {
                const res = await getHomeArticlesApi(4);
                if (res?.errCode === 0 && Array.isArray(res?.data)) {
                    setArticles(res.data);
                }
            } catch {
                setArticles([]);
            } finally {
                setLoadingArticles(false);
            }
        };

        fetchProducts();
        fetchArticles();
    }, []);

    useEffect(() => {
        const syncCartCount = () => setCartCount(getCartCount());
        syncCartCount();

        window.addEventListener('cart:updated', syncCartCount);
        window.addEventListener('storage', syncCartCount);

        return () => {
            window.removeEventListener('cart:updated', syncCartCount);
            window.removeEventListener('storage', syncCartCount);
        };
    }, []);

    const member = useMemo(() => {
        const fromLocalStorage = (() => {
            try {
                return JSON.parse(localStorage.getItem('authUser') || '{}');
            } catch {
                return {};
            }
        })();
        const fromToken = decodeJwtPayload(localStorage.getItem('accessToken'));

        return {
            firstName: user?.firstName || fromLocalStorage?.firstName || fromToken?.firstName || '',
            lastName: user?.lastName || fromLocalStorage?.lastName || fromToken?.lastName || '',
            email: user?.email || fromLocalStorage?.email || fromToken?.email || '',
            roleId: user?.roleId || fromLocalStorage?.roleId || fromToken?.roleId || '',
        };
    }, [user]);

    const memberName = `${member.firstName} ${member.lastName}`.trim();

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const onSubmitSearch = (event) => {
        event.preventDefault();
        if (searchValue.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
            return;
        }
        navigate('/search');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-xl font-black text-white shadow-lg shadow-orange-300/40">S</span>
                        <div className="text-left">
                            <div className="text-lg font-black text-slate-900">SmartZone Store</div>
                            <div className="text-xs uppercase tracking-[0.2em] text-orange-600">Tech Lifestyle</div>
                        </div>
                    </Link>

                    <form onSubmit={onSubmitSearch} className="order-3 flex h-12 w-full flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 shadow-sm lg:order-none lg:w-auto">
                        <SearchOutlined />
                        <input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder="Tìm kiếm điện thoại, laptop, tablet..."
                            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                    </form>

                    <Link to="/search" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Trang tìm kiếm
                    </Link>

                    <a href="#tin-tuc" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Tin tức
                    </a>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Link className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" to="/cart">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng ({cartCount})</span>
                        </Link>

                        {!isAuthenticated ? (
                            <>
                                <Link to="/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đăng nhập</Link>
                                <Link to="/register" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">Đăng ký</Link>
                            </>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-left">
                                    <p className="text-xs uppercase tracking-[0.18em] text-orange-700">Thành viên đăng nhập</p>
                                    <p className="text-sm font-bold text-slate-900">{memberName || member.email || 'Member'}</p>
                                    <p className="text-xs text-slate-500">Vai trò: {member.roleId || 'R2'}</p>
                                </div>

                                {member.roleId === 'R1' ? (
                                    <Link to="/management/users" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Quản lý người dùng</Link>
                                ) : null}
                                {member.roleId === 'R3' ? (
                                    <Link to="/moderator/users" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Quản lý kiểm duyệt</Link>
                                ) : null}
                                <button onClick={handleLogout} type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                                    Đăng xuất
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 p-8 text-white shadow-2xl shadow-orange-300/30 md:p-12">
                    <div className="relative z-10 max-w-3xl text-left">
                        <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Trang chủ bán sản phẩm công nghệ</span>
                        <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Deal to, hàng mới, bán chạy mỗi ngày</h1>
                        <p className="mt-4 text-base leading-8 text-white/90 md:text-lg">
                            {isAuthenticated
                                ? `Xin chào ${memberName || member.email || 'thành viên'}, ưu đãi hôm nay đã sẵn sàng cho bạn.`
                                : 'Đăng nhập để nhận giá thành viên, xem thông tin tài khoản và mua sắm nhanh hơn.'}
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <a href="#khuyen-mai" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-red-600 shadow-lg shadow-red-800/20 transition hover:scale-[1.02]">Xem khuyến mãi</a>
                            {!isAuthenticated ? (
                                <Link to="/login" className="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Đăng nhập ngay</Link>
                            ) : (
                                <Link to="/user/profile" className="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Hồ sơ cá nhân</Link>
                            )}
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.30),transparent_32%),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:auto,92px_92px,92px_92px] opacity-60" />
                </section>

                {loadingProducts ? (
                    <div className="mt-10 rounded-3xl border border-orange-100 bg-white p-6 text-sm font-semibold text-orange-700">
                        Đang tải dữ liệu sản phẩm từ MongoDB...
                    </div>
                ) : null}

                {loadError ? (
                    <div className="mt-10 rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
                        {loadError}
                    </div>
                ) : null}

                {!loadingProducts && !loadError ? (
                    <>
                        <div id="khuyen-mai">
                            <ProductSection
                                code="PROMOTION"
                                title="Khuyến mãi hot"
                                subtitle="Ưu đãi số lượng có hạn"
                                products={sections.promotion}
                            />
                        </div>

                        <ProductSection
                            code="LATEST"
                            title="Sản phẩm mới nhất"
                            subtitle="Vừa mở bán tại hệ thống"
                            products={sections.latest}
                        />

                        <ProductSection
                            code="BESTSELLER"
                            title="Bán chạy nhất"
                            subtitle="Top sản phẩm được chọn nhiều"
                            products={sections.bestseller}
                            showSold
                        />
                    </>
                ) : null}

                {loadingArticles ? (
                    <div className="mt-10 rounded-3xl border border-orange-100 bg-white p-6 text-sm font-semibold text-orange-700">
                        Đang tải bài viết mới nhất...
                    </div>
                ) : null}

                {!loadingArticles && articles.length ? <ArticleSection articles={articles} id="tin-tuc" /> : null}
            </main>
        </div>
    );
};

export default StoreHomePage;