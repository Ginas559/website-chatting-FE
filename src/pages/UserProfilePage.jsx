import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../redux/slices/authSlice';
import { clearProfileFeedback, fetchProfile, resetProfileState, saveProfile } from '../redux/slices/profileSlice';
import ProfileInput from '../components/profile/ProfileInput';
import ProfileForm from '../components/profile/ProfileForm';

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
}) => {
    const dispatch = useDispatch();
    const [form, setForm] = useState(() => mapProfileToForm(profileData));
    const [localError, setLocalError] = useState('');

    const avatarFallback = (form.firstName || profileData.firstName || 'U').slice(0, 1).toUpperCase();

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

        setLocalError('');

        try {
            await dispatch(saveProfile({ userId, values: form, method: 'patch' })).unwrap();
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
            <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col items-center text-center">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-indigo-100 bg-slate-100 shadow-lg">
                        {form.avatar ? (
                            <img src={form.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-400">
                                {avatarFallback}
                            </div>
                        )}
                    </div>

                    <h2 className="mt-4 text-2xl font-black text-slate-900">
                        {(form.firstName || profileData.firstName || 'User').trim()} {(form.lastName || profileData.lastName || '').trim()}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">{profileData.email || userEmail || 'Chưa có email'}</p>

                    <div className="mt-6 w-full rounded-2xl bg-slate-50 p-4 text-left">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Trạng thái</p>
                        <p className="mt-2 text-sm text-slate-700">
                            {loading ? 'Đang tải profile...' : saving ? 'Đang lưu dữ liệu...' : 'Sẵn sàng chỉnh sửa'}
                        </p>
                    </div>

                    {(successMessage || localError || error) ? (
                        <div className={`mt-4 w-full rounded-2xl px-4 py-3 text-left text-sm ${successMessage ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {successMessage || localError || error}
                        </div>
                    ) : null}
                </div>
            </aside>

            <ProfileForm
                title="Thông tin profile"
                description="Các field bên dưới khớp đúng backend bài 02, có thể cập nhật ngay bằng PATCH."
                onSubmit={handleSubmit}
                footer={(
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu profile'}
                    </button>
                )}
            >
                <div className="grid gap-5 md:grid-cols-2">
                    <ProfileInput label="First name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" />
                    <ProfileInput label="Last name" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Doe" />
                    <ProfileInput label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="0123456789" />
                    <ProfileInput label="Avatar URL" name="avatar" value={form.avatar} onChange={handleChange} placeholder="https://..." />
                    <ProfileInput label="Address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main St" className="md:col-span-2" />
                    <ProfileInput label="City" name="city" value={form.city} onChange={handleChange} placeholder="New York" />
                    <ProfileInput label="Country" name="country" value={form.country} onChange={handleChange} placeholder="USA" />
                    <ProfileInput label="Bio" multiline name="bio" value={form.bio} onChange={handleChange} placeholder="Short introduction..." className="md:col-span-2" rows={5} />
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
    }, [dispatch, userId]);

    useEffect(() => {
        return () => {
            dispatch(resetProfileState());
        };
    }, [dispatch]);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    const profileData = data || {};

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)] px-4 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.28em] text-indigo-600">Profile</p>
                        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Chỉnh sửa hồ sơ cá nhân</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Trang này fetch dữ liệu từ API bài 02, dùng Redux Toolkit để quản lý state và Axios interceptor để tự gắn Bearer token.
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                    >
                        Đăng xuất
                    </button>
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
                    />
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;