import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { HeartFilled, HeartOutlined, LeftOutlined, LoadingOutlined, RightOutlined, StarFilled } from '@ant-design/icons';
import { addRecentlyViewedProductApi, createProductReviewApi, getProductDetailApi, getProductReviewsApi } from '../util/api';
import { useSelector } from 'react-redux';
import { addToCart } from '../util/cart';
import StatusAlert from '../components/common/StatusAlert';
import useFavorites from '../hooks/useFavorites';
import { getProductId } from '../util/productId';
import { getChatUserByIdApi } from '../api/chatApi';
import { Modal, Spin, message } from 'antd';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';


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

const getProductOptions = (category, brand, name) => {
    const cat = String(category || '').toLowerCase();
    
    // Laptop
    if (cat.includes('laptop') || cat.includes('máy tính xách tay')) {
        return {
            colors: ['Xám Không Gian', 'Bạc Mờ', 'Đen Carbon'],
            capacities: ['8GB | 256GB', '16GB | 512GB', '32GB | 1TB']
        };
    }
    
    // Đồng hồ
    if (cat.includes('đồng hồ') || cat.includes('watch')) {
        return {
            colors: ['Đen Thể Thao', 'Bạc Cổ Điển', 'Vàng Hồng'],
            capacities: ['40mm', '44mm', '45mm']
        };
    }
    
    // Âm thanh
    if (cat.includes('âm thanh') || cat.includes('tai nghe') || cat.includes('loa') || cat.includes('sound')) {
        return {
            colors: ['Đen Huyền Bí', 'Trắng Tuyết', 'Xanh Navy'],
            capacities: ['Không dây', 'Có dây']
        };
    }
    
    // PC / Màn hình
    if (cat.includes('màn hình') || cat.includes('pc') || cat.includes('monitor')) {
        return {
            colors: ['Đen Nhám', 'Trắng Bạc'],
            capacities: ['24 inch', '27 inch', '32 inch']
        };
    }
    
    // Phụ kiện
    if (cat.includes('phụ kiện') || cat.includes('accessory')) {
        return {
            colors: ['Đen Carbon', 'Trắng Tuyết'],
            capacities: ['Tiêu chuẩn']
        };
    }
    
    // Default to Điện thoại/Máy tính bảng
    return {
        colors: ['Titan Tự Nhiên', 'Titan Sa Mạc', 'Xám Không Gian', 'Trắng Titan', 'Đen Titan'],
        capacities: ['128GB', '256GB', '512GB', '1TB']
    };
};

