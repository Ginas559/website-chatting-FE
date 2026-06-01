import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { HeartFilled, HeartOutlined, LoadingOutlined } from '@ant-design/icons';
import { HomeOutlined, LogoutOutlined, SearchOutlined, ShoppingCartOutlined, SnippetsOutlined } from '@ant-design/icons';
import { fetchUserProfile, logoutUser } from '../redux/slices/authSlice';
import { clearProfileFeedback, fetchProfile, resetProfileState, saveProfile } from '../redux/slices/profileSlice';
import ProfileInput from '../components/profile/ProfileInput';
import ProfileForm from '../components/profile/ProfileForm';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard';
import useFavorites from '../hooks/useFavorites';
import { getFavoriteProductsApi, getRecentlyViewedProductsApi } from '../util/api';
import { getProductId } from '../util/productId';

const mapProfileToForm = (profile = {}) => ({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    bio: '',
    avatar: '',
    ...profile,
});

const buildProfilePayload = (values) => {
    return Object.entries(values).reduce((payload, [key, value]) => {
        const normalizedValue = typeof value === 'string' ? value.trim() : value;

        if (normalizedValue !== '' && normalizedValue !== null && normalizedValue !== undefined) {
            payload[key] = normalizedValue;
        }

        return payload;
    }, {});
};

