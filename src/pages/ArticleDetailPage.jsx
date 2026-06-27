import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import { getArticleDetailApi } from '../util/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const ArticleDetailPage = () => {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [article, setArticle] = useState(null);
    const [related, setRelated] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    useEffect(() => {
        setCurrentImageIndex(0);
    }, [slug]);

    const images = (article && Array.isArray(article.images) && article.images.length) ? article.images : [article?.coverImage].filter(Boolean);
    const safeImages = (images || [])
        .map((s) => (typeof s === 'string' ? s.trim() : s))
        .filter(Boolean);
    if (!safeImages.length) safeImages.push('https://via.placeholder.com/1200x800?text=No+image');

    return (
        <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
            <Header />

            <main className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
                {loading ? (
                    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                        <Spin size="large" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Đang tải bài viết...</span>
                    </div>
                ) : !article ? (
                    <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-brand-red text-left">
                        Không tìm thấy bài viết hoặc bài viết đã bị gỡ bỏ.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Article Header */}
                        <header className="text-left space-y-4">
                            <span className="rounded-full bg-brand-red/5 border border-brand-red/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-brand-red">
                                {article.category}
                            </span>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight font-sans">
                                {article.title}
                            </h1>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-2 border-t border-slate-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                                        {(article.author || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-slate-700">{article.author || 'Biên tập viên'}</span>
                                </div>
                                <span>&bull;</span>
                                <span>Lượt xem: {article.views || 0}</span>
                            </div>
                        </header>

                        {/* Article Media Carousel */}
                        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm aspect-[16/9] flex items-center justify-center">
                            <img 
                                src={safeImages[currentImageIndex]} 
                                alt={`${article.title}-${currentImageIndex}`} 
                                className="h-full w-full object-cover transition-all duration-500" 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/1200x800?text=No+image'; }} 
                            />

                            {safeImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1))}
                                        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-slate-500 shadow-md backdrop-blur-sm transition hover:text-brand-red active:scale-95"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentImageIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1))}
                                        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-slate-500 shadow-md backdrop-blur-sm transition hover:text-brand-red active:scale-95"
                                    >
                                        ›
                                    </button>

                                    {/* Dot Indicators */}
                                    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-slate-950/40 px-3 py-1.5 backdrop-blur-sm">
                                        {safeImages.map((_, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setCurrentImageIndex(idx)}
                                                className={`h-1.5 w-1.5 rounded-full transition-all ${
                                                    idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                                                }`}
                                                aria-label={`Ảnh ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>

                        {/* Article Text Content */}
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-left space-y-6">
                            <p className="text-base font-bold leading-relaxed text-slate-900 border-l-4 border-brand-red pl-4">
                                {article.summary}
                            </p>
                            
                            <article 
                                className="article-body-content text-base leading-8 text-slate-700" 
                                dangerouslySetInnerHTML={{ __html: article.content || article.summary }} 
                            />
                            
                            {Array.isArray(article.tags) && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                                    {article.tags.map((tag) => (
                                        <span key={tag} className="rounded-full bg-slate-50 border border-slate-200 px-3.5 py-1 text-xs font-bold text-slate-500 shadow-inner">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* Related Articles section */}
                {related.length > 0 && (
                    <section className="mt-12">
                        <div className="mb-6 text-left border-b border-slate-200 pb-3">
                            <div className="text-xs font-black uppercase tracking-wider text-brand-red font-sans">Related Stories</div>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 font-sans">Bài viết liên quan</h2>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            {related.map((item) => (
                                <Link 
                                    key={item.slug} 
                                    to={`/article/${item.slug}`} 
                                    className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-brand-red/25 hover:-translate-y-1"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-slate-50 flex items-center justify-center p-0.5">
                                        <img 
                                            src={item.coverImage} 
                                            alt={item.title} 
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" 
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                                        />
                                    </div>
                                    <div className="p-4 text-left">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.category}</span>
                                        <h3 className="mt-1 text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-red transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            
            <style>{`
                .article-body-content p {
                    margin-bottom: 1.5rem;
                }
                .article-body-content h2 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #1a1c1c;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    font-family: sans-serif;
                }
                .article-body-content img {
                    border-radius: 1rem;
                    margin: 1.5rem auto;
                    max-width: 100%;
                }
            `}</style>
            
            <Footer />
        </div>
    );
};

export default ArticleDetailPage;