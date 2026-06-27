import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import FormInput from '../../components/common/FormInput';
import SubmitButton from '../../components/common/SubmitButton';
import AuthShell from '../../components/common/AuthShell';
import StatusAlert from '../../components/common/StatusAlert';
import iphone16Img from '../../assets/iphone-16.png';
import {
    clearError,
    clearRegisterFeedback,
    registerUser,
    resetRegistrationState,
    verifyOtp,
} from '../../redux/slices/authSlice';

const RegisterPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { registerLoading, registerError, registerMessage, isOtpSent } = useSelector((state) => state.auth);

    const [countdown, setCountdown] = useState(300);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        otpCode: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearRegisterFeedback());

        return () => {
            dispatch(resetRegistrationState());
        };
    }, [dispatch]);

    useEffect(() => {
        let timer;

        if (isOtpSent && countdown > 0) {
            timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
        }

        return () => clearInterval(timer);
    }, [isOtpSent, countdown]);

    useEffect(() => {
        if (isOtpSent) {
            const otpInput = document.getElementsByName('otpCode')[0];
            if (otpInput) otpInput.focus();
        }
    }, [isOtpSent]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const handleRegister = async () => {
        setErrors({});
        dispatch(clearRegisterFeedback());

        const result = await dispatch(
            registerUser({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
            })
        );

        if (registerUser.fulfilled.match(result)) {
            setCountdown(300);
            return;
        }

        if (result.payload?.errors) {
            const serverErrors = {};
            result.payload.errors.forEach((item) => {
                serverErrors[item.path] = item.msg;
            });
            setErrors(serverErrors);
            return;
        }

        setErrors({ global: result.payload?.error || 'Có lỗi xảy ra' });
    };

    const handleVerifyOTP = async () => {
        setErrors({});
        dispatch(clearRegisterFeedback());

        const result = await dispatch(verifyOtp({ otp: formData.otpCode }));

        if (verifyOtp.fulfilled.match(result)) {
            navigate('/user/profile');
            return;
        }

        if (result.payload?.errors) {
            const serverErrors = {};
            result.payload.errors.forEach((item) => {
                serverErrors[item.path] = item.msg;
            });
            setErrors(serverErrors);
            return;
        }

        setErrors({ otpCode: result.payload?.error || 'Mã OTP không hợp lệ' });
    };

    const activeStep = isOtpSent ? 2 : 1;

    const registerLeftSide = (
        <div className="flex-1 flex flex-col justify-between h-full relative z-10">
            <div className="space-y-8">
                <div>
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Đăng ký hội viên</span>
                    <h2 className="mt-2 text-xl font-black text-slate-900 leading-tight font-sans">Trở thành thành viên SmartZone</h2>
                    <p className="mt-1.5 text-xs text-slate-400 font-bold leading-relaxed">
                        Khám phá hệ sinh thái công nghệ hàng đầu với những ưu đãi đặc quyền dành riêng cho bạn.
                    </p>
                </div>

                {/* Steps Visualizer */}
                <div className="relative pl-6 space-y-6">
                    {/* Vertical line indicator */}
                    <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-slate-200" />

                    {/* Step 1 */}
                    <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition duration-300 ${
                            activeStep >= 1 ? 'bg-brand-red border-brand-red' : 'bg-white border-slate-300'
                        }`} />
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep === 1 ? 'text-brand-red' : 'text-slate-400'}`}>Bước 1</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">Điền thông tin cá nhân</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition duration-300 ${
                            activeStep >= 2 ? 'bg-brand-red border-brand-red' : 'bg-white border-slate-300'
                        }`} />
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep === 2 ? 'text-brand-red' : 'text-slate-400'}`}>Bước 2</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">Xác thực OTP qua Email</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition duration-300 ${
                            activeStep >= 3 ? 'bg-brand-red border-brand-red' : 'bg-white border-slate-300'
                        }`} />
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${activeStep === 3 ? 'text-brand-red' : 'text-slate-400'}`}>Bước 3</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">Hoàn tất & Mua sắm</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/5 to-rose-500/5 blur-xl rounded-full scale-75" />
                <div className="relative max-w-[200px] w-full select-none opacity-90 hover:opacity-100 transition-opacity">
                    <img 
                        src={iphone16Img} 
                        alt="SmartZone Member benefits" 
                        className="w-full h-auto drop-shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x500?text=SmartZone+Member';
                        }}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <AuthShell
            title="Đăng ký tài khoản"
            subtitle={isOtpSent ? 'Xác thực OTP để hoàn tất' : 'Tạo tài khoản mới trong vài bước'}
            leftSide={registerLeftSide}
            icon={(
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
            )}
        >
            {registerError && <StatusAlert>{registerError}</StatusAlert>}
            {registerMessage && <StatusAlert type="success">{registerMessage}</StatusAlert>}
            {errors.global && <StatusAlert>{errors.global}</StatusAlert>}

            <div className="space-y-5">
                {!isOtpSent ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormInput label="Họ & đệm" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} placeholder="Nguyễn Văn" />
                            <FormInput label="Tên" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} placeholder="An" />
                        </div>

                        <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="name@example.com" />
                        <FormInput label="Mật khẩu" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} placeholder="Tối thiểu 6 ký tự" />

                        <SubmitButton loading={registerLoading} onClick={handleRegister}>
                            Tiếp theo
                        </SubmitButton>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="relative w-20 h-20">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="5" fill="transparent" />
                                    <circle 
                                        cx="40" 
                                        cy="40" 
                                        r="34" 
                                        stroke="#b71423" 
                                        strokeWidth="5" 
                                        fill="transparent" 
                                        strokeDasharray="213.63" 
                                        strokeDashoffset={213.63 - (countdown / 300) * 213.63} 
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-black text-slate-900 font-sans">
                                        {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Thời gian hiệu lực OTP</p>
                        </div>

                        <FormInput label="Nhập mã OTP" name="otpCode" value={formData.otpCode} onChange={handleChange} error={errors.otpCode} placeholder="6 chữ số" />

                        <SubmitButton loading={registerLoading} onClick={handleVerifyOTP} className="!bg-gradient-to-r !from-emerald-600 !to-teal-600 !shadow-emerald-200">
                            Hoàn tất
                        </SubmitButton>
                    </>
                )}
            </div>
        </AuthShell>
    );
};

export default RegisterPage;
