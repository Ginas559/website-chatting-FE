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
    const [copiedCoupon, setCopiedCoupon] = useState('');
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
                    : { label: 'Sẵn sàng chỉnh sửa', tone: 'bg-brand-red/5 text-brand-red border-brand-red/10' };

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

    const handleCopyCoupon = async (code) => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCoupon(code);
            window.setTimeout(() => setCopiedCoupon(''), 1500);
        } catch {}
    };

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    return (
        <aside className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-brand-red/5 via-brand-red/10 to-rose-50" />
            <div className="relative flex flex-col items-center text-center">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-brand-red via-red-500 to-rose-500 p-1 shadow-lg">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-100">
                        {profileData.avatar ? (
                            <img src={profileData.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-4xl font-black text-slate-500">{avatarFallback}</span>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-brand-red/15 bg-brand-red/5 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-brand-red">
                        Thành viên
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider ${statusInfo.tone}`}>
                        {statusInfo.label}
                    </span>
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-900 font-sans">{displayName}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">{email || 'Chưa liên kết email'}</p>

                <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Hồ sơ cá nhân</span>
                        <span className="text-brand-red">{completion}%</span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-red to-red-500 transition-all duration-500"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                        <span>Đã nhập {filledFieldCount}/{PROFILE_FIELDS.length} mục</span>
                        <span>{updatedAt !== 'Chưa cập nhật' ? updatedAt : 'Mới tạo'}</span>
                    </div>
                </div>

                {rewardPoints > 0 || rewardCoupons.length > 0 ? (
                    <div className="mt-5 grid w-full gap-3 text-left sm:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Điểm tích lũy</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700 leading-none">{rewardPoints}</p>
                            <p className="mt-1.5 text-[10px] font-semibold text-emerald-700/80">S-Points khả dụng</p>
                        </div>
                        <div className="rounded-2xl border border-brand-red/15 bg-brand-red/5 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-brand-red">Mã giảm giá</p>
                            <p className="mt-1 text-2xl font-black text-brand-red leading-none">{displayCoupons.length}</p>
                            <p className="mt-1.5 text-[10px] font-semibold text-brand-red/80">Ưu đãi của tôi</p>
                        </div>
                    </div>
                ) : null}

                {displayCoupons.length > 0 && (
                    <div className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50/50 p-4 text-left">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans">Mã ưu đãi của bạn</h3>
                            <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-500 uppercase">{displayCoupons.length} mã</span>
                        </div>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {displayCoupons.map((coupon) => {
                                const isCopied = copiedCoupon === coupon.code;
                                return (
                                    <div
                                        key={coupon.code || coupon._id}
                                        className="relative flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-red/35 bg-white p-3.5 shadow-sm overflow-hidden"
                                    >
                                        {/* Left/Right circle tickets cutouts */}
                                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 border-r border-dashed border-brand-red/35 rounded-full" />
                                        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 border-l border-dashed border-brand-red/35 rounded-full" />
                                        
                                        <div className="min-w-0 text-left pl-1.5 space-y-1">
                                            <div className="text-xs font-black uppercase tracking-widest text-brand-red">{coupon.code}</div>
                                            <div className="text-[11px] font-bold text-slate-800 leading-snug">
                                                Giảm {coupon.discountPercent}% cho đơn sau
                                                {coupon.minOrderAmount && (
                                                    <span className="block text-[10px] text-slate-400 font-medium">Tối thiểu: {Number(coupon.minOrderAmount).toLocaleString('vi-VN')}đ</span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">
                                                Hạn: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                                            </div>
                                            {coupon.isUsed && (
                                                <span className="inline-block bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">Đã sử dụng</span>
                                            )}
                                        </div>

                                        {!coupon.isUsed && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyCoupon(coupon.code)}
                                                className={`shrink-0 h-7 px-3.5 text-[10px] font-bold rounded-lg border transition ${
                                                    isCopied 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                                        : 'bg-brand-red/5 text-brand-red border-brand-red/10 hover:bg-brand-red hover:text-white'
                                                }`}
                                            >
                                                {isCopied ? 'Copied' : 'Lấy mã'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mt-6 grid w-full gap-3">
                    {statCards.map((card) => {
                        const value = card.valueKey === 'completion'
                            ? completion
                            : card.valueKey === 'filled'
                                ? filledFieldCount
                                : updatedAt;

                        return (
                            <div key={card.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                                <p className="shrink-0 text-right text-sm font-extrabold text-slate-900 font-sans">
                                    {value}
                                    <span className="ml-0.5 text-xs font-semibold text-slate-400">{card.suffix}</span>
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
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-red/35 hover:bg-brand-red/5 hover:text-brand-red disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {copyLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center justify-center rounded-2xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition hover:-translate-y-0.5 hover:bg-brand-red-hover hover:shadow-xl"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ProfileSummaryCard;
