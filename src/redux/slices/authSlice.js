import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAdminProfileApi, getModeratorProfileApi, getUserProfileApi, loginApi, logoutApi, refreshTokenApi } from '../../util/api';
import authService from '../../services/auth.service';
import forgotPasswordService from '../../services/forgotPassword.service';

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const res = await loginApi(email, password);
            if (res && res.errCode === 0) {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
                if (res.user?.id) {
                    localStorage.setItem('userId', String(res.user.id));
                }
                if (res.user) {
                    localStorage.setItem('authUser', JSON.stringify(res.user));
                }
                return res;
            } else {
                return rejectWithValue(res);
            }
        } catch (error) {
            return rejectWithValue(
                error?.errMessage || 'Không thể kết nối đến server'
            );
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async ({ email, password, firstName, lastName }, { rejectWithValue }) => {
        try {
            const res = await authService.register({ email, password, firstName, lastName });

            if (res?.tempToken) {
                localStorage.setItem('tempToken', res.tempToken);
                localStorage.setItem('registerEmail', email);
                return { ...res, email };
            }

            return rejectWithValue(res);
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const verifyOtp = createAsyncThunk(
    'auth/verifyOtp',
    async ({ otp }, { rejectWithValue }) => {
        try {
            const tempToken = localStorage.getItem('tempToken');
            const email = localStorage.getItem('registerEmail');
            const res = await authService.verifyOTP({ email, otp, tempToken });

            if (res?.accessToken) {
                localStorage.setItem('accessToken', res.accessToken);
            }

            if (res?.refreshToken) {
                localStorage.setItem('refreshToken', res.refreshToken);
            }

            if (res?.user?.id) {
                localStorage.setItem('userId', String(res.user.id));
            }

            if (res?.user) {
                localStorage.setItem('authUser', JSON.stringify(res.user));
            }

            localStorage.removeItem('tempToken');
            localStorage.removeItem('registerEmail');

            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('refreshToken');
            const res = await refreshTokenApi(token);
            if (res && res.errCode === 0) {
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);
                return res;
            }
            return rejectWithValue(res);
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async () => {
        const token = localStorage.getItem('refreshToken');
        await logoutApi(token).catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tempToken');
        localStorage.removeItem('registerEmail');
            localStorage.removeItem('userId');
            localStorage.removeItem('authUser');
    }
);

export const sendForgotPasswordOtp = createAsyncThunk(
    'auth/sendForgotPasswordOtp',
    async (email, { rejectWithValue }) => {
        try {
            const res = await forgotPasswordService.sendOtp(email);

            if (res?.tempToken) {
                localStorage.setItem('resetPasswordTempToken', res.tempToken);
            }

            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ otp, newPassword }, { rejectWithValue }) => {
        try {
            const tempToken = localStorage.getItem('resetPasswordTempToken');
            const res = await forgotPasswordService.resetPassword({ otp, newPassword, tempToken });

            if (res?.message) {
                localStorage.removeItem('resetPasswordTempToken');
            }

            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async (_, { rejectWithValue }) => {
        try {
            const res = await getUserProfileApi();
            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const fetchAdminProfile = createAsyncThunk(
    'auth/fetchAdminProfile',
    async (_, { rejectWithValue }) => {
        try {
            const res = await getAdminProfileApi();
            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

export const fetchModeratorProfile = createAsyncThunk(
    'auth/fetchModeratorProfile',
    async (_, { rejectWithValue }) => {
        try {
            const res = await getModeratorProfileApi();
            return res;
        } catch (error) {
            return rejectWithValue(error?.response?.data || error?.data || error);
        }
    }
);

const normalizeError = (error, fallback = 'Có lỗi xảy ra, vui lòng thử lại') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error?.errors?.length > 0) return error.errors[0].msg;
    if (error?.error) return error.error;
    if (error?.message) return error.message;
    if (error?.errMessage) return error.errMessage;
    return fallback;
};

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        isAuthenticated: !!localStorage.getItem('accessToken'),
        user: null,
        loading: false,
        error: null,
        registerLoading: false,
        registerError: null,
        registerMessage: '',
        isOtpSent: !!localStorage.getItem('tempToken'),
        registrationEmail: localStorage.getItem('registerEmail') || '',
        tempToken: localStorage.getItem('tempToken') || '',
        profileLoading: false,
        profileError: null,
        forgotPasswordLoading: false,
        forgotPasswordError: null,
        forgotPasswordMessage: '',
        forgotPasswordTempToken: localStorage.getItem('resetPasswordTempToken') || '',
        isForgotPasswordOtpSent: !!localStorage.getItem('resetPasswordTempToken'),
        forgotPasswordResetSuccess: false,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearRegisterFeedback: (state) => {
            state.registerError = null;
            state.registerMessage = '';
        },
        resetRegistrationState: (state) => {
            state.registerLoading = false;
            state.registerError = null;
            state.registerMessage = '';
            state.isOtpSent = false;
            state.registrationEmail = '';
            state.tempToken = '';
            localStorage.removeItem('tempToken');
            localStorage.removeItem('registerEmail');
        },
        clearForgotPasswordFeedback: (state) => {
            state.forgotPasswordError = null;
            state.forgotPasswordMessage = '';
        },
        resetForgotPasswordState: (state) => {
            state.forgotPasswordLoading = false;
            state.forgotPasswordError = null;
            state.forgotPasswordMessage = '';
            state.forgotPasswordTempToken = '';
            state.isForgotPasswordOtpSent = false;
            state.forgotPasswordResetSuccess = false;
            localStorage.removeItem('resetPasswordTempToken');
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = normalizeError(action.payload, 'Đăng nhập thất bại');
            })
            // Register
            .addCase(registerUser.pending, (state) => {
                state.registerLoading = true;
                state.registerError = null;
                state.registerMessage = '';
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.registerLoading = false;
                state.registerMessage = action.payload?.message || 'Đã gửi mã OTP đến email của bạn';
                state.isOtpSent = true;
                state.registrationEmail = action.payload?.email || '';
                state.tempToken = action.payload?.tempToken || '';
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.registerLoading = false;
                state.registerError = normalizeError(action.payload, 'Đăng ký thất bại');
            })
            // Verify OTP
            .addCase(verifyOtp.pending, (state) => {
                state.registerLoading = true;
                state.registerError = null;
                state.registerMessage = '';
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.registerLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload?.user || null;
                state.isOtpSent = false;
                state.registrationEmail = '';
                state.tempToken = '';
                state.registerMessage = action.payload?.message || 'Xác thực OTP thành công';
                localStorage.removeItem('tempToken');
                localStorage.removeItem('registerEmail');
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.registerLoading = false;
                state.registerError = normalizeError(action.payload, 'Xác thực OTP thất bại');
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.isAuthenticated = false;
                state.user = null;
                state.error = null;
                state.registerLoading = false;
                state.registerError = null;
                state.registerMessage = '';
                state.isOtpSent = false;
                state.registrationEmail = '';
                state.tempToken = '';
                state.profileLoading = false;
                state.profileError = null;
            })
            // Profiles
            .addCase(fetchUserProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.user = action.payload?.user || action.payload?.data?.user || null;
                state.isAuthenticated = true;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = normalizeError(action.payload, 'Không thể tải thông tin người dùng');
            })
            .addCase(fetchAdminProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchAdminProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.user = action.payload?.user || action.payload?.data?.user || null;
                state.isAuthenticated = true;
            })
            .addCase(fetchAdminProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = normalizeError(action.payload, 'Không thể tải thông tin quản trị viên');
            })
            // Forgot password
            .addCase(sendForgotPasswordOtp.pending, (state) => {
                state.forgotPasswordLoading = true;
                state.forgotPasswordError = null;
                state.forgotPasswordMessage = '';
            })
            .addCase(sendForgotPasswordOtp.fulfilled, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordMessage = action.payload?.message || 'OTP đã được gửi đến email của bạn';
                state.forgotPasswordTempToken = action.payload?.tempToken || '';
                state.isForgotPasswordOtpSent = true;
            })
            .addCase(sendForgotPasswordOtp.rejected, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordError = normalizeError(action.payload, 'Không thể gửi OTP');
            })
            .addCase(resetPassword.pending, (state) => {
                state.forgotPasswordLoading = true;
                state.forgotPasswordError = null;
                state.forgotPasswordMessage = '';
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordMessage = action.payload?.message || 'Đổi mật khẩu thành công';
                state.forgotPasswordTempToken = '';
                state.isForgotPasswordOtpSent = false;
                state.forgotPasswordResetSuccess = true;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.forgotPasswordLoading = false;
                state.forgotPasswordError = normalizeError(action.payload, 'Không thể đổi mật khẩu');
            });
    },
});

export const {
    clearError,
    clearRegisterFeedback,
    resetRegistrationState,
    clearForgotPasswordFeedback,
    resetForgotPasswordState,
} = authSlice.actions;
export default authSlice.reducer;