const ProductDetailPage = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const myUserId = user?.id || user?._id;

    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileUser, setProfileUser] = useState(null);

    const handleOpenProfile = async (reviewerUserId) => {
        if (!reviewerUserId) return;
        setProfileModalOpen(true);
        setLoadingProfile(true);
        setProfileUser(null);
        try {
            const res = await getChatUserByIdApi(reviewerUserId);
            if (res?.success && res.data) {
                setProfileUser(res.data);
            } else {
                message.error('Không thể tải thông tin người dùng');
                setProfileModalOpen(false);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            message.error('Lỗi khi tải thông tin người dùng');
            setProfileModalOpen(false);
        } finally {
            setLoadingProfile(false);
        }
    };

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [related, setRelated] = useState([]);
    const [qty, setQty] = useState(1);
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
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewFilterRating, setReviewFilterRating] = useState(null);
    const { isFavorite, toggleFavorite, loadingMap } = useFavorites();

    const [selectedColor, setSelectedColor] = useState('');
    const [selectedCapacity, setSelectedCapacity] = useState('');

    const options = useMemo(() => {
        if (!detail) return { colors: [], capacities: [] };
        return getProductOptions(detail.category, detail.brand, detail.name);
    }, [detail]);

    const fetchReviews = useCallback(async (targetSlug, page = 1, ratingFilter = null) => {
        setReviewLoading(true);
        try {
            const params = { page, limit: 6 };
            if (ratingFilter) params.rating = ratingFilter;
            const reviewRes = await getProductReviewsApi(targetSlug, params);

            if (reviewRes?.errCode === 0 && reviewRes?.data) {
                setReviewData(current => ({
                    ...current,
                    summary: reviewRes.data.summary || current.summary,
                    reviews: Array.isArray(reviewRes.data.reviews) ? reviewRes.data.reviews : [],
                    canReview: Boolean(reviewRes.data.canReview),
                    reviewableOrder: reviewRes.data.reviewableOrder || null,
                    myReview: reviewRes.data.myReview || current.myReview,
                    pagination: reviewRes.data.pagination || null,
                }));
            }
        } finally {
            setReviewLoading(false);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setReviewLoading(true);
            setReviewPage(1);
            setReviewFilterRating(null);
            try {
                const [detailRes] = await Promise.all([
                    getProductDetailApi(slug),
                    fetchReviews(slug, 1, null),
                ]);

                if (detailRes?.errCode === 0 && detailRes?.data?.product) {
                    const prod = detailRes.data.product;
                    setDetail(prod);
                    setRelated(Array.isArray(detailRes.data.related) ? detailRes.data.related : []);
                    
                    const opts = getProductOptions(prod.category, prod.brand, prod.name);
                    if (opts.colors.length > 0) setSelectedColor(opts.colors[0]);
                    if (opts.capacities.length > 0) setSelectedCapacity(opts.capacities[0]);
                } else {
                    setDetail(null);
                    setRelated([]);
                }
            } finally {
                setLoading(false);
                setQty(1);
                setCurrentImageIndex(0);
            }
        };

        load();
    }, [slug, fetchReviews]);

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

    const [notice, setNotice] = useState(null);
    const [noticeType, setNoticeType] = useState('success');

    const showNotice = (message, type = 'success', ms = 2500) => {
        setNoticeType(type);
        setNotice(message);
        window.setTimeout(() => setNotice(null), ms);
    };

    const onAddToCart = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location.pathname } });
            return false;
        }
        try {
            await addToCart(detail, totalQty, selectedColor, selectedCapacity);
            message.success('Thêm vào giỏ hàng thành công');
            return true;
        } catch (error) {
            console.error('Add to cart failed:', error);
            const msg = error?.errMessage || error?.message || 'Thêm vào giỏ hàng thất bại';
            message.error(msg);
            return false;
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

            setReviewPage(1);
            setReviewFilterRating(null);
            await fetchReviews(slug, 1, null);
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

    const images = (detail && Array.isArray(detail.images) && detail.images.length) ? detail.images : [detail?.image].filter(Boolean);
    const currentImage = images[currentImageIndex] || images[0] || '';
    const stockLeft = Number(detail?.stock || 0);
    const totalQty = Math.max(1, Math.min(stockLeft || 1, qty));
    const reviewAverage = Number(reviewData.summary?.averageRating || detail?.rating || 0);
    const reviewTotal = Number(reviewData.summary?.totalReviews || 0);
    const reviewBreakdown = reviewData.summary?.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-dark">
            <Header />

            <main className="mx-auto max-w-7xl px-6 py-8">
                {notice ? <StatusAlert type={noticeType}>{notice}</StatusAlert> : null}

                {loading ? (
                    <div className="flex min-h-[400px] items-center justify-center">
                        <Spin size="large" tip="Đang tải chi tiết sản phẩm..." />
                    </div>
                ) : !detail ? (
                    <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-brand-red text-left">
                        Không tìm thấy sản phẩm.
                    </div>
                ) : (
                    <>

                {/* Nav - Breadcrumb: Matching Figma Frame 101:729 */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6 text-left">
                    <Link to="/" className="hover:text-brand-red transition">Trang chủ</Link>
                    <span className="text-[10px] text-slate-400">&gt;</span>
                    <Link to={`/search?category=${encodeURIComponent(detail.category || '')}`} className="hover:text-brand-red transition">
                        {detail.category || 'Sản phẩm'}
                    </Link>
                    <span className="text-[10px] text-slate-400">&gt;</span>
                    <span className="text-slate-800 line-clamp-1">{detail.name}</span>
                </div>

                {/* Product Presentation: Matching Figma Frame 101:740 */}
                <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-start">
                    {/* Left Column: Gallery - Matching Figma Frame 101:741 */}
                    <section className="flex flex-col">
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center">
                            <img src={currentImage} alt={detail.name} className="max-h-full max-w-full object-contain object-center transition duration-300" />

                            {images.length > 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentImageIndex((current) => (images.length ? (current - 1 + images.length) % images.length : 0))}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-sm font-black leading-none shadow transition hover:bg-white hover:scale-105 active:scale-95"
                                    >
                                        &lt;
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentImageIndex((current) => (images.length ? (current + 1) % images.length : 0))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-sm font-black leading-none shadow transition hover:bg-white hover:scale-105 active:scale-95"
                                    >
                                        &gt;
                                    </button>
                                </>
                            ) : null}
                        </div>

                        {/* Thumbnail Row - Matching Figma Frame 101:744 */}
                        {images.length > 1 ? (
                            <div className="flex gap-3 overflow-x-auto mt-4 pb-2">
                                {images.map((src, index) => (
                                    <button
                                        key={src + index}
                                        type="button"
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-50 border-2 p-1.5 transition ${index === currentImageIndex ? 'border-brand-red shadow-sm shadow-brand-red/10' : 'border-slate-200 hover:border-slate-350'}`}
                                    >
                                        <img src={src} alt="" className="h-full w-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </section>

                    {/* Right Column: Sales Info - Matching Figma Frame 101:753 */}
                    <section className="rounded-[32px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm text-left flex flex-col gap-5">
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.25em] text-brand-red">{detail.category || 'SmartZone'}</div>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 leading-snug break-words">{detail.name}</h1>
                            
                            {/* Rating and Stock Details - 101:757 */}
                            <div className="mt-3 flex items-center gap-3 text-sm font-bold text-slate-500">
                                <div className="flex items-center gap-1 text-amber-500">
                                    {renderStars(Math.round(reviewAverage))}
                                    <span className="text-amber-600 ml-1">{reviewAverage.toFixed(1)}</span>
                                </div>
                                <span className="text-slate-300">|</span>
                                <span className="text-brand-gray">{reviewTotal} đánh giá</span>
                                <span className="text-slate-300">|</span>
                                <span className={stockLeft > 0 ? 'text-emerald-600' : 'text-rose-500'}>
                                    {stockLeft > 0 ? 'Còn hàng' : 'Hết hàng'}
                                </span>
                            </div>
                        </div>

                        {/* Price Area - 101:774 */}
                        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-3xl font-black text-brand-red">{formatVnd(detail.price)}</span>
                                {detail.oldPrice ? (
                                    <span className="text-base text-slate-400 line-through">{formatVnd(detail.oldPrice)}</span>
                                ) : null}
                                {detail.discount > 0 ? (
                                    <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-black text-white">-{detail.discount}%</span>
                                ) : null}
                            </div>
                            <span className="text-xs text-slate-400 mt-1.5 font-semibold">Giá đã bao gồm VAT</span>
                        </div>

                        {/* Colors selection - 101:782 */}
                        {options.colors.length > 0 ? (
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Màu sắc: <span className="text-slate-800 font-bold ml-1">{selectedColor}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {options.colors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${selectedColor === color ? 'border-brand-red bg-brand-red/5 text-brand-red shadow-sm shadow-brand-red/5' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'}`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Storage Capacity selection - 101:791 */}
                        {options.capacities.length > 0 ? (
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    {detail?.category?.toLowerCase()?.includes('laptop') ? 'Cấu hình:' : detail?.category?.toLowerCase()?.includes('đồng hồ') || detail?.category?.toLowerCase()?.includes('màn hình') ? 'Kích thước:' : detail?.category?.toLowerCase()?.includes('âm thanh') ? 'Kết nối:' : 'Dung lượng:'}
                                    <span className="text-slate-800 font-bold ml-1">{selectedCapacity}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {options.capacities.map((capacity) => (
                                        <button
                                            key={capacity}
                                            type="button"
                                            onClick={() => setSelectedCapacity(capacity)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${selectedCapacity === capacity ? 'border-brand-red bg-brand-red/5 text-brand-red shadow-sm shadow-brand-red/5' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'}`}
                                        >
                                            {capacity}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Promotions - 101:801 */}
                        <div className="rounded-2xl border border-brand-red/10 bg-brand-red/5 p-4 text-left">
                            <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase tracking-wider mb-2.5">
                                🎁 KHUYẾN MÃI ƯU ĐÃI
                            </div>
                            <ul className="text-xs text-slate-650 space-y-2 leading-relaxed font-semibold">
                                <li>• Tặng gói bảo hành kim cương 12 tháng tại các cửa hàng SmartZone.</li>
                                <li>• Giảm thêm 500k khi thực hiện thanh toán qua VNPay.</li>
                                <li>• Thu cũ đổi mới trợ giá lên đến 2 triệu đồng.</li>
                            </ul>
                        </div>

                        {/* Quantity Stepper and Actions - 101:817 */}
                        <div className="mt-2 border-t border-slate-100 pt-4 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600">Số lượng mua</span>
                                <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                                    <button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="h-8 w-8 rounded-lg bg-slate-100 font-bold transition hover:bg-slate-200">-</button>
                                    <span className="min-w-8 text-center text-sm font-black text-slate-800">{qty}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQty((current) => {
                                            const next = current + 1;
                                            if (stockLeft) return Math.min(stockLeft, next);
                                            return next;
                                        })}
                                        className="h-8 w-8 rounded-lg bg-slate-100 font-bold transition hover:bg-slate-200"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                                <span>Thương hiệu: {detail.brand}</span>
                                <span>•</span>
                                <span>Đã bán: {Number(detail.sold || 0)}</span>
                                <span>•</span>
                                <span>Tồn kho: {stockLeft}</span>
                            </div>

                            <div className="flex gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={onAddToCart}
                                    disabled={stockLeft <= 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-red/20 bg-brand-red/5 px-6 py-4 text-sm font-black text-brand-red transition hover:bg-brand-red/10 disabled:cursor-not-allowed disabled:opacity-60 flex-1 md:flex-initial shadow-sm"
                                >
                                    Thêm vào giỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!isAuthenticated) {
                                            navigate('/login', { state: { from: location.pathname } });
                                            return;
                                        }
                                        const productId = detail.id || detail._id || detail.productId;
                                        const directItem = {
                                            productId: productId,
                                            quantity: totalQty,
                                            lineTotal: detail.price * totalQty,
                                            snapshot: {
                                                name: detail.name,
                                                brand: detail.brand,
                                                price: detail.price,
                                                image: detail.image,
                                                color: selectedColor,
                                                capacity: selectedCapacity
                                            }
                                        };
                                        navigate('/checkout', { state: { directItem } });
                                    }}
                                    disabled={stockLeft <= 0}
                                    className="flex-1 inline-flex items-center justify-center rounded-2xl bg-brand-red px-6 py-4 text-sm font-black text-white shadow-lg shadow-brand-red/20 transition hover:bg-[#a0101d] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                >
                                    MUA NGAY
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <section id="reviews" className="mt-10 scroll-mt-28">
                    <div className="mb-5 flex items-end justify-between gap-3">
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">REVIEWS</div>
                            <h2 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Bình luận và đánh giá</h2>
                        </div>
                        <p className="text-sm text-slate-500">Chỉ đơn đã giao thành công mới được gửi đánh giá.</p>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm text-left flex flex-col gap-6 h-fit">
                            {/* Detailed Summary Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 border-b border-slate-100 pb-6">
                                <div className="flex flex-col items-center justify-center rounded-2xl bg-orange-50/80 px-5 py-4 border border-orange-100 text-center min-w-[100px] shadow-sm flex-shrink-0">
                                    <span className="text-4xl font-black text-orange-600">{reviewAverage.toFixed(1)}</span>
                                    <div className="flex items-center gap-0.5 mt-1.5 text-[10px] text-amber-400">
                                        {renderStars(Math.round(reviewAverage))}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-450 uppercase mt-1.5 tracking-wider">{reviewTotal} đánh giá</span>
                                </div>
                                <div className="text-left flex-1 min-w-0 w-full sm:w-auto">
                                    <h3 className="text-base font-bold text-slate-900 whitespace-nowrap">Đánh giá khách hàng</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Ý kiến đóng góp từ khách hàng đã mua và trực tiếp trải nghiệm sản phẩm tại SmartZone.</p>
                                    <span className={`inline-flex items-center whitespace-nowrap mt-2.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        reviewData.canReview 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse' 
                                            : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                                    }`}>
                                        {reviewData.canReview ? '⭐ Bạn đủ điều kiện đánh giá!' : '🔒 Mua hàng để đánh giá sản phẩm'}
                                    </span>
                                </div>

                            </div>

                            {/* Ratings breakdown progress bars - clickable to filter */}
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = Number(reviewBreakdown?.[star] || 0);
                                    const percent = reviewTotal > 0 ? (count / reviewTotal) * 100 : 0;
                                    const isActive = reviewFilterRating === star;

                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => {
                                                const nextRating = isActive ? null : star;
                                                setReviewFilterRating(nextRating);
                                                setReviewPage(1);
                                                fetchReviews(slug, 1, nextRating);
                                            }}
                                            disabled={count === 0 && !isActive}
                                            className={`w-full flex items-center gap-3 text-xs font-bold rounded-xl px-3 py-1.5 transition-all duration-200 cursor-pointer ${
                                                isActive
                                                    ? 'bg-orange-50 border border-orange-200 text-orange-700 shadow-sm'
                                                    : count > 0
                                                        ? 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                                        : 'text-slate-300 border border-transparent cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 w-12 flex-shrink-0">
                                                <span>{star}</span>
                                                <StarFilled className="text-amber-400 text-[10px]" />
                                            </div>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-150/40 relative">
                                                <div className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{ width: `${percent}%` }} />
                                            </div>
                                            <div className="w-8 text-right text-slate-400 flex-shrink-0">{count}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active filter indicator */}
                            {reviewFilterRating && (
                                <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2.5">
                                    <span className="text-xs font-bold text-orange-700">
                                        Đang lọc: {reviewFilterRating} <StarFilled className="text-amber-400 text-[10px]" /> ({reviewData.pagination?.total || 0} đánh giá)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewFilterRating(null);
                                            setReviewPage(1);
                                            fetchReviews(slug, 1, null);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-800 transition cursor-pointer"
                                    >
                                        Xóa bộ lọc ✕
                                    </button>
                                </div>
                            )}

                            {reviewData.canReview ? (
                                <form onSubmit={submitReview} className="mt-2 rounded-3xl border border-orange-200/50 bg-gradient-to-br from-orange-50/40 to-amber-50/20 p-5 text-left shadow-sm">
                                    <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Viết đánh giá của bạn</div>
                                    <div className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                                        Đơn hàng <span className="font-bold text-slate-800">#{reviewData.reviewableOrder?.orderCode}</span> đã hoàn thành. 
                                        Đánh giá 5 sao để nhận ngay Voucher ưu đãi, các mức điểm khác sẽ được cộng điểm thưởng tích lũy!
                                    </div>

                                    {/* Premium Interactive Star Rating Selector */}
                                    <div className="mt-4 flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}
                                                className="text-2xl transition transform hover:scale-110 focus:outline-none"
                                                aria-label={`Chọn ${star} sao`}
                                            >
                                                <StarFilled className={star <= reviewForm.rating ? 'text-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.2)]' : 'text-slate-200'} />
                                            </button>
                                        ))}
                                        <span className="text-[10px] font-black ml-2 text-orange-600 uppercase tracking-wider">
                                            {reviewForm.rating === 5 ? 'Tuyệt vời!' :
                                             reviewForm.rating === 4 ? 'Tốt' :
                                             reviewForm.rating === 3 ? 'Bình thường' :
                                             reviewForm.rating === 2 ? 'Tệ' : 'Rất tệ'}
                                        </span>
                                    </div>

                                    <input
                                        value={reviewForm.title}
                                        onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                                        placeholder="Nhập tiêu đề tóm tắt đánh giá..."
                                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition"
                                    />
                                    <textarea
                                        value={reviewForm.content}
                                        onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))}
                                        rows={4}
                                        placeholder="Hãy chia sẻ trải nghiệm thực tế về tính năng, thiết kế hoặc dịch vụ của sản phẩm..."
                                        className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition"
                                    />

                                    <button
                                        type="submit"
                                        disabled={reviewSubmitting}
                                        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-orange-600 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/10 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {reviewSubmitting ? 'Đang gửi đánh giá...' : 'Gửi đánh giá ngay'}
                                    </button>

                                    {reviewFeedback ? (
                                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold leading-relaxed ${
                                            reviewFeedback.type === 'success' 
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm' 
                                                : 'border-amber-200 bg-amber-50 text-amber-800 shadow-sm'
                                        }`}>
                                            {reviewFeedback.message}
                                        </div>
                                    ) : null}
                                </form>
                            ) : (
                                <div className="mt-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-500 font-semibold leading-relaxed text-center">
                                    {reviewData.myReview
                                        ? '✨ Cảm ơn bạn! Bạn đã gửi đánh giá cho đơn hàng gần nhất của sản phẩm này.'
                                        : '🔒 Bạn chưa mua sản phẩm này hoặc đơn hàng chưa hoàn thành để mở khóa đánh giá.'}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 text-left">
                            {reviewLoading ? (
                                <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-500 shadow-sm">
                                    <LoadingOutlined className="mr-2 animate-spin text-orange-500 text-sm" /> Đang tải bình luận...
                                </div>
                            ) : reviewData.reviews.length ? (
                                <>
                                    {reviewData.reviews.map((review) => {
                                        const displayName = `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Khách hàng';

                                        return (
                                            <article key={review.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition duration-300 transform overflow-hidden">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {review.user?.image ? (
                                                            <img 
                                                                src={review.user.image} 
                                                                alt="" 
                                                                onClick={() => handleOpenProfile(review.user?.id)}
                                                                className="h-11 w-11 rounded-full object-cover border border-slate-200 cursor-pointer transition transform hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div 
                                                                onClick={() => handleOpenProfile(review.user?.id)}
                                                                className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 font-bold text-orange-700 cursor-pointer transition transform hover:scale-105"
                                                            >
                                                                {displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div 
                                                                onClick={() => handleOpenProfile(review.user?.id)}
                                                                className="font-bold text-slate-900 cursor-pointer hover:text-orange-500 transition text-sm"
                                                            >
                                                                {displayName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-1.5 flex-shrink-0">
                                                        <div className="flex items-center gap-0.5 text-amber-400 text-xs">{renderStars(review.rating)}</div>
                                                        <span className="text-xs font-black text-amber-600">{review.rating}/5</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 text-sm font-black text-slate-900 break-words">{review.title || 'Đánh giá sản phẩm'}</div>
                                                <p className="mt-2 text-xs leading-relaxed text-slate-650 font-medium break-all">{review.content}</p>

                                                {review.reward ? (
                                                    <div className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold ${
                                                        review.reward.rewardType === 'COUPON' 
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-100/60' 
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                                    }`}>
                                                        <span className="text-sm">🎁</span>
                                                        <span>{getRewardNoticeMessage(review.reward)}</span>
                                                    </div>
                                                ) : null}
                                            </article>
                                        );
                                    })}

                                    {/* Review Pagination */}
                                    {reviewData.pagination && reviewData.pagination.totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4">
                                            <button
                                                type="button"
                                                disabled={reviewPage <= 1}
                                                onClick={() => {
                                                    const prev = reviewPage - 1;
                                                    setReviewPage(prev);
                                                    fetchReviews(slug, prev, reviewFilterRating);
                                                }}
                                                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                                            >
                                                <LeftOutlined />
                                            </button>

                                            {Array.from({ length: reviewData.pagination.totalPages }, (_, i) => i + 1)
                                                .filter(p => {
                                                    const total = reviewData.pagination.totalPages;
                                                    if (total <= 5) return true;
                                                    if (p === 1 || p === total) return true;
                                                    return Math.abs(p - reviewPage) <= 1;
                                                })
                                                .reduce((acc, p, idx, arr) => {
                                                    if (idx > 0 && p - arr[idx - 1] > 1) {
                                                        acc.push('...');
                                                    }
                                                    acc.push(p);
                                                    return acc;
                                                }, [])
                                                .map((item, idx) =>
                                                    item === '...' ? (
                                                        <span key={`dots-${idx}`} className="text-slate-400 text-xs px-1">…</span>
                                                    ) : (
                                                        <button
                                                            key={item}
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewPage(item);
                                                                fetchReviews(slug, item, reviewFilterRating);
                                                            }}
                                                            className={`inline-flex items-center justify-center h-9 min-w-[36px] rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                                                                reviewPage === item
                                                                    ? 'bg-orange-600 text-white border border-orange-600 shadow-orange-500/20'
                                                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                            }`}
                                                        >
                                                            {item}
                                                        </button>
                                                    )
                                                )
                                            }

                                            <button
                                                type="button"
                                                disabled={reviewPage >= reviewData.pagination.totalPages}
                                                onClick={() => {
                                                    const next = reviewPage + 1;
                                                    setReviewPage(next);
                                                    fetchReviews(slug, next, reviewFilterRating);
                                                }}
                                                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                                            >
                                                <RightOutlined />
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400 shadow-sm leading-relaxed">
                                    {reviewFilterRating
                                        ? `Không có đánh giá ${reviewFilterRating} sao nào.`
                                        : (<>💬 Chưa có đánh giá nào cho sản phẩm này.<br />Hãy là người đầu tiên mua hàng và chia sẻ đánh giá của bạn!</>)
                                    }
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
                            <Link key={item.slug} to={`/product/${item.slug}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-red/10">
                                <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
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
                                        {loadingMap[getProductId(item)] ? (
                                            <LoadingOutlined />
                                        ) : isFavorite(item) ? (
                                            <HeartFilled />
                                        ) : (
                                            <HeartOutlined />
                                        )}
                                    </button>
                                    <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                </div>
                                <div className="p-4 text-left">
                                    <div className="text-xs uppercase tracking-wide text-brand-gray">{item.category}</div>
                                    <div className="mt-2 font-bold text-brand-dark">{item.name}</div>
                                    <div className="mt-2 text-brand-red">{formatVnd(item.price)}</div>
                                    <div className="mt-2 text-xs text-brand-gray">
                                        {Number(item.buyerCount || 0)} khách mua • {Number(item.commentCount || 0)} bình luận
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
                    </>
                )}
            </main>

            <Footer />

            <Modal
                title={null}
                open={profileModalOpen}
                onCancel={() => setProfileModalOpen(false)}
                footer={null}
                width={400}
                centered
                bodyStyle={{ padding: 0 }}
                styles={{ body: { padding: 0 } }}
            >
                <Spin spinning={loadingProfile}>
                    {profileUser && (
                        <div className="relative overflow-hidden rounded-3xl bg-white font-sans text-brand-dark">
                            {/* Decorative cover gradient */}
                            <div className="h-32 bg-gradient-to-br from-brand-red to-brand-dark relative">
                                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                            </div>
                            
                            {/* User Avatar */}
                            <div className="absolute top-16 left-1/2 -translate-x-1/2">
                                {profileUser.image ? (
                                    <img 
                                        src={profileUser.image} 
                                        alt="" 
                                        className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" 
                                    />
                                ) : (
                                    <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-red/10 text-brand-red font-bold text-3xl border-4 border-white shadow-lg">
                                        {profileUser.firstName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            
                            {/* User Content */}
                            <div className="pt-14 pb-6 px-6 text-center">
                                <h3 className="text-xl font-black text-brand-dark tracking-tight">
                                    {profileUser.firstName} {profileUser.lastName}
                                </h3>
                                
                                {/* Role Badge */}
                                <div className="mt-2">
                                    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                                        profileUser.roleId === 'R1' ? 'bg-red-100 text-red-600 border border-red-200' :
                                        profileUser.roleId === 'R3' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                                        profileUser.roleId === 'R4' ? 'bg-green-100 text-green-600 border border-green-200' :
                                        'bg-slate-100 text-brand-gray border border-border-color'
                                    }`}>
                                        {profileUser.roleId === 'R1' ? 'Admin' :
                                         profileUser.roleId === 'R3' ? 'Manager' :
                                         profileUser.roleId === 'R4' ? 'Shipper' : 'Khách hàng'}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-brand-gray mt-4 font-medium">{profileUser.email}</p>
                                
                                {/* Chat / Action button */}
                                <div className="mt-6 flex flex-col gap-2">
                                    {isAuthenticated ? (
                                        profileUser._id === myUserId || profileUser.id === myUserId ? (
                                            <div className="text-xs text-brand-gray py-2.5 font-medium">Đây là tài khoản của bạn</div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setProfileModalOpen(false);
                                                    navigate(`/chat?userId=${profileUser._id || profileUser.id}`);
                                                }}
                                                className="w-full bg-brand-dark hover:bg-black/80 text-white font-bold text-sm py-3 px-6 rounded-2xl transition duration-200 transform active:scale-95 shadow-md shadow-slate-950/10"
                                            >
                                                Nhắn tin
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setProfileModalOpen(false);
                                                navigate('/login');
                                            }}
                                            className="w-full bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm py-3 px-6 rounded-2xl transition duration-200 transform active:scale-95 shadow-md shadow-brand-red/10"
                                        >
                                            Đăng nhập để nhắn tin
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default ProductDetailPage;
