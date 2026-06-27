import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import FormInput from '../../components/common/FormInput';
import SubmitButton from '../../components/common/SubmitButton';
import AuthShell from '../../components/common/AuthShell';
import StatusAlert from '../../components/common/StatusAlert';
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

    return (
        <AuthShell
            title="Đăng ký tài khoản"
            subtitle={isOtpSent ? 'Xác thực OTP để hoàn tất' : 'Tạo tài khoản mới trong vài bước'}
            icon={(
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm1.07-7.75l-.9.92A2 2 0 0012 12h-1v-1a4 4 0 011.17-2.83l1.24-1.25a1.75 1.75 0 10-2.91-1.27H8.5a3.5 3.5 0 116.57 1.6z" />
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
