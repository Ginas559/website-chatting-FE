import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HeartFilled, HeartOutlined, LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons';
import useFavorites from '../hooks/useFavorites';
import { getHomeArticlesApi, getHomeProductsApi, getRecentlyViewedProductsApi } from '../util/api';
import { getProductId } from '../util/productId';
import StatusAlert from '../components/common/StatusAlert';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import iphone16Img from '../assets/iphone-16.png';

const formatVnd = (value) => {
    return Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });
};

const FavoriteButton = ({ active, loading, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-base text-rose-500 shadow transition hover:scale-105"
        aria-label={active ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
    >
        {loading ? <LoadingOutlined /> : active ? <HeartFilled /> : <HeartOutlined />}
    </button>
);

const HorizontalProductSection = ({
    id,
    code,
    title,
    subtitle,
    products,
    page,
    totalPages,
    onPrev,
    onNext,
    metricLabel,
    metricKey,
    metricTone = 'text-emerald-600',
    isFavorite,
    loadingMap,
    onToggleFavorite,
}) => {
    const safePage = Math.max(page || 1, 1);
    const safeTotalPages = Math.max(totalPages || 1, 1);

    return (
        <section id={id} className="mt-12 text-left">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.35em] text-brand-red">{code}</div>
                    <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900 md:text-[2rem] font-sans">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white px-1 py-1 shadow-sm">
                        <button
                            type="button"
                            onClick={onPrev}
                            disabled={safePage <= 1}
                            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Trang trước"
                        >
                            <LeftOutlined />
                        </button>
                        <div className="min-w-[100px] px-3 text-center text-sm font-bold text-slate-700">
                            Trang {safePage}/{safeTotalPages}
                        </div>
                        <button
                            type="button"
                            onClick={onNext}
                            disabled={safePage >= safeTotalPages}
                            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Trang sau"
                        >
                            <RightOutlined />
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                <div className="flex gap-6 w-max">
                    {products.map((product) => (
                        <Link
                            key={product.id || product.slug}
                            to={`/product/${product.slug || product.id}`}
                            className="group block w-[280px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 flex items-center justify-center p-3">
                                <FavoriteButton
                                    active={isFavorite(product)}
                                    loading={Boolean(loadingMap[getProductId(product)])}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onToggleFavorite(product);
                                    }}
                                />
                                <img src={product.image} alt={product.name} className="max-h-full object-contain transition duration-300 group-hover:scale-105" />
                                {product.discount > 0 ? (
                                    <span className="absolute right-3 top-3 rounded-full bg-brand-red px-2.5 py-1 text-xs font-bold text-white">
                                        -{product.discount}%
                                    </span>
                                ) : null}
                            </div>
                            <div className="p-5 text-left">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.brand}</div>
                                <h3 className="mt-1.5 min-h-[50px] text-base font-bold leading-snug text-slate-900 line-clamp-2">{product.name}</h3>
                                <div className="mt-3 text-base font-black text-brand-red">{formatVnd(product.price)}</div>
                                <div className="text-xs text-slate-400 line-through">{formatVnd(product.oldPrice)}</div>
                                <div className={`mt-3 text-xs font-bold ${metricTone}`}>
                                    {metricLabel}: {Number(product[metricKey] || 0).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

const ArticleSection = ({ articles, id }) => {
    return (
        <section id={id} className="mt-12 text-left scroll-mt-28">
            <div className="mb-6">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-brand-red">NEWS</div>
                <h2 className="mt-1 text-3xl font-black text-slate-900 font-sans">Tin tức mới nhất</h2>
                <p className="mt-1 text-sm text-slate-500">Bài viết công nghệ nổi bật, chia sẻ nhanh và dễ đọc</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {articles.map((article) => (
                    <Link key={article.slug} to={`/article/${article.slug}`} className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                            <img src={article.coverImage} alt={article.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                        </div>
                        <div className="p-5 text-left">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-red">{article.category}</div>
                            <h3 className="mt-2 min-h-[48px] text-base font-bold leading-snug text-slate-900 line-clamp-2">{article.title}</h3>
                            <p className="mt-2 line-clamp-2 text-xs text-slate-500 leading-relaxed">{article.summary}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

const StoreHomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [sections, setSections] = useState({
        promotion: { items: [], page: 1, totalPages: 1 },
        latest: { items: [], page: 1, totalPages: 1 },
        bestseller: { items: [], page: 1, totalPages: 1 },
        mostViewed: { items: [], page: 1, totalPages: 1 },
    });
    const [sectionPages, setSectionPages] = useState({
        bestseller: 1,
        mostViewed: 1,
    });
    const [articles, setArticles] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingArticles, setLoadingArticles] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const { isFavorite, toggleFavorite, loadingMap } = useFavorites();
    const [favoriteNotice, setFavoriteNotice] = useState(null);

    const hasProducts = sections.promotion.items.length > 0;

    // Scroll to section when navigating with hash (e.g. /#khuyen-mai)
    useEffect(() => {
        if (!location.hash) return;
        const sectionId = location.hash.substring(1);
        let attempts = 0;
        const tryScroll = () => {
            const el = document.getElementById(sectionId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (attempts < 20) {
                attempts++;
                requestAnimationFrame(tryScroll);
            }
        };
        const timer = setTimeout(tryScroll, 150);
        return () => clearTimeout(timer);
    }, [location.hash]);

    // Ticking Flash Sale timer
    const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 10 });
    useEffect(() => {
        const timer = window.setInterval(() => {
            setTimeLeft((prev) => {
                let s = prev.seconds - 1;
                let m = prev.minutes;
                let h = prev.hours;
                if (s < 0) {
                    s = 59;
                    m -= 1;
                }
                if (m < 0) {
                    m = 59;
                    h -= 1;
                }
                if (h < 0) {
                    h = 23;
                }
                return { hours: h, minutes: m, seconds: s };
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            setLoadError('');

            try {
                const res = await getHomeProductsApi({
                    limit: 10,
                    promotionPage: 1,
                    latestPage: 1,
                    bestsellerPage: sectionPages.bestseller,
                    mostViewedPage: sectionPages.mostViewed,
                });
                if (res?.errCode === 0 && res?.data) {
                    setSections({
                        promotion: res.data.promotion || { items: [] },
                        latest: res.data.latest || { items: [] },
                        bestseller: res.data.bestseller || { items: [] },
                        mostViewed: res.data.mostViewed || { items: [] },
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

        fetchProducts();
    }, [sectionPages]);

    useEffect(() => {
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

        fetchArticles();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadRecentlyViewed = async () => {
            if (!isAuthenticated) {
                if (isMounted) setRecentlyViewed([]);
                return;
            }
            try {
                const res = await getRecentlyViewedProductsApi();
                if (isMounted && res?.errCode === 0) {
                    setRecentlyViewed(Array.isArray(res?.data?.items) ? res.data.items : []);
                }
            } catch {
                if (isMounted) setRecentlyViewed([]);
            }
        };
        loadRecentlyViewed();
        return () => {
            isMounted = false;
        };
    }, [isAuthenticated]);

    const updateSectionPage = (sectionName, direction) => {
        setSectionPages((currentPages) => {
            const currentSection = sections[sectionName] || {};
            const currentPage = currentSection.page || currentPages[sectionName] || 1;
            const totalPages = currentSection.totalPages || 1;
            const nextPage = Math.max(1, Math.min(totalPages, currentPage + direction));

            if (nextPage === currentPage) {
                return currentPages;
            }

            return {
                ...currentPages,
                [sectionName]: nextPage,
            };
        });
    };

    const onToggleFavorite = async (product) => {
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

    const partnerBrands = [
        {
            name: 'Apple',
            logo: (
                <svg viewBox="0 0 24 24" className="h-10 w-auto fill-slate-400 hover:fill-black transition duration-300">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
            )
        },
        {
            name: 'Samsung',
            logo: (
                <svg viewBox="0 10.0 24 4.0" className="h-7 w-auto fill-slate-400 hover:fill-[#074A96] transition duration-300">
                    <path d="M19.8166 10.2808l.0459 2.6934h-.023l-.7793-2.6934h-1.2837v3.3925h.8481l-.0458-2.785h.023l.8366 2.785h1.2264v-3.3925zm-16.149 0l-.6418 3.427h.9284l.4699-3.1175h.0229l.4585 3.1174h.9169l-.6304-3.4269zm5.1805 0l-.424 2.6132h-.023l-.424-2.6132H6.5788l-.0688 3.427h.8596l.023-3.0832h.0114l.573 3.0831h.8711l.5731-3.083h.023l.0228 3.083h.8596l-.0802-3.4269zm-7.2664 2.4527c.0343.0802.0229.1949.0114.2522-.0229.1146-.1031.2292-.3324.2292-.2177 0-.3438-.126-.3438-.3095v-.3323H0v.2636c0 .7679.6074.9971 1.2493.9971.6189 0 1.1346-.2178 1.2149-.7794.0458-.298.0114-.4928 0-.5616-.1605-.722-1.467-.9283-1.5588-1.3295-.0114-.0688-.0114-.1375 0-.1834.023-.1146.1032-.2292.3095-.2292.2063 0 .321.126.321.3095v.2063h.8595v-.2407c0-.745-.6762-.8596-1.1576-.8596-.6074 0-1.1117.2063-1.2034.7564-.023.149-.0344.2866.0114.4585.1376.7106 1.364.9169 1.5358 1.3524m11.152 0c.0343.0803.0228.1834.0114.2522-.023.1146-.1032.2292-.3324.2292-.2178 0-.3438-.126-.3438-.3095v-.3323h-.917v.2636c0 .7564.596.9857 1.2379.9857.6189 0 1.1232-.2063 1.2034-.7794.0459-.298.0115-.4814 0-.5616-.1375-.7106-1.4327-.9284-1.5243-1.318-.0115-.0688-.0115-.1376 0-.1835.0229-.1146.1031-.2292.3094-.2292.1948 0 .321.126.321.3095v.2063h.848v-.2407c0-.745-.6647-.8596-1.146-.8596-.6075 0-1.1004.1948-1.192.7564-.023.149-.023.2866.0114.4585.1376.7106 1.341.9054 1.513 1.3524m2.8882.4585c.2407 0 .3094-.1605.3323-.2522.0115-.0343.0115-.0917.0115-.126v-2.533h.871v2.4642c0 .0688 0 .1948-.0114.2292-.0573.6419-.5616.8482-1.192.8482-.6303 0-1.1346-.2063-1.192-.8482 0-.0344-.0114-.1604-.0114-.2292v-2.4642h.871v2.533c0 .0458 0 .0916.0115.126 0 .0917.0688.2522.3095.2522m7.1518-.0344c.2522 0 .3324-.1605.3553-.2522.0115-.0343.0115-.0917.0115-.126v-.4929h-.3553v-.5043H24v.917c0 .0687 0 .1145-.0115.2292-.0573.6303-.596.8481-1.2034.8481-.6075 0-1.1461-.2178-1.2034-.8481-.0115-.1147-.0115-.1605-.0115-.2293v-1.444c0-.0574.0115-.172.0115-.2293.0802-.6419.596-.8482 1.2034-.8482s1.1347.2063 1.2034.8482c.0115.1031.0115.2292.0115.2292v.1146h-.8596v-.1948s0-.0803-.0115-.1261c-.0114-.0802-.0802-.2521-.3438-.2521-.2521 0-.321.1604-.3438.2521-.0115.0458-.0115.1032-.0115.1605v1.5702c0 .0458 0 .0916.0115.126 0 .0917.0917.2522.3323.2522"/>
                </svg>
            )
        },
        {
            name: 'Asus',
            logo: (
                <svg viewBox="0 9.4 24 5.2" className="h-7 w-auto fill-slate-400 hover:fill-[#0066B2] transition duration-300">
                    <path d="M23.904 10.788V9.522h-4.656c-.972 0-1.41.6-1.482 1.182v.018-1.2h-1.368v1.266h1.362zm-6.144.456l-1.368-.078v1.458c0 .456-.228.594-1.02.594H14.28c-.654 0-.93-.186-.93-.594v-1.596l-1.386-.102v1.812h-.03c-.078-.528-.276-1.14-1.596-1.23L6 11.22c0 .666.474 1.062 1.218 1.14l3.024.306c.24.018.414.09.414.288 0 .216-.18.24-.456.24H5.946V11.22l-1.386-.09v3.348h5.646c1.26 0 1.662-.654 1.722-1.2h.03c.156.864.912 1.2 2.19 1.2h1.41c1.494 0 2.202-.456 2.202-1.524zm4.398.258l-4.338-.258c0 .666.438 1.11 1.182 1.17l3.09.24c.24.018.384.078.384.276 0 .186-.168.258-.516.258h-4.212v1.29h4.302c1.356 0 1.95-.474 1.95-1.554 0-.972-.534-1.338-1.842-1.422zm-10.194-1.98h1.386v1.266h-1.386zM3.798 11.07l-1.506-.15L0 14.478h1.686zm7.914-1.548h-4.23c-.984 0-1.416.612-1.518 1.2v-1.2H3.618c-.33 0-.486.102-.642.33l-.648.936h9.384Z"/>
                </svg>
            )
        },
        {
            name: 'Dell',
            logo: (
                <svg viewBox="0 0 24 24" className="h-10 w-auto fill-slate-400 hover:fill-[#0076B6] transition duration-300" fillRule="evenodd">
                    <path d="M17.963 14.6V9.324h1.222v4.204h2.14v1.07h-3.362zm-9.784-3.288l2.98-2.292c.281.228.56.458.841.687l-2.827 2.14.611.535 2.827-2.216c.281.228.56.458.841.688a295.83 295.83 0 0 1-2.827 2.216l.61.536 2.83-2.295-.001-1.986h1.223v4.204h2.216v1.07h-3.362v-1.987c-.995.763-1.987 1.529-2.981 2.292l-2.981-2.292c-.144.729-.653 1.36-1.312 1.694-.285.147-.597.24-.915.276-.183.022-.367.017-.551.017H3.516V9.325H5.69a2.544 2.544 0 0 1 1.563.557c.454.36.778.872.927 1.43m-3.516-.917v3.21l.953-.001a1.377 1.377 0 0 0 1.036-.523 1.74 1.74 0 0 0 .182-1.889 1.494 1.494 0 0 0-.976-.766c-.166-.04-.338-.03-.507-.032h-.688zM11.82 0h.337a11.94 11.94 0 0 1 5.405 1.373 12.101 12.101 0 0 1 4.126 3.557A11.93 11.93 0 0 1 24 11.82v.36a11.963 11.963 0 0 1-3.236 8.033A11.967 11.967 0 0 1 12.182 24h-.361a11.993 11.993 0 0 1-4.145-.806 12.04 12.04 0 0 1-4.274-2.836A12.057 12.057 0 0 1 .576 15.67 12.006 12.006 0 0 1 0 12.181v-.361a11.924 11.924 0 0 1 1.992-6.396 12.211 12.211 0 0 1 4.71-4.172A11.875 11.875 0 0 1 11.82 0m-.153 1.23a10.724 10.724 0 0 0-6.43 2.375 10.78 10.78 0 0 0-3.319 4.573 10.858 10.858 0 0 0 .193 8.12 10.788 10.788 0 0 0 3.546 4.421 10.698 10.698 0 0 0 4.786 1.946c1.456.209 2.955.124 4.376-.26a10.756 10.756 0 0 0 5.075-3.062 10.742 10.742 0 0 0 2.686-5.28 10.915 10.915 0 0 0-.122-4.682 10.77 10.77 0 0 0-7.098-7.626 10.78 10.78 0 0 0-3.693-.525z"/>
                </svg>
            )
        },
        {
            name: 'Logitech',
            logo: (
                <svg viewBox="0 0 512 512" className="h-9 w-auto fill-slate-400 hover:fill-[#00a7e0] transition duration-300">
                    <path d="M348.9 390.7H426V223.3H258.6v77.1h90.3v90.3zm-91.8-24.5a109.4 109.4 0 010-218.8V70C153 70 68.9 153.8 68.9 256.6s84.5 186.7 187.9 186.7l.3-77.1z" />
                </svg>
            )
        },
        {
            name: 'HP',
            logo: (
                <svg viewBox="0 0 100 100" className="h-10 w-auto text-slate-400 hover:text-[#0096D6] fill-current transition duration-300">
                    <g transform="matrix(1.25,0,0,-1.25,-67.822513,702.43127)">
                        <g transform="matrix(1.5180439,0,0,1.5180439,-28.149474,-249.71011)">
                            <g transform="translate(106.93201,508.32201)">
                                <path d="m 0,0 c 0,14.524 -11.773,26.297 -26.297,26.297 -0.396,0 -0.79,-0.01 -1.182,-0.028 l -5.379,-14.784 4.685,0 c 2.787,0 4.289,-2.146 3.335,-4.767 l -6.635,-18.234 -5.571,10e-4 7.12,19.544 -4.189,0 -7.12,-19.544 -5.573,0 8.372,23 10e-4,0 5.036,13.841 C -44.471,22.228 -52.594,12.063 -52.594,0 c 0,-12.421 8.613,-22.83 20.192,-25.583 l 4.88,13.411 0.004,0 8.609,23.657 10.261,0 c 2.79,0 4.291,-2.146 3.337,-4.767 l -5.83,-16.015 c -0.444,-1.22 -1.869,-2.218 -3.167,-2.218 l -7.396,0 -5.374,-14.77 c 0.259,-0.007 0.52,-0.012 0.781,-0.012 C -11.773,-26.297 0,-14.523 0,0" />
                            </g>
                            <g transform="translate(96.546997,516.36501)">
                                <path d="m 0,0 -4.187,0 -5.864,-16.089 4.187,0 L 0,0" />
                            </g>
                        </g>
                    </g>
                </svg>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-brand-bg text-brand-dark">
            <Header />

            <main className="mx-auto max-w-7xl px-6 py-8">
                {favoriteNotice ? (
                    <div className="mb-4">
                        <StatusAlert type={favoriteNotice.type}>{favoriteNotice.message}</StatusAlert>
                    </div>
                ) : null}

                {/* Hero Section - Matching Figma Frame 101:396 */}
                <section className="relative w-full rounded-[30px] bg-black text-white overflow-hidden p-8 md:p-12 min-h-[500px] flex items-center shadow-xl shadow-brand-red/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full z-10">
                        {/* Left Column - 101:398 */}
                        <div className="text-left flex flex-col justify-center">
                            <div className="inline-block self-start rounded-full border border-brand-red bg-brand-red/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-brand-red mb-6">
                                SẢN PHẨM MỚI
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight !text-white font-sans">
                                iPhone 16 Pro Max
                                <br />
                                Titan Sa Mạc.
                            </h1>
                            <p className="mt-5 text-sm md:text-base text-slate-300 leading-relaxed max-w-lg">
                                Chip A18 Pro đột phá vượt trội. Camera Control thế hệ mới. Thời lượng pin trâu nhất lịch sử iPhone.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    to="/product/iphone-16-pro-max-1tb-vn-a"
                                    className="rounded-xl bg-brand-red px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-red/20 transition hover:bg-[#a0101d] hover:scale-[1.02]"
                                >
                                    Mua ngay
                                </Link>
                                <Link
                                    to="/search?q=iPhone"
                                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
                                >
                                    Tìm hiểu thêm
                                </Link>
                            </div>
                        </div>
                        {/* Right Column - 101:410 */}
                        <div className="relative flex justify-center md:justify-end">
                            <img
                                src={iphone16Img}
                                alt="iPhone 16 Pro Max Titan Sa Mạc"
                                className="max-h-[380px] object-contain drop-shadow-[0_20px_50px_rgba(183,20,35,0.25)] transition duration-500 hover:scale-105 rounded-3xl"
                            />
                        </div>
                    </div>
                    {/* Subtle design gradient bg overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(183,20,35,0.12),transparent_55%)] pointer-events-none" />
                </section>

                {loadingProducts && !hasProducts ? (
                    <div className="mt-10 rounded-3xl border border-border-color bg-white p-6 text-sm font-semibold text-brand-red text-left">
                        Đang tải dữ liệu sản phẩm...
                    </div>
                ) : null}

                {loadError ? (
                    <div className="mt-10 rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-brand-red text-left">
                        {loadError}
                    </div>
                ) : null}

                {hasProducts && !loadError ? (
                    <div className={loadingProducts ? 'opacity-60 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
                        {/* Flash Sale Countdown Section - Matching Figma Frame 101:412 */}
                        <section id="khuyen-mai" className="mt-12 bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm text-left scroll-mt-28">
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-2xl">⚡</span>
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-brand-red font-sans">FLASH SALE</h2>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span className="rounded-lg bg-black px-3 py-1.5 text-sm font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                                        <span className="font-bold text-black">:</span>
                                        <span className="rounded-lg bg-black px-3 py-1.5 text-sm font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                        <span className="font-bold text-black">:</span>
                                        <span className="rounded-lg bg-black px-3 py-1.5 text-sm font-black text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                    </div>
                                </div>
                                <Link to="/search?promotion=true" className="text-sm font-bold text-brand-red hover:underline flex items-center gap-1">
                                    Xem tất cả &rarr;
                                </Link>
                            </div>

                            {/* Horizontal scrolling cards */}
                            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                                <div className="flex gap-6 w-max">
                                    {sections.promotion.items.map((product) => (
                                        <Link
                                            key={product.id || product.slug}
                                            to={`/product/${product.slug || product.id}`}
                                            className="relative block w-[260px] rounded-3xl border border-slate-200 bg-white p-4 transition duration-300 hover:shadow-lg hover:border-brand-red/25"
                                        >
                                            {/* Discount Badge */}
                                            {product.discount > 0 ? (
                                                <span className="absolute left-4 top-4 z-10 rounded-full bg-brand-red px-2.5 py-1 text-[11px] font-black text-white">
                                                    -{product.discount}%
                                                </span>
                                            ) : null}
                                            
                                            {/* Image */}
                                            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center p-2">
                                                <img src={product.image} alt={product.name} className="max-h-full object-contain transition duration-300 hover:scale-105" />
                                            </div>

                                            {/* Content */}
                                            <div className="mt-4">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{product.brand}</span>
                                                <h3 className="mt-1 text-sm font-bold text-slate-900 line-clamp-2 min-h-[40px] leading-tight">
                                                    {product.name}
                                                </h3>
                                                <div className="mt-3 flex items-baseline gap-2">
                                                    <span className="text-base font-black text-brand-red">{formatVnd(product.price)}</span>
                                                    {product.oldPrice ? (
                                                        <span className="text-xs text-slate-400 line-through">{formatVnd(product.oldPrice)}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Product Categories Section - Matching Figma Frame 101:510 */}
                        <section className="mt-12 bg-[#EEEEEE] rounded-[32px] p-6 md:p-8 text-left">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-brand-dark font-sans">Danh mục sản phẩm</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                                {[
                                    { label: 'Điện thoại', query: 'Điện%20thoại', icon: '📱' },
                                    { label: 'Laptop', query: 'Laptop', icon: '💻' },
                                    { label: 'PC - Màn hình', query: 'PC%20-%20Màn%20hình', icon: '🖥️' },
                                    { label: 'Âm thanh', query: 'Âm%20thanh', icon: '🎧' },
                                    { label: 'Đồng hồ', query: 'Đồng%20hồ', icon: '⌚' },
                                    { label: 'Phụ kiện', query: 'Phụ%20kiện', icon: '🔌' },
                                ].map((cat) => (
                                    <Link
                                        key={cat.label}
                                        to={`/search?category=${cat.query}`}
                                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-transparent shadow-sm transition duration-300 hover:shadow-md hover:border-brand-red hover:scale-[1.02]"
                                    >
                                        <span className="text-3xl mb-3">{cat.icon}</span>
                                        <span className="text-sm font-bold text-brand-dark text-center">{cat.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        {/* Featured Products Section - Matching Figma Frame 101:557 */}
                        <section className="mt-12 text-left">
                            <div className="mb-6 flex items-baseline justify-between gap-4">
                                <h2 className="text-2xl font-black text-brand-dark font-sans">Sản phẩm nổi bật</h2>
                                <Link to="/search" className="text-sm font-bold text-brand-red hover:underline">
                                    Xem tất cả
                                </Link>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {sections.latest.items.slice(0, 8).map((product) => (
                                    <Link
                                        key={product.id || product.slug}
                                        to={`/product/${product.slug || product.id}`}
                                        className="group relative flex flex-col justify-between rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                                    >
                                        <div>
                                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center p-3">
                                                <FavoriteButton
                                                    active={isFavorite(product)}
                                                    loading={Boolean(loadingMap[getProductId(product)])}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        onToggleFavorite(product);
                                                    }}
                                                />
                                                <img src={product.image} alt={product.name} className="max-h-full object-contain transition duration-300 group-hover:scale-105" />
                                                {product.discount > 0 ? (
                                                    <span className="absolute right-3 top-3 rounded-full bg-brand-red px-2.5 py-1 text-xs font-bold text-white">
                                                        -{product.discount}%
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-4">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{product.brand}</span>
                                                <h3 className="mt-1 text-base font-bold text-slate-900 line-clamp-2 min-h-[48px] leading-snug">{product.name}</h3>
                                                <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                    {product.description || `Sản phẩm công nghệ ${product.name} chính hãng chất lượng cao.`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black text-brand-red">{formatVnd(product.price)}</span>
                                                {product.oldPrice ? (
                                                    <span className="text-xs text-slate-400 line-through">{formatVnd(product.oldPrice)}</span>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                className="grid h-10 w-10 place-items-center rounded-full bg-brand-dark text-white transition hover:bg-brand-red"
                                                aria-label="Thêm vào giỏ"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        {/* Bestseller Section */}
                        <HorizontalProductSection
                            id="bestseller"
                            code="BESTSELLER"
                            title="Bán chạy nhất"
                            subtitle="Top sản phẩm được chọn nhiều tại SmartZone"
                            products={sections.bestseller.items || []}
                            page={sections.bestseller.page || 1}
                            totalPages={sections.bestseller.totalPages || 1}
                            onPrev={() => updateSectionPage('bestseller', -1)}
                            onNext={() => updateSectionPage('bestseller', 1)}
                            metricLabel="Đã bán"
                            metricKey="sold"
                            metricTone="text-emerald-600"
                            isFavorite={isFavorite}
                            loadingMap={loadingMap}
                            onToggleFavorite={onToggleFavorite}
                        />

                        {/* Most Viewed Section */}
                        <HorizontalProductSection
                            id="mostViewed"
                            code="MOST-VIEWED"
                            title="Xem nhiều nhất"
                            subtitle="Những sản phẩm được quan tâm nhiều"
                            products={sections.mostViewed.items || []}
                            page={sections.mostViewed.page || 1}
                            totalPages={sections.mostViewed.totalPages || 1}
                            onPrev={() => updateSectionPage('mostViewed', -1)}
                            onNext={() => updateSectionPage('mostViewed', 1)}
                            metricLabel="Lượt xem"
                            metricKey="views"
                            metricTone="text-brand-red"
                            isFavorite={isFavorite}
                            loadingMap={loadingMap}
                            onToggleFavorite={onToggleFavorite}
                        />

                        {/* Brand Partners Section - Matching Figma Frame 101:617 */}
                        <section className="mt-12 bg-[#F9F9F9] rounded-[32px] p-6 md:p-8 border border-slate-200/60 text-left">
                            <div className="mb-6">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-sans">Đối tác thương hiệu uy tín</h2>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-center sm:justify-around gap-8">
                                {partnerBrands.map((brand) => (
                                    <Link 
                                        key={brand.name} 
                                        to={`/search?q=${encodeURIComponent(brand.name)}`}
                                        className="flex items-center justify-center p-3 hover:scale-105 transition-all duration-300"
                                        title={`Tìm kiếm sản phẩm ${brand.name}`}
                                    >
                                        {brand.logo}
                                    </Link>
                                ))}
                            </div>
                        </section>

                        {isAuthenticated && recentlyViewed.length ? (
                            <div className="mt-8 border-t border-slate-100 pt-8">
                                <HorizontalProductSection
                                    id="recently-viewed"
                                    code="RECENT"
                                    title="Sản phẩm đã xem"
                                    subtitle="Tiếp tục xem lại các sản phẩm gần đây"
                                    products={recentlyViewed}
                                    page={1}
                                    totalPages={1}
                                    onPrev={() => {}}
                                    onNext={() => {}}
                                    metricLabel="Lượt xem"
                                    metricKey="views"
                                    metricTone="text-brand-gray"
                                    isFavorite={isFavorite}
                                    loadingMap={loadingMap}
                                    onToggleFavorite={onToggleFavorite}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {loadingArticles ? (
                    <div className="mt-10 rounded-3xl border border-border-color bg-white p-6 text-sm font-semibold text-brand-red text-left">
                        Đang tải bài viết mới nhất...
                    </div>
                ) : null}

                {!loadingArticles && articles.length ? <ArticleSection articles={articles} id="tin-tuc" /> : null}
            </main>
            
            <Footer />
        </div>
    );
};

export default StoreHomePage;
