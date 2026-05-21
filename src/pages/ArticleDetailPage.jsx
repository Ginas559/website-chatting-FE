import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Carousel } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../redux/slices/authSlice';
import { getArticleDetailApi } from '../util/api';

const ArticleDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const carouselRef = useRef(null);
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(true);
    const [article, setArticle] = useState(null);
    const [related, setRelated] = useState([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getArticleDetailApi(slug);
                if (res?.errCode === 0 && res?.data?.article) {
                    setArticle(res.data.article);
                    setRelated(Array.isArray(res.data.related) ? res.data.related : []);
                } else {
                    setArticle(null);
                    setRelated([]);
                }
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [slug]);

    const memberName = useMemo(() => {
        const fallback = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        return fallback || user?.email || 'Member';
    }, [user]);

    const onLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    if (loading) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Đang tải bài viết...</div>;
    }

    if (!article) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Không tìm thấy bài viết.</div>;
    }

    const images = Array.isArray(article.images) && article.images.length ? article.images : [article.coverImage].filter(Boolean);
    const safeImages = (images || [])
        .map((s) => (typeof s === 'string' ? s.trim() : s))
        .filter(Boolean);
    if (!safeImages.length) safeImages.push('https://via.placeholder.com/1200x800?text=No+image');

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="border-b border-orange-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="text-xl font-black text-slate-900">SmartZone Store</Link>
                    <Link to="/search" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Trang tìm kiếm
                    </Link>
                    <div className="ml-auto flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-slate-700">{memberName}</div>
                                <button type="button" onClick={onLogout} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Đăng xuất</button>
                            </>
                        ) : (
                            <Link to="/login" className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Đăng nhập</Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                        {safeImages.length > 1 ? (
                            <Carousel ref={carouselRef} autoplay dots={false} adaptiveHeight className="h-full w-full">
                                {safeImages.map((src, index) => (
                                    <div key={src + index} className="h-[240px] sm:h-[320px] md:h-[420px] lg:h-[520px] w-full">
                                        <img src={src} alt={`${article.title}-${index}`} className="h-full w-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/1200x800?text=No+image'; }} />
                                    </div>
                                ))}
                            </Carousel>
                        ) : (
                            <img src={safeImages[0]} alt={article.title} className="h-[240px] sm:h-[320px] md:h-[420px] lg:h-[520px] w-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/1200x800?text=No+image'; }} />
                        )}

                        <button
                            type="button"
                            onClick={() => carouselRef.current?.prev()}
                            disabled={images.length <= 1}
                            className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg ${images.length <= 1 ? 'opacity-40 pointer-events-none' : ''}`}>
                            <span className="text-orange-600 text-2xl">‹</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => carouselRef.current?.next()}
                            disabled={images.length <= 1}
                            className={`absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg ${images.length <= 1 ? 'opacity-40 pointer-events-none' : ''}`}>
                            <span className="text-orange-600 text-2xl">›</span>
                        </button>
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm text-left">
                        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">{article.category}</div>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-black">{article.title}</h1>
                        <div className="mt-3 text-sm text-slate-500">Tác giả: {article.author}</div>
                        <div className="mt-4 text-sm font-semibold text-slate-500">Lượt xem: {article.views}</div>
                        <p className="mt-5 text-base leading-8 text-slate-600">{article.summary}</p>
                        <article className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-5 text-base leading-8 text-slate-700" dangerouslySetInnerHTML={{ __html: article.content || article.summary }} />
                        <div className="mt-6 flex flex-wrap gap-2">
                            {Array.isArray(article.tags) ? article.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">#{tag}</span>
                            )) : null}
                        </div>
                    </section>
                </div>

                <section className="mt-10">
                    <div className="mb-5">
                        <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">RELATED</div>
                        <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Bài viết liên quan</h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {related.map((item) => (
                            <Link key={item.slug} to={`/article/${item.slug}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                <img src={item.coverImage} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                                <div className="p-4 text-left">
                                    <div className="text-xs uppercase tracking-wide text-slate-400">{item.category}</div>
                                    <div className="mt-2 font-bold text-slate-900">{item.title}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ArticleDetailPage;