import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "../../components/common/FormInput";
import SubmitButton from "../../components/common/SubmitButton";
import AuthShell from "../../components/common/AuthShell";
import StatusAlert from "../../components/common/StatusAlert";
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

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle={isForgotPasswordOtpSent ? "Nhập OTP và mật khẩu mới" : "Nhập email để nhận mã OTP"}
      icon={(
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a7 7 0 00-7 7v3H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-1V8a7 7 0 00-7-7zm-5 10V8a5 5 0 1110 0v3H7zm5 4a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      )}
    >
      {forgotPasswordError && <StatusAlert>{forgotPasswordError}</StatusAlert>}
      {forgotPasswordMessage && <StatusAlert type="success">{forgotPasswordMessage}</StatusAlert>}

      <div className="space-y-4">
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
              <SubmitButton loading={forgotPasswordLoading} onClick={handleResetPassword}>
                Đổi mật khẩu
              </SubmitButton>
            </>
          )}
      </div>

      <Link
        to="/login"
        className="block mt-6 text-center text-gray-500 text-sm font-medium hover:text-blue-600 hover:underline"
      >
        Quay lại đăng nhập
      </Link>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
