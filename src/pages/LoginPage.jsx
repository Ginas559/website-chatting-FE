import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, clearError, logoutUser } from '../redux/slices/authSlice';
import AuthShell from '../components/common/AuthShell';
import FormInput from '../components/common/FormInput';
import SubmitButton from '../components/common/SubmitButton';
import StatusAlert from '../components/common/StatusAlert';
import iphone16Img from '../assets/iphone-16.png';

const getFeedbackMessage = (payload, fallback = 'Đăng nhập thất bại') => {
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    if (payload?.errors?.length > 0) return payload.errors[0].msg;
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;
    if (payload?.errMessage) return payload.errMessage;
    return fallback;
};

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, user } = useSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [feedbackMsg, setFeedbackMsg] = useState('');

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        setSuccessMsg('');
        setFeedbackMsg('');

        const result = await dispatch(loginUser({ email, password }));

        if (loginUser.fulfilled.match(result)) {
            const roleId = (result.payload?.user || user)?.roleId;

            if (roleId !== 'R2') {
                await dispatch(logoutUser());
                setFeedbackMsg('Tài khoản nhân sự vui lòng đăng nhập tại Staff Portal');
                return;
            }

            setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...');
            setTimeout(() => {
                navigate('/');
            }, 800);
            return;
        }

        setFeedbackMsg(getFeedbackMessage(result.payload));
    };

    const loginLeftSide = (
        <div className="flex-1 flex flex-col justify-between h-full relative z-10">
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-brand-red font-sans">SMARTZONE</span>
                    <span className="text-[10px] font-black bg-brand-red/10 text-brand-red px-2 py-0.5 rounded">STORE</span>
                </div>
                <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Hệ thống bán lẻ thiết bị công nghệ chính hãng hàng đầu
                </p>
            </div>

            <div className="relative my-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 to-rose-500/10 blur-2xl rounded-full scale-75" />
                <div className="relative max-w-[260px] w-full transform -rotate-3 transition duration-500 hover:rotate-0 hover:scale-105 select-none">
                    <img 
                        src={iphone16Img} 
                        alt="SmartZone Premium" 
                        className="w-full h-auto drop-shadow-[0_20px_40px_rgba(183,20,35,0.12)]"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x500?text=SmartZone+Premium';
                        }}
                    />
                </div>
            </div>

            <div>
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block mb-3">Đối tác chiến lược ủy quyền</span>
                <div className="flex flex-wrap items-center gap-5 opacity-40 grayscale text-[11px] font-black uppercase tracking-wider text-slate-800">
                    <span>Apple Authorized</span>
                    <span>Samsung Premium</span>
                    <span>Sony Elite</span>
                </div>
            </div>
        </div>
    );

    return (
        <AuthShell
            title="Đăng nhập tài khoản"
            subtitle="Nhập email và mật khẩu của bạn"
            leftSide={loginLeftSide}
            icon={(
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
            )}
            footer={(
                <>
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Hoặc</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <Link
                        to="/register"
                        className="mt-4 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-bold text-slate-700 transition hover:border-brand-red/35 hover:bg-brand-red/5 hover:text-brand-red"
                    >
                        Tạo tài khoản mới
                    </Link>
                </>
            )}
        >
            {feedbackMsg && <StatusAlert>{feedbackMsg}</StatusAlert>}
            {successMsg && <StatusAlert type="success">{successMsg}</StatusAlert>}

            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">
                <FormInput
                    label="Email"
                    name="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    leftElement={(
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                    )}
                />

                <FormInput
                    label="Mật khẩu"
                    name="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    leftElement={(
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    rightElement={(
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 transition hover:text-brand-red"
                        >
                            {showPassword ? (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}
                />

                <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-sm font-medium text-slate-500 transition hover:text-brand-red hover:underline">
                        Quên mật khẩu?
                    </Link>
                </div>

                <SubmitButton htmlType="submit" loading={loading}>
                    Đăng nhập
                </SubmitButton>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
