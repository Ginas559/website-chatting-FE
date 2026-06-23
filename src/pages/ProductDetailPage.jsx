import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { HeartFilled, HeartOutlined, LoadingOutlined, SearchOutlined, ShoppingCartOutlined, StarFilled } from '@ant-design/icons';
import { addRecentlyViewedProductApi, createProductReviewApi, getProductDetailApi, getProductReviewsApi } from '../util/api';
import { logoutUser } from '../redux/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, fetchCart, getCartCount } from '../util/cart';
import StatusAlert from '../components/common/StatusAlert';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/common/NotificationBell';
import ToastNotification from '../components/common/ToastNotification';
import useFavorites from '../hooks/useFavorites';
import { getProductId } from '../util/productId';

const formatVnd = (value) => {
    return Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });
};

const getRewardNoticeMessage = (reward) => {
    if (!reward) {
        return 'Đã lưu đánh giá thành công.';
    }

    if (reward.rewardType === 'COUPON') {
        return 'Đã gửi voucher đến bạn. Vào Profile để kiểm tra.';
    }

    return 'Đã gửi điểm thưởng đến bạn. Vào Profile để kiểm tra.';
};

const ProductDetailPage = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const notificationsProps = useNotifications();
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [related, setRelated] = useState([]);
    const [qty, setQty] = useState(1);
    const [cartCount, setCartCount] = useState(0);
    const [searchValue, setSearchValue] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [reviewData, setReviewData] = useState({
        summary: { totalReviews: 0, averageRating: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        reviews: [],
        canReview: false,
        reviewableOrder: null,
        myReview: null,
        pagination: null,
    });
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState(null);
    const { isFavorite, toggleFavorite, loadingMap } = useFavorites();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setReviewLoading(true);
            try {
                const [detailRes, reviewRes] = await Promise.all([
                    getProductDetailApi(slug),
                    getProductReviewsApi(slug),
                ]);

                if (detailRes?.errCode === 0 && detailRes?.data?.product) {
                    setDetail(detailRes.data.product);
                    setRelated(Array.isArray(detailRes.data.related) ? detailRes.data.related : []);
                } else {
                    setDetail(null);
                    setRelated([]);
                }

                if (reviewRes?.errCode === 0 && reviewRes?.data) {
                    setReviewData({
                        summary: reviewRes.data.summary || { totalReviews: 0, averageRating: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
                        reviews: Array.isArray(reviewRes.data.reviews) ? reviewRes.data.reviews : [],
                        canReview: Boolean(reviewRes.data.canReview),
                        reviewableOrder: reviewRes.data.reviewableOrder || null,
                        myReview: reviewRes.data.myReview || null,
                        pagination: reviewRes.data.pagination || null,
                    });
                } else {
                    setReviewData({
                        summary: { totalReviews: 0, averageRating: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
                        reviews: [],
                        canReview: false,
                        reviewableOrder: null,
                        myReview: null,
                        pagination: null,
                    });
                }
            } finally {
                setLoading(false);
                setReviewLoading(false);
                setQty(1);
                setCurrentImageIndex(0);
            }
        };

        load();
    }, [slug]);

    useEffect(() => {
        if (!isAuthenticated || !slug) {
            return;
        }
        addRecentlyViewedProductApi(slug).catch(() => {});
    }, [isAuthenticated, slug]);

    useEffect(() => {
        if (!reviewData.myReview) {
            return;
        }

        setReviewForm({
            rating: reviewData.myReview.rating || 5,
            title: reviewData.myReview.title || '',
            content: reviewData.myReview.content || '',
        });
    }, [reviewData.myReview]);

    useEffect(() => {
        if (loading || reviewLoading) {
            return;
        }

        if (location.hash === '#reviews') {
            window.requestAnimationFrame(() => {
                const target = document.getElementById('reviews');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }, [loading, reviewLoading, location.hash]);
    useEffect(() => {
        let isMounted = true;

        const syncCartCount = () => setCartCount(getCartCount());
        const loadCartCount = async () => {
            try {
                await fetchCart();
            } catch {
                // keep cached count when backend is unavailable
            } finally {
                if (isMounted) {
                    syncCartCount();
                }
            }
        };

        loadCartCount();

        window.addEventListener('cart:updated', syncCartCount);
        window.addEventListener('storage', syncCartCount);

        return () => {
            isMounted = false;
            window.removeEventListener('cart:updated', syncCartCount);
            window.removeEventListener('storage', syncCartCount);
        };
    }, []);

    const memberName = useMemo(() => {
        const fallback = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        return fallback || user?.email || 'Member';
    }, [user]);

    const onLogout = async () => {
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

    const [notice, setNotice] = useState(null);
    const [noticeType, setNoticeType] = useState('success');

    const showNotice = (message, type = 'success', ms = 2500) => {
        setNoticeType(type);
        setNotice(message);
        window.setTimeout(() => setNotice(null), ms);
    };

    const onAddToCart = async () => {
        try {
            await addToCart(detail, totalQty);
            setCartCount(getCartCount());
            showNotice('Thêm vào giỏ hàng thành công', 'success');
        } catch (error) {
            console.error('Add to cart failed:', error);
            const msg = error?.message || 'Thêm vào giỏ hàng thất bại';
            showNotice(msg, 'error');
        }
    };

    const submitReview = async (event) => {
        event.preventDefault();

        if (!reviewData.canReview || !reviewData.reviewableOrder?.orderCode) {
            setReviewFeedback({ type: 'error', message: 'Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công.' });
            return;
        }

        if (!reviewForm.content.trim()) {
            setReviewFeedback({ type: 'error', message: 'Vui lòng nhập nội dung đánh giá.' });
            return;
        }

        setReviewSubmitting(true);
        setReviewFeedback(null);

        try {
            const response = await createProductReviewApi({
                productSlug: slug,
                orderCode: reviewData.reviewableOrder.orderCode,
                rating: reviewForm.rating,
                title: reviewForm.title.trim(),
                content: reviewForm.content.trim(),
            });

            if (response?.errCode !== 0 || !response?.data) {
                throw response;
            }

            const nextReview = response.data.review;
            const nextReward = response.data.reward;

            setReviewData((current) => ({
                ...current,
                canReview: false,
                reviewableOrder: null,
                myReview: nextReview,
            }));

            setReviewForm({
                rating: nextReview?.rating || 5,
                title: '',
                content: '',
            });

            setReviewFeedback({
                type: 'success',
                message: getRewardNoticeMessage(nextReward),
            });

            const refreshRes = await getProductReviewsApi(slug);
            if (refreshRes?.errCode === 0 && refreshRes?.data) {
                setReviewData((current) => ({
                    ...current,
                    summary: refreshRes.data.summary || current.summary,
                    reviews: Array.isArray(refreshRes.data.reviews) ? refreshRes.data.reviews : current.reviews,
                    canReview: Boolean(refreshRes.data.canReview),
                    reviewableOrder: refreshRes.data.reviewableOrder || null,
                    myReview: refreshRes.data.myReview || nextReview,
                    pagination: refreshRes.data.pagination || current.pagination,
                }));
            }
        } catch (error) {
            setReviewFeedback({
                type: 'error',
                message: error?.errMessage || error?.message || 'Không thể lưu đánh giá.',
            });
        } finally {
            setReviewSubmitting(false);
        }
    };

    const renderStars = (value) => {
        return Array.from({ length: 5 }, (_, index) => (
            <StarFilled key={index} className={index < value ? 'text-amber-400' : 'text-slate-200'} />
        ));
    };

    const onToggleFavorite = async (productOrId) => {
        const result = await toggleFavorite(productOrId, () => navigate('/login'));
        if (!result?.error) {
            return;
        }
        if (result.error === 'LOGIN_REQUIRED') {
            return;
        }
        showNotice(result.error, 'error');
    };

    if (loading) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Đang tải chi tiết sản phẩm...</div>;
    }

    if (!detail) {
        return <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">Không tìm thấy sản phẩm.</div>;
    }

    const images = Array.isArray(detail.images) && detail.images.length ? detail.images : [detail.image].filter(Boolean);
    const currentImage = images[currentImageIndex] || images[0] || '';
    const stockLeft = Number(detail.stock || 0);
    const totalQty = Math.max(1, Math.min(stockLeft || 1, qty));
    const reviewAverage = Number(reviewData.summary?.averageRating || detail.rating || 0);
    const reviewTotal = Number(reviewData.summary?.totalReviews || 0);
    const reviewBreakdown = reviewData.summary?.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    return (
        <div className="min-h-screen max-w-full overflow-x-hidden bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
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

                    <Link to="/" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Tin tức
                    </Link>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Link className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" to="/cart">
                            <ShoppingCartOutlined />
                            <span>Giỏ hàng ({cartCount})</span>
                        </Link>

                        {isAuthenticated && <NotificationBell {...notificationsProps} />}

                        {isAuthenticated ? (
                            <>
                                <Link to="/user/profile" className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-left transition hover:border-orange-300 hover:bg-orange-100">
                                    <p className="text-xs uppercase tracking-[0.18em] text-orange-700">Thành viên đăng nhập</p>
                                    <p className="text-sm font-bold text-slate-900">{memberName || user?.email || 'Member'}</p>
                                    <p className="text-xs text-slate-500">Vai trò: {user?.roleId || 'R2'}</p>
                                </Link>

                                <button onClick={onLogout} type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đăng nhập</Link>
                                <Link to="/register" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">Đăng ký</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-6 lg:px-6">
                {notice ? <StatusAlert type={noticeType}>{notice}</StatusAlert> : null}
                <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <section className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
                        <div className="relative h-[240px] overflow-hidden rounded-[32px] sm:h-[320px] md:h-[420px] lg:h-[520px]">
                            <img src={currentImage} alt={detail.name} className="h-full w-full object-cover object-center" />

                            <button
                                type="button"
                                onClick={() => setCurrentImageIndex((current) => (images.length ? (current - 1 + images.length) % images.length : 0))}
                                disabled={images.length <= 1}
                                className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-xl font-black leading-none shadow-lg transition hover:bg-white ${images.length <= 1 ? 'cursor-not-allowed opacity-40' : ''}`}>
                                &lt;
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentImageIndex((current) => (images.length ? (current + 1) % images.length : 0))}
                                disabled={images.length <= 1}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-xl font-black leading-none shadow-lg transition hover:bg-white ${images.length <= 1 ? 'cursor-not-allowed opacity-40' : ''}`}>
                                &gt;
                            </button>

                            {images.length > 1 ? (
                                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-sm">
                                    {images.map((src, index) => (
                                        <button
                                            key={src + index}
                                            type="button"
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`h-2.5 w-2.5 rounded-full transition ${index === currentImageIndex ? 'bg-white' : 'bg-white/45 hover:bg-white/75'}`}
                                            aria-label={`Xem ảnh ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm text-left">
                        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">{detail.category}</div>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-black">{detail.name}</h1>
                        <p className="mt-3 text-base text-slate-500">{detail.brand}</p>
                        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-500">
                            <div className="flex items-center gap-1">{renderStars(Math.round(reviewAverage || 0))}</div>
                            <span>{reviewAverage.toFixed(1)} / 5.0</span>
                            <span className="text-slate-400">({reviewTotal} đánh giá)</span>
                        </div>

                        <div className="mt-6 flex items-end gap-3">
                            <div className="text-3xl font-black text-orange-600">{formatVnd(detail.price)}</div>
                            <div className="pb-1 text-lg text-slate-400 line-through">{formatVnd(detail.oldPrice)}</div>
                            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{detail.discount || 0}%</span>
                        </div>

                        <p className="mt-5 text-base leading-8 text-slate-600">{detail.description}</p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onToggleFavorite(detail)}
                                disabled={Boolean(loadingMap[getProductId(detail)])}
                                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${isFavorite(detail) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                {loadingMap[getProductId(detail)]
                                    ? <LoadingOutlined />
                                    : isFavorite(detail) ? <HeartFilled /> : <HeartOutlined />}
                                {isFavorite(detail) ? 'Đã yêu thích' : 'Yêu thích'}
                            </button>
                        </div>

                        <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-4">
                                <div>Hàng tồn: <span className="font-bold">{stockLeft}</span></div>
                                <div>Đã bán: <span className="font-bold">{Number(detail.sold || 0)}</span></div>
                                <div>Khách mua: <span className="font-bold">{Number(detail.buyerCount || 0)}</span></div>
                                <div>Bình luận: <span className="font-bold">{Number(detail.commentCount || 0)}</span></div>
                                <div>Danh mục: <span className="font-bold">{detail.category}</span></div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-sm font-semibold text-slate-600">Số lượng</div>
                            <div className="mt-2 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                                <button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="h-9 w-9 rounded-md bg-slate-100 text-lg">-</button>
                                <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(event) => {
                                        const next = Number(event.target.value || 1);
                                        if (stockLeft && next > stockLeft) {
                                            setQty(stockLeft);
                                        } else {
                                            setQty(Math.max(1, next));
                                        }
                                    }}
                                    className="w-20 bg-transparent text-center outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQty((current) => {
                                        const next = current + 1;
                                        if (stockLeft) return Math.min(stockLeft, next);
                                        return next;
                                    })}
                                    className="h-9 w-9 rounded-md bg-slate-100 text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-700">Thông tin sản phẩm</div>
                            <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                <div>Danh mục tương ứng: <span className="font-semibold">{detail.category}</span></div>
                                <div>Số lượng chọn: <span className="font-semibold">{totalQty}</span></div>
                                <div>Trạng thái: <span className="font-semibold">{stockLeft > 0 ? 'Còn hàng' : 'Hết hàng'}</span></div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={onAddToCart}
                                disabled={stockLeft <= 0}
                                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Thêm vào giỏ hàng
                            </button>
                            <Link to="/cart" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Xem giỏ hàng
                            </Link>
                        </div>
                    </section>
                </div>

                <section id="reviews" className="mt-10 min-w-0 max-w-full scroll-mt-28 overflow-x-hidden">
                    <div className="mb-5 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">REVIEWS</div>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Bình luận và đánh giá</h2>
                        </div>
                        <p className="text-sm text-slate-500">Chỉ đơn đã giao thành công mới được gửi đánh giá.</p>
                    </div>

                    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <div className="min-w-0 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm text-left">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Tổng quan</div>
                                    <div className="mt-2 text-4xl font-black text-slate-900">{reviewAverage.toFixed(1)}</div>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                    <div>{reviewTotal} đánh giá</div>
                                    <div>{reviewData.canReview ? 'Bạn có thể đánh giá sản phẩm này' : 'Bạn chưa đủ điều kiện đánh giá'}</div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = Number(reviewBreakdown?.[star] || 0);
                                    const percent = reviewTotal > 0 ? (count / reviewTotal) * 100 : 0;

                                    return (
                                        <div key={star} className="flex items-center gap-3 text-sm">
                                            <div className="w-10 font-semibold text-slate-700">{star} sao</div>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${percent}%` }} />
                                            </div>
                                            <div className="w-8 text-right text-slate-500">{count}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {reviewData.canReview ? (
                                <form onSubmit={submitReview} className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-4">
                                    <div className="text-sm font-black uppercase tracking-[0.2em] text-orange-600">Viết đánh giá</div>
                                    <div className="mt-2 text-sm text-slate-600">
                                        Đơn hàng {reviewData.reviewableOrder?.orderCode} đã đủ điều kiện đánh giá. 5 sao sẽ nhận mã giảm giá, các mức còn lại sẽ cộng điểm.
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                                                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${reviewForm.rating === star ? 'border-orange-500 bg-white text-orange-600' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200'}`}
                                            >
                                                {star} sao
                                            </button>
                                        ))}
                                    </div>

                                    <input
                                        value={reviewForm.title}
                                        onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                                        placeholder="Tiêu đề ngắn cho đánh giá"
                                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                                    />
                                    <textarea
                                        value={reviewForm.content}
                                        onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))}
                                        rows={5}
                                        placeholder="Chia sẻ trải nghiệm mua và sử dụng sản phẩm..."
                                        className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                                    />

                                    <button
                                        type="submit"
                                        disabled={reviewSubmitting}
                                        className="mt-4 inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {reviewSubmitting ? 'Đang lưu đánh giá...' : 'Gửi đánh giá'}
                                    </button>

                                    {reviewFeedback ? (
                                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${reviewFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                            {reviewFeedback.message}
                                        </div>
                                    ) : null}
                                </form>
                            ) : (
                                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    {reviewData.myReview
                                        ? 'Bạn đã gửi đánh giá cho đơn hàng gần nhất của sản phẩm này.'
                                        : 'Hãy mua và nhận hàng thành công để mở khóa phần đánh giá sản phẩm.'}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden text-left">
                            {reviewLoading ? (
                                <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                                    Đang tải đánh giá...
                                </div>
                            ) : reviewData.reviews.length ? reviewData.reviews.map((review) => {
                                const displayName = `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Khách hàng';

                                return (
                                    <article key={review.id} className="w-full max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="break-all font-bold text-slate-900 [overflow-wrap:anywhere]">{displayName}</div>
                                                    <div className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-400">{renderStars(review.rating)}</div>
                                        </div>

                                        <div className="mt-4 break-all text-sm font-bold text-slate-900 [overflow-wrap:anywhere]">{review.title || 'Đánh giá sản phẩm'}</div>
                                        <p className="mt-2 break-all text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{review.content}</p>

                                        <div className="mt-4 break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 [overflow-wrap:anywhere]">
                                            {getRewardNoticeMessage(review.reward)}
                                        </div>
                                    </article>
                                );
                            }) : (
                                <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                                    Chưa có đánh giá nào cho sản phẩm này.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-10">
                    <div className="mb-5 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">RELATED</div>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Sản phẩm tương tự</h2>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {related.map((item) => (
                            <Link key={item.slug} to={`/product/${item.slug}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={async (event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            await onToggleFavorite(item);
                                        }}
                                        className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-base text-rose-500 shadow transition hover:scale-105"
                                        aria-label={isFavorite(item) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
                                    >
                                        {loadingMap[getProductId(item)]
                                            ? <LoadingOutlined />
                                            : isFavorite(item) ? <HeartFilled /> : <HeartOutlined />}
                                    </button>
                                    <img src={item.image} alt={item.name} className="aspect-[4/5] w-full object-cover" />
                                </div>
                                <div className="p-4 text-left">
                                    <div className="text-xs uppercase tracking-wide text-slate-400">{item.category}</div>
                                    <div className="mt-2 font-bold text-slate-900">{item.name}</div>
                                    <div className="mt-2 text-orange-600">{formatVnd(item.price)}</div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        {Number(item.buyerCount || 0)} khách mua • {Number(item.commentCount || 0)} bình luận
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
            <ToastNotification toastMessage={notificationsProps.toastMessage} setToastMessage={notificationsProps.setToastMessage} />
        </div>
    );
};

export default ProductDetailPage;
