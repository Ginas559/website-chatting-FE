import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../../components/common/FormInput";
import SubmitButton from "../../components/common/SubmitButton";
import AuthShell from "../../components/common/AuthShell";
import StatusAlert from "../../components/common/StatusAlert";
import iphone16Img from "../../assets/iphone-16.png";
import {
  clearForgotPasswordFeedback,
  resetForgotPasswordState,
  resetPassword,
  sendForgotPasswordOtp,
} from "../../redux/slices/authSlice";

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { forgotPasswordLoading, forgotPasswordError, forgotPasswordMessage, isForgotPasswordOtpSent } = useSelector(
    (state) => state.auth
  );

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    dispatch(clearForgotPasswordFeedback());

    return () => {
      dispatch(resetForgotPasswordState());
    };
  }, [dispatch]);

  const handleSendOtp = async () => {
    dispatch(clearForgotPasswordFeedback());
    await dispatch(sendForgotPasswordOtp(email));
  };

  const handleResetPassword = async () => {
    dispatch(clearForgotPasswordFeedback());

    const result = await dispatch(resetPassword({ otp, newPassword }));
    if (resetPassword.fulfilled.match(result)) {
      setTimeout(() => {
        dispatch(resetForgotPasswordState());
        navigate("/login");
      }, 900);
    }
  };

  const forgotPasswordLeftSide = (
    <div className="flex-1 flex flex-col justify-between h-full relative z-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-brand-red font-sans">SMARTZONE</span>
          <span className="text-[10px] font-black bg-brand-red/10 text-brand-red px-2 py-0.5 rounded">STORE</span>
        </div>
        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          Khôi phục tài khoản mật khẩu bảo mật và an toàn
        </p>
      </div>

      <div className="relative my-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red/5 to-rose-500/5 blur-xl rounded-full scale-75" />
        <div className="relative max-w-[200px] w-full select-none opacity-90 hover:opacity-100 transition-opacity">
          <img 
            src={iphone16Img} 
            alt="SmartZone Recovery" 
            className="w-full h-auto drop-shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300x500?text=SmartZone+Recovery';
            }}
          />
        </div>
      </div>

      <div>
        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block mb-1">Cần hỗ trợ trực tiếp?</span>
        <p className="text-xs text-slate-400 font-medium">Hotline chăm sóc khách hàng: <span className="font-bold text-slate-700">1900 1234</span></p>
      </div>
    </div>
  );

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle={isForgotPasswordOtpSent ? "Xác thực OTP và đặt mật khẩu mới" : "Nhập email để nhận mã OTP"}
      leftSide={forgotPasswordLeftSide}
      icon={(
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a7 7 0 00-7 7v3H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-1V8a7 7 0 00-7-7zm-5 10V8a5 5 0 1110 0v3H7zm5 4a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      )}
    >
      {forgotPasswordError && <StatusAlert>{forgotPasswordError}</StatusAlert>}
      {forgotPasswordMessage && <StatusAlert type="success">{forgotPasswordMessage}</StatusAlert>}

      <div className="space-y-5">
        {!isForgotPasswordOtpSent ? (
            <>
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  dispatch(clearForgotPasswordFeedback());
                }}
                placeholder="name@example.com"
              />
              <SubmitButton loading={forgotPasswordLoading} onClick={handleSendOtp}>
                Gửi mã OTP
              </SubmitButton>
            </>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Bước 2</p>
                <p className="mt-2 text-sm text-slate-600">Nhập OTP và mật khẩu mới để hoàn tất việc đặt lại mật khẩu.</p>
              </div>

              <FormInput
                label="OTP"
                name="otp"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  dispatch(clearForgotPasswordFeedback());
                }}
                placeholder="6 chữ số"
                maxLength={6}
              />
              <FormInput
                label="Mật khẩu mới"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  dispatch(clearForgotPasswordFeedback());
                }}
                placeholder="Tối thiểu 6 ký tự"
              />
              <SubmitButton loading={forgotPasswordLoading} onClick={handleResetPassword} className="!bg-gradient-to-r !from-rose-500 !to-red-500 !shadow-rose-200">
                Đổi mật khẩu
              </SubmitButton>
            </>
          )}
      </div>

      <Link
        to="/login"
        className="mt-6 block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-brand-red/35 hover:bg-brand-red/5 hover:text-brand-red"
      >
        Quay lại đăng nhập
      </Link>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