const getStoredAuthUser = () => {
    try {
        const raw = localStorage.getItem('authUser');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const mergeProfileWithAccount = (profile = {}, account = {}) => {
    const rewardCoupons = Array.isArray(account.rewardCoupons)
        ? account.rewardCoupons
        : Array.isArray(profile.rewardCoupons)
            ? profile.rewardCoupons
            : [];

    return {
        ...account,
        ...profile,
        id: profile.id || account.id || account._id || '',
        email: profile.email || account.email || '',
        firstName: profile.firstName || account.firstName || '',
        lastName: profile.lastName || account.lastName || '',
        phone: profile.phone || account.phone || account.phoneNumber || '',
        rewardPoints: Number(account.rewardPoints ?? profile.rewardPoints ?? 0),
        rewardCoupons,
        updatedAt: profile.updatedAt || account.updatedAt,
    };
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

const ProfileEditor = ({
    userId,
    profileData,
    loading,
    saving,
    error,
    successMessage,
    userEmail,
    onLogout,
}) => {
    const dispatch = useDispatch();
    const [form, setForm] = useState(() => mapProfileToForm(profileData));
    const [localError, setLocalError] = useState('');

    const completion = useMemo(() => {
        const fields = ['firstName', 'lastName', 'phone', 'address', 'city', 'country', 'bio', 'avatar'];
        const filledCount = fields.reduce((count, field) => {
            const value = form[field];
            const hasValue = typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

            return count + (hasValue ? 1 : 0);
        }, 0);

        return Math.round((filledCount / fields.length) * 100);
    }, [form]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (localError) setLocalError('');
        if (error || successMessage) dispatch(clearProfileFeedback());
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!userId) {
            setLocalError('Thiếu userId nên không thể cập nhật profile.');
            return;
        }

        const payload = buildProfilePayload(form);

        if (Object.keys(payload).length === 0) {
            setLocalError('Hãy nhập ít nhất một field hợp lệ trước khi lưu profile.');
            return;
        }

        setLocalError('');

        try {
            await dispatch(saveProfile({ userId, values: payload, method: 'patch' })).unwrap();
        } catch (submitError) {
            setLocalError(
                typeof submitError === 'string'
                    ? submitError
                    : submitError?.message || 'Cập nhật profile thất bại'
            );
        }
    };

    return (
        <>
            <ProfileSummaryCard
                profileData={profileData}
                loading={loading}
                saving={saving}
                error={error || localError}
                successMessage={successMessage}
                userEmail={userEmail}
                userName={`${form.firstName || profileData.firstName || 'User'} ${form.lastName || profileData.lastName || ''}`.trim()}
                onLogout={onLogout}
            />

            <ProfileForm
                title="Thông tin cá nhân"
                onSubmit={handleSubmit}
                footer={(
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                    </button>
                )}
            >
                <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left text-sm text-orange-700">
                    Hồ sơ đã hoàn thiện {completion}%. Bạn có thể cập nhật thêm số điện thoại, địa chỉ và ảnh đại diện.
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <ProfileInput label="Tên" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Nguyễn" />
                    <ProfileInput label="Họ và tên đệm" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Văn A" />
                    <ProfileInput label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} placeholder="0123456789" />
                    <ProfileInput label="Ảnh đại diện URL" name="avatar" value={form.avatar} onChange={handleChange} placeholder="https://..." />
                    <ProfileInput label="Địa chỉ" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, đường, phường/xã" className="md:col-span-2" />
                    <ProfileInput label="Thành phố" name="city" value={form.city} onChange={handleChange} placeholder="TP. Hồ Chí Minh" />
                    <ProfileInput label="Quốc gia" name="country" value={form.country} onChange={handleChange} placeholder="Việt Nam" />
                    <ProfileInput label="Giới thiệu ngắn" multiline name="bio" value={form.bio} onChange={handleChange} placeholder="Một vài dòng giới thiệu..." className="md:col-span-2" rows={5} />
                </div>
            </ProfileForm>
        </>
    );
};

const UserProfilePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { data, loading, saving, error, successMessage } = useSelector((state) => state.profile);
    const { isFavorite, toggleFavorite, loadingMap } = useFavorites();
    const [favoriteProducts, setFavoriteProducts] = useState([]);
    const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);

    const userId = useMemo(() => {
        const storedUserId = localStorage.getItem('userId');
        const authUser = (() => {
            try {
                return JSON.parse(localStorage.getItem('authUser') || '{}');
            } catch {
                return {};
            }
        })();
        const tokenPayload = decodeJwtPayload(localStorage.getItem('accessToken'));

        return user?.id || storedUserId || authUser?.id || tokenPayload?.id || '';
    }, [user]);

    useEffect(() => {
        if (!userId) {
            return;
        }

        dispatch(fetchProfile(userId));
        dispatch(fetchUserProfile());
    }, [dispatch, userId]);

    useEffect(() => {
        return () => {
            dispatch(resetProfileState());
        };
    }, [dispatch]);

    useEffect(() => {
        let isMounted = true;
        const loadProductSections = async () => {
            try {
                const [favoritesRes, viewedRes] = await Promise.all([
                    getFavoriteProductsApi(),
                    getRecentlyViewedProductsApi(),
                ]);
                if (!isMounted) return;
                setFavoriteProducts(Array.isArray(favoritesRes?.data?.items) ? favoritesRes.data.items : []);
                setRecentlyViewedProducts(Array.isArray(viewedRes?.data?.items) ? viewedRes.data.items : []);
            } catch {
                if (!isMounted) return;
                setFavoriteProducts([]);
                setRecentlyViewedProducts([]);
            }
        };

        loadProductSections();
        window.addEventListener('favorites:updated', loadProductSections);
        return () => {
            isMounted = false;
            window.removeEventListener('favorites:updated', loadProductSections);
        };
    }, []);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const accountUser = useMemo(() => {
        const stored = getStoredAuthUser();
        return {
            ...stored,
            ...(user || {}),
            id: user?.id || stored?.id || userId,
        };
    }, [user, userId]);

    const profileData = useMemo(
        () => mergeProfileWithAccount(data || {}, accountUser),
        [data, accountUser],
    );

    const onToggleFavorite = async (product) => {
        const result = await toggleFavorite(product, () => navigate('/login'));
        if (result?.error) {
            return;
        }
        const refresh = await getFavoriteProductsApi();
        setFavoriteProducts(Array.isArray(refresh?.data?.items) ? refresh.data.items : []);
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

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <Link to="/" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <HomeOutlined />
                            Trang chủ
                        </Link>
                        <Link to="/search" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <SearchOutlined />
                            Tìm kiếm
                        </Link>
                        <Link to="/orders" className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                            <SnippetsOutlined />
                            Đơn hàng
                        </Link>
                        <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                            <ShoppingCartOutlined />
                            Giỏ hàng
                        </Link>
                        <button
                            onClick={handleLogout}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                            <LogoutOutlined />
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <div className="mb-6 rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Tài khoản thành viên</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Thông tin cá nhân</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Cập nhật thông tin giao hàng và liên hệ để đặt hàng nhanh hơn trong các lần mua tiếp theo.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                    <ProfileEditor
                        key={data?.updatedAt || userId || 'profile-editor'}
                        userId={userId}
                        profileData={profileData}
                        loading={loading}
                        saving={saving}
                        error={error}
                        successMessage={successMessage}
                        userEmail={user?.email}
                        onLogout={handleLogout}
                    />
                </div>

                <section className="mt-8 rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Favorites</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-900">Sản phẩm yêu thích</h2>
                        </div>
                    </div>
                    {!favoriteProducts.length ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Bạn chưa có sản phẩm yêu thích nào.
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {favoriteProducts.map((product) => (
                                <Link key={product.id} to={`/product/${product.slug || product.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                onToggleFavorite(product);
                                            }}
                                            className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-base text-rose-500 shadow transition hover:scale-105"
                                        >
                                            {loadingMap[getProductId(product)]
                                                ? <LoadingOutlined />
                                                : isFavorite(product) ? <HeartFilled /> : <HeartOutlined />}
                                        </button>
                                        <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                    </div>
                                    <div className="p-4 text-left">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">{product.category}</div>
                                        <div className="mt-2 font-bold text-slate-900">{product.name}</div>
                                        <div className="mt-2 text-orange-600">{Number(product.price || 0).toLocaleString('vi-VN')}đ</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-8 rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Recently Viewed</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">Sản phẩm đã xem</h2>
                    {!recentlyViewedProducts.length ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Chưa có sản phẩm đã xem gần đây.
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {recentlyViewedProducts.map((product) => (
                                <Link key={product.id} to={`/product/${product.slug || product.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                                    <img src={product.image} alt={product.name} className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-105" />
                                    <div className="p-4 text-left">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">{product.category}</div>
                                        <div className="mt-2 font-bold text-slate-900">{product.name}</div>
                                        <div className="mt-2 text-orange-600">{Number(product.price || 0).toLocaleString('vi-VN')}đ</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default UserProfilePage;
