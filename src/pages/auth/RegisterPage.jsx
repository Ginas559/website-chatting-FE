import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from 'antd';
import FormInput from '../../components/common/FormInput';
import SubmitButton from '../../components/common/SubmitButton';
import authService from '../../services/auth.service';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/userSlice';

const RegisterPage = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(300); 
    const [rateLimitError, setRateLimitError] = useState(null);
    const [formData, setFormData] = useState({
        email: '', password: '', firstName: '', lastName: '', otpCode: ''
    });
    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        let timer;
        if (step === 2 && countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, countdown]);
    useEffect(() => {
        if (step === 2) {
            const otpInput = document.getElementsByName('otpCode')[0];
            if (otpInput) otpInput.focus();
        }
    }, [step]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    };

    const handleRegister = async () => {
        setLoading(true);
        setErrors({});
        setRateLimitError(null);
        try {
            const res = await authService.register({
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName
            });
            localStorage.setItem('tempToken', res.tempToken);
            localStorage.setItem('registerEmail', formData.email);
            setStep(2);
            setCountdown(300); 
        } catch (err) {
            if (err.status === 429) {
                setRateLimitError("Bạn đã thử quá 5 lần, vui lòng quay lại sau 1 giờ"); 
            } else if (err.errors) {
                const serverErrors = {};
                err.errors.forEach(e => serverErrors[e.path] = e.msg);
                setErrors(serverErrors);
            } else {
                setErrors({ global: err.error || "Có lỗi xảy ra" });
            }
        } finally { setLoading(false); }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        try {
            const tempToken = localStorage.getItem('tempToken');
            const email = localStorage.getItem('registerEmail');
            const res = await authService.verifyOTP({ email, otp: formData.otpCode, tempToken });
            
            dispatch(loginSuccess({
                user: res.user,
                token: res.accessToken
            }));

            localStorage.setItem('accessToken', res.accessToken); 
            localStorage.removeItem('tempToken');
            localStorage.removeItem('registerEmail');
            
            navigate('/home'); 
        } catch (err) {
            setErrors({ otpCode: err.error || "Mã OTP không hợp lệ" });
            if (err.error?.includes("Token không hợp lệ")) { 
                localStorage.removeItem('tempToken');
                setStep(1);
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 transition-all duration-500">
            <div className={`w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 transition-opacity duration-500 ${loading ? 'opacity-70' : 'opacity-100'}`}>
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Realtime Chat</h1>
                    <p className="text-gray-500 mt-2 font-medium">
                        {step === 1 ? "Bắt đầu hành trình" : "Xác thực OTP"}
                    </p>
                </header>

                {rateLimitError && <Alert message={rateLimitError} type="error" showIcon className="mb-6 rounded-lg" />}

                <div className="space-y-4">
                    {step === 1 ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Họ & đệm" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} />
                                <FormInput label="Tên" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} />
                            </div>
                            <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
                            <FormInput label="Mật khẩu" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} />
                            <SubmitButton loading={loading} onClick={handleRegister}>Tiếp theo</SubmitButton>
                        </>
                    ) : (
                        <>
                            <div className="text-center p-4 bg-blue-50 rounded-lg mb-4">
                                <div className="text-2xl font-mono font-bold text-blue-600">
                                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                                </div>
                                <p className="text-xs text-blue-500 mt-1">Mã OTP hết hạn sau 5 phút</p>
                            </div>
                            <FormInput label="Nhập mã OTP" name="otpCode" value={formData.otpCode} onChange={handleChange} error={errors.otpCode} />
                            <SubmitButton loading={loading} onClick={handleVerifyOTP} className="bg-green-600 hover:bg-green-700">Hoàn tất</SubmitButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;