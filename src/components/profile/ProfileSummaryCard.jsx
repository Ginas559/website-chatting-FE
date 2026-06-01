import { useEffect, useMemo, useRef, useState } from 'react';

const PROFILE_FIELDS = ['firstName', 'lastName', 'phone', 'address', 'city', 'country', 'bio', 'avatar'];

const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const sortRewardCoupons = (coupons = []) => {
    return [...coupons].sort((a, b) => {
        const timeA = new Date(a?.createdAt || a?.expiresAt || 0).getTime();
        const timeB = new Date(b?.createdAt || b?.expiresAt || 0).getTime();
        return timeB - timeA;
    });
};

const getCompletion = (profile = {}) => {
    const filledCount = PROFILE_FIELDS.reduce((count, field) => {
        const value = profile[field];
        const hasValue = typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

        return count + (hasValue ? 1 : 0);
    }, 0);

    return Math.round((filledCount / PROFILE_FIELDS.length) * 100);
};

const statCards = [
    { label: 'Hoàn thiện', valueKey: 'completion', suffix: '%' },
    { label: 'Đã nhập', valueKey: 'filled', suffix: '/8' },
    { label: 'Cập nhật', valueKey: 'updatedAt', suffix: '' },
];

const ProfileSummaryCard = ({
    profileData,
    loading,
    saving,
    error,
    successMessage,
    userEmail,
    userName,
    onLogout,
}) => {
    const [copyLabel, setCopyLabel] = useState('Sao chép email');
    const copyTimerRef = useRef(null);

    const email = profileData.email || userEmail || '';
    const displayName = userName || [profileData.firstName, profileData.lastName].filter(Boolean).join(' ').trim() || 'Người dùng';
    const avatarFallback = displayName.slice(0, 1).toUpperCase();
    const rewardPoints = Number(profileData.rewardPoints || 0);
    const rewardCoupons = sortRewardCoupons(
        Array.isArray(profileData.rewardCoupons) ? profileData.rewardCoupons : []
    );
    const activeCoupons = rewardCoupons.filter((coupon) => !coupon?.isUsed);
    const displayCoupons = activeCoupons.length ? activeCoupons : rewardCoupons;

    const completion = useMemo(() => getCompletion(profileData), [profileData]);
    const filledFieldCount = Math.round((completion / 100) * PROFILE_FIELDS.length);
    const updatedAt = formatDateTime(profileData.updatedAt);

    const statusInfo = loading
        ? { label: 'Đang tải dữ liệu', tone: 'bg-sky-50 text-sky-700 border-sky-100' }
        : saving
            ? { label: 'Đang lưu thay đổi', tone: 'bg-amber-50 text-amber-700 border-amber-100' }
            : error
                ? { label: 'Có lỗi khi tải/lưu', tone: 'bg-red-50 text-red-700 border-red-100' }
                : successMessage
                    ? { label: 'Cập nhật thành công', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
                    : { label: 'Sẵn sàng chỉnh sửa', tone: 'bg-orange-50 text-orange-700 border-orange-100' };

    const handleCopyEmail = async () => {
        if (!email) return;

        try {
            await navigator.clipboard.writeText(email);
            setCopyLabel('Đã sao chép');

            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }

            copyTimerRef.current = window.setTimeout(() => {
                setCopyLabel('Sao chép email');
            }, 1600);
        } catch {
            setCopyLabel('Không thể sao chép');
        }
    };

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    return (
        <aside className="relative overflow-hidden rounded-[28px] border border-slate-300 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-orange-50 via-red-50 to-rose-50" />
            <div className="relative flex flex-col items-center text-center">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 p-1 shadow-[0_20px_40px_rgba(248,113,113,0.24)]">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-100">
                        {profileData.avatar ? (
                            <img src={profileData.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-4xl font-black text-slate-500">{avatarFallback}</span>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                        Thành viên
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.tone}`}>
                        {statusInfo.label}
                    </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{displayName}</h2>

                <p className="mt-1 text-sm text-slate-500">{email || 'Chưa có email'}</p>

                <div className="mt-6 w-full rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-left">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">Độ hoàn thiện hồ sơ</span>
                        <span className="font-bold text-slate-900">{completion}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{filledFieldCount}/{PROFILE_FIELDS.length} trường đã có dữ liệu</span>
                        <span>{updatedAt}</span>
                    </div>
                </div>

                {rewardPoints > 0 || rewardCoupons.length > 0 ? (
                    <div className="mt-5 grid w-full gap-3 text-left sm:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Điểm tích lũy</p>
                            <p className="mt-2 text-2xl font-black text-emerald-700">{rewardPoints}</p>
                            <p className="mt-1 text-xs text-emerald-700/80">Dùng cho lần mua sau</p>
                        </div>
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Mã giảm giá</p>
                            <p className="mt-2 text-2xl font-black text-orange-700">{displayCoupons.length}</p>
                            <p className="mt-1 text-xs text-orange-700/80">Mã còn hiệu lực trong kho</p>
                        </div>
                    </div>
                ) : null}

                {displayCoupons.length ? (
                    <div className="mt-4 w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold text-slate-900">Danh sách mã thưởng</h3>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{displayCoupons.length} mã</span>
                        </div>
                        <div className="mt-3 space-y-3">
                            {displayCoupons.map((coupon) => (
                                <div
                                    key={coupon.code || coupon._id}
                                    className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3"
                                >
                                    <div className="text-xs uppercase tracking-[0.18em] text-orange-700">{coupon.code}</div>
                                    <div className="mt-1 text-sm font-semibold text-slate-900">
                                        Giảm {coupon.discountPercent}% cho đơn tiếp theo
                                        {coupon.minOrderAmount
                                            ? ` (đơn tối thiểu ${Number(coupon.minOrderAmount).toLocaleString('vi-VN')}đ)`
                                            : ''}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        Hạn dùng: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                                    </div>
                                    {coupon.isUsed ? (
                                        <div className="mt-2 text-xs font-semibold text-slate-500">Đã sử dụng</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-5 grid w-full gap-3">
                    {statCards.map((card) => {
                        const value = card.valueKey === 'completion'
                            ? completion
                            : card.valueKey === 'filled'
                                ? filledFieldCount
                                : updatedAt;

                        return (
                            <div key={card.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                                <p className="shrink-0 text-right text-base font-bold text-slate-900">
                                    {value}
                                    <span className="ml-0.5 text-sm font-semibold text-slate-400">{card.suffix}</span>
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={handleCopyEmail}
                        disabled={!email}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {copyLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-xl"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ProfileSummaryCard;
