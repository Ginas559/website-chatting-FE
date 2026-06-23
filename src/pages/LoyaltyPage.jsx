import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    CheckCircleOutlined,
    GiftOutlined,
    HeartOutlined,
    HistoryOutlined,
    HomeOutlined,
    LoadingOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
    SnippetsOutlined,
    StarOutlined,
    TrophyOutlined,
} from '@ant-design/icons';
import { getMyLoyaltyApi } from '../util/api';

const formatVnd = (value) => Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const formatDate = (value) => {
    if (!value) return 'Không giới hạn';
    return new Date(value).toLocaleDateString('vi-VN');
};

const levelTone = {
    BRONZE: 'from-orange-500 to-red-500',
    SILVER: 'from-slate-500 to-slate-700',
    GOLD: 'from-amber-400 to-orange-500',
    DIAMOND: 'from-cyan-400 to-blue-600',
};

const iconByMission = {
    FIRST_DELIVERED_ORDER: SnippetsOutlined,
    WRITE_REVIEW: StarOutlined,
    SAVE_FAVORITES: HeartOutlined,
    WATCH_LIVE: GiftOutlined,
};

const StatCard = ({ label, value, hint }) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
        <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
        {hint ? <div className="mt-1 text-sm font-medium text-slate-500">{hint}</div> : null}
    </div>
);

