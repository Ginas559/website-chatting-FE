import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HeartFilled, HeartOutlined, LoadingOutlined } from '@ant-design/icons';
import { getProductCategoriesApi, searchProductsApi } from '../util/api';
import useFavorites from '../hooks/useFavorites';
import { getProductId } from '../util/productId';
import StatusAlert from '../components/common/StatusAlert';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const priceRanges = [
    { label: '0đ - 2.000.000đ', minPrice: 0, maxPrice: 2000000 },
    { label: '2.000.000đ - 5.000.000đ', minPrice: 2000000, maxPrice: 5000000 },
    { label: '5.000.000đ - 10.000.000đ', minPrice: 2000000, maxPrice: 5000000 },
    { label: '10.000.000đ - 20.000.000đ', minPrice: 10000000, maxPrice: 20000000 },
    { label: '20.000.000đ - 40.000.000đ', minPrice: 20000000, maxPrice: 40000000 },
    { label: '40.000.000đ - 60.000.000đ', minPrice: 40000000, maxPrice: 60000000 },
    { label: '60.000.000đ+', minPrice: 60000000, maxPrice: '' },
];

const ratingOptions = [5, 4, 3];
const PAGE_SIZE = 12;

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const getFiltersFromSearchParams = (params) => {
    const categoryQuery = params.get('category');
    let categoryIds = params.get('categoryIds')?.split(',').filter(Boolean) || [];
    if (categoryQuery && !categoryIds.includes(categoryQuery)) {
        categoryIds = [categoryQuery, ...categoryIds];
    }
    return {
        q: params.get('q') || '',
        categoryIds,
        minPrice: params.get('minPrice') || '',
        maxPrice: params.get('maxPrice') || '',
        minRating: params.get('minRating') || '',
        inStock: params.get('inStock') === 'true',
        sort: params.get('sort') || 'latest',
    };
};

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

    const searchParamsString = searchParams.toString();
    const loadMoreRef = useRef(null);
    const isFetchingRef = useRef(false);
    const loadMoreLockRef = useRef(false);
    const activeQueryRef = useRef(searchParamsString);

    const navigate = useNavigate();
    const { isFavorite, toggleFavorite, loadingMap } = useFavorites();
    const [favoriteNotice, setFavoriteNotice] = useState(null);

    const filters = useMemo(() => getFiltersFromSearchParams(searchParams), [searchParamsString]);

    useEffect(() => {
        setSearchValue(filters.q || '');
    }, [filters.q]);

    useEffect(() => {
        setProducts([]);
        setTotalProducts(0);
        setHasMore(true);
        setPage(1);
        loadMoreLockRef.current = false;
    }, [searchParamsString]);

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

    const clearFilters = () => {
        setSearchParams(new URLSearchParams(), { replace: true });
        setSearchValue('');
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
        let isCancelled = false;

        const loadProducts = async () => {
            const isQueryChanged = activeQueryRef.current !== searchParamsString;

            if (isQueryChanged && page !== 1) {
                activeQueryRef.current = searchParamsString;
                setProducts([]);
                setTotalProducts(0);
                setHasMore(true);
                setPage(1);
                loadMoreLockRef.current = false;
                return;
            }

            activeQueryRef.current = searchParamsString;

            const isFirstPage = page === 1;

            setLoading(isFirstPage);
            setLoadingMore(!isFirstPage);
            isFetchingRef.current = true;

            const params = {
                q: filters.q || undefined,
                categoryIds: filters.categoryIds.length ? filters.categoryIds.join(',') : undefined,
                minPrice: filters.minPrice || undefined,
                maxPrice: filters.maxPrice || undefined,
                minRating: filters.minRating || undefined,
                inStock: filters.inStock ? 'true' : undefined,
                sort: filters.sort,
                page,
                limit: PAGE_SIZE,
            };

            const res = await searchProductsApi(params);
            if (isCancelled) {
                return;
            }

            if (res?.errCode === 0 && res?.data) {
                const items = Array.isArray(res.data.items) ? res.data.items : [];
                const total = Number(res.data.total ?? items.length);
                const nextHasMore = typeof res.data.hasMore === 'boolean' ? res.data.hasMore : page * PAGE_SIZE < total;

                setProducts((currentProducts) => (page === 1 ? items : [...currentProducts, ...items]));
                setTotalProducts(total);
                setHasMore(nextHasMore);
            } else if (page === 1) {
                setProducts([]);
                setTotalProducts(0);
                setHasMore(false);
            }

            setLoading(false);
            setLoadingMore(false);
            isFetchingRef.current = false;
            loadMoreLockRef.current = false;
        };

        loadProducts();

        return () => {
            isCancelled = true;
            isFetchingRef.current = false;
        };
    }, [searchParamsString, page]);

    useEffect(() => {
        let isCancelled = false;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (
                    entry.isIntersecting &&
                    hasMore &&
                    !loading &&
                    !loadingMore &&
                    !isFetchingRef.current &&
                    !loadMoreLockRef.current
                ) {
                    loadMoreLockRef.current = true;
                    if (!isCancelled) {
                        setPage((currentPage) => currentPage + 1);
                    }
                }
            },
            {
                root: null,
                rootMargin: '320px',
                threshold: 0,
            },
        );

        const target = loadMoreRef.current;
        if (target) {
            observer.observe(target);
        }

        return () => {
            isCancelled = true;
            observer.disconnect();
        };
    }, [hasMore, loading, loadingMore, products.length]);

    const selectedCategories = useMemo(() => new Set(filters.categoryIds), [filters.categoryIds]);

    const onToggleCategory = (categoryName) => {
        const exists = filters.categoryIds.includes(categoryName);
        const nextCategoryIds = exists
            ? filters.categoryIds.filter((name) => name !== categoryName)
            : [...filters.categoryIds, categoryName];

        updateSearchParams({ categoryIds: nextCategoryIds });
    };

    const onToggleFavorite = async (event, product) => {
        event.preventDefault();
        event.stopPropagation();
        const result = await toggleFavorite(product, () => navigate('/login'));
        if (!result?.error) {
            return;
        }
        if (result.error === 'LOGIN_REQUIRED') {
            return;
        }
        setFavoriteNotice({ type: 'error', message: result.error });
        window.setTimeout(() => setFavoriteNotice(null), 3000);
    };

    return (
        <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
                {favoriteNotice ? (
                    <div className="mb-6">
                        <StatusAlert type={favoriteNotice.type}>{favoriteNotice.message}</StatusAlert>
                    </div>
                ) : null}

                {/* Hero / Header Section */}
                <div className="mb-8 text-left bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl -z-10" />
                    <h1 className="text-3xl font-black tracking-tight text-[#1a1c1c] md:text-4xl font-sans break-words break-all">
                        Kết quả tìm kiếm cho: <span className="text-brand-red">"{filters.q || 'Tất cả'}"</span>
                    </h1>
                    <p className="mt-2 text-slate-500 text-sm font-semibold">
                        {loading && products.length === 0 ? 'Đang quét sản phẩm...' : `Đã tìm thấy ${totalProducts} sản phẩm chất lượng`}
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* Left Sidebar Filters */}
                    <aside className="min-w-0 space-y-5 text-left">
                        {/* Price Range Filter */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                                <h3 className="text-base font-black text-[#1a1c1c] uppercase tracking-wider font-sans">Khoảng giá</h3>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="rounded-full border border-brand-red/20 bg-brand-red/5 px-3 py-1.5 text-xs font-bold text-brand-red transition hover:bg-brand-red/10"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Từ (đ)</span>
                                    <input
                                        value={filters.minPrice}
                                        onChange={(e) => updateSearchParams({ minPrice: e.target.value })}
                                        inputMode="numeric"
                                        placeholder="0"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Đến (đ)</span>
                                    <input
                                        value={filters.maxPrice}
                                        onChange={(e) => updateSearchParams({ maxPrice: e.target.value })}
                                        inputMode="numeric"
                                        placeholder="60.000.000"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-red focus:bg-white"
                                    />
                                </label>
                            </div>
                            <div className="mt-3 text-xs font-bold text-brand-red">
                                {(filters.minPrice ? Number(filters.minPrice).toLocaleString('vi-VN') : '0')}đ &rarr; {filters.maxPrice ? `${Number(filters.maxPrice).toLocaleString('vi-VN')}đ` : '60.000.000đ+'}
                            </div>
                            <div className="mt-4 space-y-2.5">
                                {priceRanges.map((range) => {
                                    const isActive = filters.minPrice === String(range.minPrice) && String(filters.maxPrice) === String(range.maxPrice);
                                    return (
                                        <label key={range.label} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 cursor-pointer transition ${isActive ? 'bg-brand-red/5 font-bold text-brand-red' : 'hover:bg-slate-50'}`}>
                                            <input
                                                type="radio"
                                                checked={isActive}
                                                onChange={() => updateSearchParams({ minPrice: String(range.minPrice), maxPrice: String(range.maxPrice) })}
                                                className="accent-brand-red w-4 h-4"
                                            />
                                            <span>{range.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Categories Filter */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-black text-[#1a1c1c] uppercase tracking-wider font-sans border-b border-slate-100 pb-4 mb-4">Danh mục</h3>
                            <div className="space-y-2.5">
                                {categories.map((category) => {
                                    const isSelected = selectedCategories.has(category);
                                    return (
                                        <label key={category} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 cursor-pointer transition ${isSelected ? 'bg-brand-red/5 font-bold text-brand-red' : 'hover:bg-slate-50'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => onToggleCategory(category)} 
                                                className="accent-brand-red w-4 h-4 rounded" 
                                            />
                                            <span>{category}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Rating Filter */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-black text-[#1a1c1c] uppercase tracking-wider font-sans border-b border-slate-100 pb-4 mb-4">Đánh giá</h3>
                            <div className="space-y-2.5">
                                {ratingOptions.map((rating) => {
                                    const isActive = filters.minRating === String(rating);
                                    return (
                                        <label key={rating} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 cursor-pointer transition ${isActive ? 'bg-brand-red/5 font-bold text-brand-red' : 'hover:bg-slate-50'}`}>
                                            <input 
                                                type="radio" 
                                                checked={isActive} 
                                                onChange={() => updateSearchParams({ minRating: String(rating) })} 
                                                className="accent-brand-red w-4 h-4" 
                                            />
                                            <span className="text-amber-500 font-bold">
                                                {'★'.repeat(rating)}
                                                <span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
                                                <span className="text-slate-600 font-normal text-xs ml-1.5">trở lên</span>
                                            </span>
                                        </label>
                                    );
                                })}
                                <label className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 cursor-pointer transition ${filters.minRating === '' ? 'bg-brand-red/5 font-bold text-brand-red' : 'hover:bg-slate-50'}`}>
                                    <input 
                                        type="radio" 
                                        checked={filters.minRating === ''} 
                                        onChange={() => updateSearchParams({ minRating: '' })} 
                                        className="accent-brand-red w-4 h-4" 
                                    />
                                    <span>Tất cả đánh giá</span>
                                </label>
                            </div>
                        </div>

                        {/* Availability Filter */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-black text-[#1a1c1c] uppercase tracking-wider font-sans border-b border-slate-100 pb-4 mb-4">Trạng thái</h3>
                            <label className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-700 cursor-pointer transition ${filters.inStock ? 'bg-brand-red/5 font-bold text-brand-red' : 'hover:bg-slate-50'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={filters.inStock} 
                                    onChange={() => updateSearchParams({ inStock: !filters.inStock ? 'true' : '' })} 
                                    className="accent-brand-red w-4 h-4 rounded" 
                                />
                                <span>Chỉ hiển thị còn hàng</span>
                            </label>
                        </div>
                    </aside>

                    {/* Right Results Grid */}
                    <section className="min-w-0">
                        {/* Sorting Toolbar */}
                        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between text-left">
                            <span className="text-sm font-semibold text-slate-500">
                                {loading && products.length === 0 ? 'Đang đồng bộ...' : `Hiển thị danh sách sản phẩm`}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sắp xếp:</span>
                                <select 
                                    value={filters.sort} 
                                    onChange={(e) => updateSearchParams({ sort: e.target.value })} 
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none cursor-pointer transition focus:border-brand-red focus:bg-white"
                                >
                                    <option value="latest">Mới nhất</option>
                                    <option value="popular">Bán chạy</option>
                                    <option value="price-asc">Giá tăng dần</option>
                                    <option value="price-desc">Giá giảm dần</option>
                                    <option value="rating">Đánh giá cao</option>
                                </select>
                            </div>
                        </div>

                        {/* Loading / Grid rendering */}
                        {loading && products.length === 0 ? (
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4 space-y-4">
                                        <div className="aspect-[4/3] rounded-2xl bg-slate-100" />
                                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                                        <div className="h-5 bg-slate-100 rounded w-2/3" />
                                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                                        <div className="h-6 bg-slate-100 rounded w-1/2 pt-2" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {products.map((product) => {
                                    const hasDiscount = Number(product.discount) > 0;
                                    return (
                                        <Link 
                                            key={product.id} 
                                            to={`/product/${product.slug || product.id}`} 
                                            className="group relative block rounded-3xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:shadow-xl hover:border-brand-red/25 hover:-translate-y-1"
                                        >
                                            {/* Favorite Button */}
                                            <button
                                                type="button"
                                                onClick={(event) => onToggleFavorite(event, product)}
                                                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm text-rose-500 shadow-sm backdrop-blur-sm transition duration-300 hover:scale-110 hover:bg-white"
                                                aria-label={isFavorite(product) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
                                            >
                                                {loadingMap[getProductId(product)] ? (
                                                    <LoadingOutlined className="text-xs" />
                                                ) : isFavorite(product) ? (
                                                    <HeartFilled />
                                                ) : (
                                                    <HeartOutlined />
                                                )}
                                            </button>

                                            {/* Badges Container */}
                                            <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5 items-start">
                                                {hasDiscount && (
                                                    <span className="rounded-full bg-brand-red px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                                                        -{product.discount}%
                                                    </span>
                                                )}
                                                {product.inStock === false && (
                                                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                                                        Hết hàng
                                                    </span>
                                                )}
                                            </div>

                                            {/* Product Image */}
                                            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center p-3 relative">
                                                <img 
                                                    src={product.images?.[0] || product.image} 
                                                    alt={product.name} 
                                                    className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105" 
                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                                                />
                                            </div>

                                            {/* Details Info */}
                                            <div className="mt-4 text-left">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block break-words break-all">
                                                    {product.brand} &bull; {product.category}
                                                </span>
                                                <h3 className="mt-1 text-sm font-bold text-slate-900 line-clamp-2 min-h-[40px] leading-tight break-words break-all group-hover:text-brand-red transition-colors">
                                                    {product.name}
                                                </h3>
                                                
                                                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                                                    <span>★</span>
                                                    <span>{Number(product.rating || 0).toFixed(1)}</span>
                                                    <span className="text-slate-300 font-normal">| Đã bán {product.soldCount || 0}</span>
                                                </div>

                                                <div className="mt-4 flex items-end justify-between gap-3">
                                                    <div>
                                                        <div className="text-base font-black text-brand-red leading-none">
                                                            {formatVnd(product.price)}
                                                        </div>
                                                        {product.oldPrice && (
                                                            <div className="text-xs text-slate-400 line-through mt-1">
                                                                {formatVnd(product.oldPrice)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Load more / states */}
                        {loadingMore && (
                            <div className="mt-6 flex justify-center py-4">
                                <LoadingOutlined className="text-2xl text-brand-red animate-spin" />
                            </div>
                        )}

                        {!loading && !loadingMore && products.length > 0 && !hasMore ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/50 px-6 py-4 text-center text-xs font-bold text-emerald-700 shadow-sm">
                                👏 Bạn đã xem hết danh sách sản phẩm!
                            </div>
                        ) : null}

                        {!loading && !loadingMore && products.length === 0 ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm font-bold text-slate-400 shadow-sm">
                                🔍 Không tìm thấy sản phẩm nào khớp với bộ lọc của bạn.
                            </div>
                        ) : null}

                        <div ref={loadMoreRef} className="h-4 w-full" aria-hidden="true" />
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SearchPage;