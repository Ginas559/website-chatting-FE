import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LogoutOutlined, SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { logoutUser } from '../redux/slices/authSlice';
import { getProductCategoriesApi, searchProductsApi } from '../util/api';
import { getCartCount } from '../util/cart';

const priceRanges = [
    { label: '0đ - 500.000đ', minPrice: 0, maxPrice: 500000 },
    { label: '500.000đ - 1.000.000đ', minPrice: 500000, maxPrice: 1000000 },
    { label: '1.000.000đ - 2.000.000đ', minPrice: 1000000, maxPrice: 2000000 },
    { label: '2.000.000đ - 3.000.000đ', minPrice: 2000000, maxPrice: 3000000 },
    { label: '3.000.000đ+', minPrice: 3000000, maxPrice: '' },
];

const ratingOptions = [5, 4, 3];

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const getFiltersFromSearchParams = (params) => ({
    q: params.get('q') || '',
    categoryIds: params.get('categoryIds')?.split(',').filter(Boolean) || [],
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    minRating: params.get('minRating') || '',
    inStock: params.get('inStock') === 'true',
    sort: params.get('sort') || 'latest',
});

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
    const [cartCount, setCartCount] = useState(0);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    const searchParamsString = searchParams.toString();
    const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParamsString]);

    useEffect(() => {
        setSearchValue(filters.q || '');
    }, [filters.q]);

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

    const updateSearchParams = (updates) => {
        const nextParams = new URLSearchParams(searchParams);

        Object.entries(updates).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length) {
                    nextParams.set(key, value.join(','));
                } else {
                    nextParams.delete(key);
                }
                return;
            }

            if (value === undefined || value === null || value === '') {
                nextParams.delete(key);
                return;
            }

            nextParams.set(key, String(value));
        });

        if (nextParams.toString() !== searchParamsString) {
            setSearchParams(nextParams, { replace: true });
        }
    };

    useEffect(() => {
        const loadCategories = async () => {
            const res = await getProductCategoriesApi();
            if (res?.errCode === 0 && Array.isArray(res?.data)) {
                setCategories(res.data);
            } else {
                setCategories([]);
            }
        };

        loadCategories();
    }, []);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);

            const params = {
                q: filters.q || undefined,
                categoryIds: filters.categoryIds.length ? filters.categoryIds.join(',') : undefined,
                minPrice: filters.minPrice || undefined,
                maxPrice: filters.maxPrice || undefined,
                minRating: filters.minRating || undefined,
                inStock: filters.inStock ? 'true' : undefined,
                sort: filters.sort,
            };

            const res = await searchProductsApi(params);
            if (res?.errCode === 0 && Array.isArray(res?.data)) {
                setProducts(res.data);
            } else {
                setProducts([]);
            }

            setLoading(false);
        };

        loadProducts();
    }, [searchParamsString]);

    const selectedCategories = useMemo(() => new Set(filters.categoryIds), [filters.categoryIds]);

    const onToggleCategory = (categoryName) => {
        const exists = filters.categoryIds.includes(categoryName);
        const nextCategoryIds = exists
            ? filters.categoryIds.filter((name) => name !== categoryName)
            : [...filters.categoryIds, categoryName];

        updateSearchParams({ categoryIds: nextCategoryIds });
    };

    const onSubmitSearch = (event) => {
        event.preventDefault();
        updateSearchParams({ q: searchValue.trim() });
    };

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const memberName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Member';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3 whitespace-nowrap font-black text-slate-900">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-400 text-white shadow-lg shadow-red-500/20">S</span>
                        <span className="text-xl">SmartZone Store</span>
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

                    <Link to="/" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Tin tức
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
                <div className="mb-6 text-left">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Kết quả tìm kiếm cho: "{filters.q || 'Tất cả'}"</h1>
                    <p className="mt-2 text-slate-500">Tìm thấy {products.length} sản phẩm</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="min-w-0 space-y-4 text-left">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900">Khoảng giá</h3>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Từ</span>
                                    <input
                                        value={filters.minPrice}
                                        onChange={(e) => updateSearchParams({ minPrice: e.target.value })}
                                        inputMode="numeric"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500 focus:bg-white"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Đến</span>
                                    <input
                                        value={filters.maxPrice}
                                        onChange={(e) => updateSearchParams({ maxPrice: e.target.value })}
                                        inputMode="numeric"
                                        placeholder="3000000"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500 focus:bg-white"
                                    />
                                </label>
                            </div>
                            <div className="mt-3 text-xs text-slate-500">{filters.minPrice || 0}đ - {filters.maxPrice || '3.000.000'}đ</div>
                            <div className="mt-3 space-y-2">
                                {priceRanges.map((range) => (
                                    <label key={range.label} className="flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-slate-700">
                                        <input
                                            type="radio"
                                            checked={filters.minPrice === String(range.minPrice) && String(filters.maxPrice) === String(range.maxPrice)}
                                            onChange={() => updateSearchParams({ minPrice: String(range.minPrice), maxPrice: String(range.maxPrice) })}
                                            className="accent-red-600"
                                        />
                                        <span>{range.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900">Thể loại</h3>
                            <div className="mt-4 space-y-2">
                                {categories.map((category) => (
                                    <label key={category} className="flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-slate-700">
                                        <input type="checkbox" checked={selectedCategories.has(category)} onChange={() => onToggleCategory(category)} className="accent-red-600" />
                                        <span>{category}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900">Đánh giá</h3>
                            <div className="mt-4 space-y-2">
                                {ratingOptions.map((rating) => (
                                    <label key={rating} className="flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-slate-700">
                                        <input type="radio" checked={filters.minRating === String(rating)} onChange={() => updateSearchParams({ minRating: String(rating) })} className="accent-red-600" />
                                        <span>{'★'.repeat(rating)} trở lên</span>
                                    </label>
                                ))}
                                <label className="flex items-center gap-3 rounded-2xl px-1 py-1 text-sm text-slate-700">
                                    <input type="radio" checked={filters.minRating === ''} onChange={() => updateSearchParams({ minRating: '' })} className="accent-red-600" />
                                    <span>Tất cả</span>
                                </label>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900">Tình trạng</h3>
                            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                                <input type="checkbox" checked={filters.inStock} onChange={() => updateSearchParams({ inStock: !filters.inStock ? 'true' : '' })} className="accent-red-600" />
                                <span>Chỉ hiển thị sản phẩm còn hàng</span>
                            </label>
                        </div>
                    </aside>

                    <section className="min-w-0">
                        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                            <span className="font-semibold text-slate-700">{loading ? 'Đang tải...' : 'Sắp xếp'}</span>
                            <select value={filters.sort} onChange={(e) => updateSearchParams({ sort: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500 focus:bg-white xl:w-auto">
                                <option value="latest">Mới nhất</option>
                                <option value="popular">Bán chạy</option>
                                <option value="price-asc">Giá tăng dần</option>
                                <option value="price-desc">Giá giảm dần</option>
                                <option value="rating">Đánh giá cao</option>
                            </select>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {products.map((product) => (
                                <Link key={product.id} to={`/product/${product.slug || product.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                                        <img src={product.images?.[0] || product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                        {product.discount ? <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">Mới</span> : null}
                                        {product.discount ? <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{product.discount}%</span> : null}
                                    </div>
                                    <div className="p-4 text-left">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{product.category}</div>
                                        <h3 className="mt-2 text-lg font-bold text-slate-900">{product.name}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
                                        <div className="mt-2 text-sm font-semibold text-amber-500">{Number(product.rating || 0).toFixed(1)} / 5.0</div>
                                        <div className="mt-4 flex items-end justify-between gap-3">
                                            <div>
                                                <div className="text-lg font-black text-red-600">{formatVnd(product.price)}</div>
                                                <div className="text-sm text-slate-400 line-through">{formatVnd(product.oldPrice)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