const LoyaltyPage = () => {
    const { isAuthenticated } = useSelector((state) => state.auth);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) return;

        let isMounted = true;
        const loadLoyalty = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getMyLoyaltyApi();
                if (!isMounted) return;
                setData(response?.data || null);
            } catch (err) {
                if (!isMounted) return;
                setError(err?.errMessage || err?.message || 'Không thể tải ví ưu đãi');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void loadLoyalty();
        return () => {
            isMounted = false;
        };
    }, [isAuthenticated]);

    const membership = data?.membership || {};
    const currentLevel = membership.current || { key: 'BRONZE', name: 'Bronze' };
    const levelClass = levelTone[currentLevel.key] || levelTone.BRONZE;
    const activeCoupons = data?.coupons?.active || [];
    const inactiveCoupons = data?.coupons?.inactive || [];
    const missions = data?.missions || [];
    const completedMissions = useMemo(() => missions.filter((mission) => mission.completed).length, [missions]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 lg:px-6">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-xl font-black text-white shadow-lg shadow-orange-300/40">S</span>
                        <div className="text-left">
                            <div className="text-lg font-black text-slate-900">SmartZone Store</div>
                            <div className="text-xs uppercase tracking-[0.2em] text-orange-600">Loyalty Center</div>
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
                        <Link to="/cart" className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                            <ShoppingCartOutlined />
                            Giỏ hàng
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
                {loading ? (
                    <div className="grid min-h-[420px] place-items-center rounded-3xl border border-orange-100 bg-white text-orange-600">
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <LoadingOutlined />
                            Đang tải ví ưu đãi...
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
                ) : (
                    <div className="space-y-7">
                        <section className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${levelClass} p-6 text-white shadow-xl shadow-orange-200/50`}>
                            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                                        <TrophyOutlined />
                                        {currentLevel.name} Member
                                    </div>
                                    <h1 className="mt-5 text-4xl font-black tracking-tight text-white drop-shadow-sm">Ví ưu đãi của {data?.profile?.name || 'bạn'}</h1>
                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                                        Điểm tích lũy, voucher thưởng review và nhiệm vụ mua sắm được gom lại tại đây để bạn theo dõi dễ hơn.
                                    </p>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-3xl bg-white/15 p-4">
                                            <div className="text-sm font-semibold text-white/75">Điểm hiện có</div>
                                            <div className="mt-1 text-3xl font-black">{data?.rewardPoints || 0}</div>
                                        </div>
                                        <div className="rounded-3xl bg-white/15 p-4">
                                            <div className="text-sm font-semibold text-white/75">Voucher khả dụng</div>
                                            <div className="mt-1 text-3xl font-black">{activeCoupons.length}</div>
                                        </div>
                                        <div className="rounded-3xl bg-white/15 p-4">
                                            <div className="text-sm font-semibold text-white/75">Nhiệm vụ hoàn tất</div>
                                            <div className="mt-1 text-3xl font-black">{completedMissions}/{missions.length}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[28px] bg-white p-5 text-slate-900 shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Level Progress</div>
                                            <div className="mt-1 text-2xl font-black">{currentLevel.name}</div>
                                        </div>
                                        <TrophyOutlined className="text-3xl text-orange-500" />
                                    </div>
                                    <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${membership.progressPercent || 0}%` }} />
                                    </div>
                                    <div className="mt-3 text-sm font-semibold text-slate-600">
                                        {membership.next
                                            ? `Còn ${membership.pointsToNext} điểm để lên ${membership.next.name}.`
                                            : 'Bạn đã đạt hạng cao nhất hiện tại.'}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-4 md:grid-cols-4">
                            <StatCard label="Đơn đã giao" value={data?.stats?.deliveredOrders || 0} hint="Cơ sở mở quyền review" />
                            <StatCard label="Đánh giá" value={data?.stats?.reviews || 0} hint="Nguồn nhận điểm/voucher" />
                            <StatCard label="Yêu thích" value={data?.stats?.favorites || 0} hint="Tín hiệu cá nhân hóa" />
                            <StatCard label="Tổng voucher" value={data?.coupons?.total || 0} hint="Cá nhân và đã nhận" />
                        </section>

                        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Mission Board</p>
                                        <h2 className="mt-1 text-2xl font-black text-slate-950">Nhiệm vụ kiếm thưởng</h2>
                                    </div>
                                    <GiftOutlined className="text-3xl text-orange-500" />
                                </div>
                                <div className="mt-5 grid gap-4">
                                    {missions.map((mission) => {
                                        const MissionIcon = iconByMission[mission.key] || GiftOutlined;
                                        return (
                                            <div key={mission.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex gap-4">
                                                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${mission.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {mission.completed ? <CheckCircleOutlined /> : <MissionIcon />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <h3 className="font-black text-slate-950">{mission.title}</h3>
                                                            <Link to={mission.actionPath} className="text-sm font-bold text-orange-600 hover:text-orange-700">{mission.actionLabel}</Link>
                                                        </div>
                                                        <p className="mt-1 text-sm leading-6 text-slate-500">{mission.description}</p>
                                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${mission.progressPercent}%` }} />
                                                        </div>
                                                        <div className="mt-2 text-xs font-semibold text-slate-500">{mission.current}/{mission.target}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Voucher Wallet</p>
                                        <h2 className="mt-1 text-2xl font-black text-slate-950">Voucher cá nhân</h2>
                                    </div>
                                    <GiftOutlined className="text-3xl text-orange-500" />
                                </div>
                                <div className="mt-5 space-y-3">
                                    {activeCoupons.length === 0 ? (
                                        <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                                            Chưa có voucher cá nhân khả dụng. Hãy review sản phẩm đã mua để nhận thưởng.
                                        </div>
                                    ) : activeCoupons.map((coupon) => (
                                        <div key={coupon.code} className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-lg font-black text-orange-700">{coupon.code}</div>
                                                    <div className="mt-1 text-sm font-semibold text-slate-700">Giảm {coupon.discountPercent}% cho đơn từ {formatVnd(coupon.minOrderAmount)}</div>
                                                    <div className="mt-1 text-xs text-slate-500">Hạn dùng: {formatDate(coupon.expiresAt)}</div>
                                                </div>
                                                <Link to="/checkout" className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Dùng</Link>
                                            </div>
                                        </div>
                                    ))}
                                    {inactiveCoupons.length > 0 ? (
                                        <div className="pt-3 text-xs font-semibold text-slate-500">
                                            {inactiveCoupons.length} voucher đã dùng hoặc hết hạn vẫn được lưu trong lịch sử tài khoản.
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Reward History</p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-950">Lịch sử thưởng gần đây</h2>
                                </div>
                                <HistoryOutlined className="text-3xl text-orange-500" />
                            </div>
                            <div className="mt-5 grid gap-3">
                                {!data?.rewardHistory?.length ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                                        Chưa có lịch sử thưởng. Sau khi review sản phẩm, phần thưởng sẽ xuất hiện ở đây.
                                    </div>
                                ) : data.rewardHistory.map((item) => (
                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                        <div>
                                            <div className="font-black text-slate-950">{item.title}</div>
                                            <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                                        </div>
                                        <div className="text-right text-sm font-semibold text-slate-500">
                                            <div>{formatDate(item.createdAt)}</div>
                                            {item.couponCode ? <div className="text-orange-600">{item.couponCode}</div> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LoyaltyPage;
