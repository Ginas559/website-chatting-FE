import axios from './axios.customize';

const PROFILE_API_BASE_URL = import.meta.env.VITE_PROFILE_API_URL || 'http://localhost:3000/api';

export const loginApi = (email, password) => {
    return axios.post('login', { email, password });
};

export const refreshTokenApi = (refreshToken) => {
    return axios.post('refresh-token', { refreshToken });
};

export const logoutApi = (refreshToken) => {
    return axios.post('logout', { refreshToken });
};

export const getHomeProductsApi = (limit = 8) => {
    if (typeof limit === 'object' && limit !== null) {
        return axios.get('products/home', { params: limit });
    }

    return axios.get(`products/home?limit=${limit}`);
};

export const getProductDetailApi = (slug) => {
    return axios.get(`products/${slug}`);
};

export const getProductReviewsApi = (slug, params = {}) => {
    return axios.get(`reviews/products/${slug}`, { params });
};

export const createProductReviewApi = (payload) => {
    return axios.post('reviews', payload);
};

export const getProductCategoriesApi = () => {
    return axios.get('products/categories');
};

export const searchProductsApi = (params = {}) => {
    return axios.get('products', { params });
};

export const getFavoriteProductsApi = () => {
    return axios.get('products/favorites');
};

export const toggleFavoriteProductApi = (productId) => {
    return axios.post(`products/${productId}/favorite`);
};

export const getRecentlyViewedProductsApi = () => {
    return axios.get('products/recently-viewed');
};

export const addRecentlyViewedProductApi = (slug) => {
    return axios.post(`products/${slug}/viewed`);
};

export const checkoutOrderApi = ({ shippingInfo, paymentMethod = 'COD', bankCode }) => {
    return axios.post('orders/checkout', { shippingInfo, paymentMethod, bankCode });
};

export const verifyVnpayReturnApi = (params = {}) => {
    return axios.get('payments/vnpay-return', { params });
};

export const getMyOrdersApi = (params = {}) => {
    return axios.get('orders/my', { params });
};

export const getMyOrderDetailApi = (orderIdOrCode) => {
    return axios.get(`orders/my/${orderIdOrCode}`);
};

export const repayVnpayOrderApi = (orderIdOrCode, bankCode) => {
    return axios.post(`orders/my/${orderIdOrCode}/pay`, { bankCode });
};

export const cancelMyOrderApi = (orderIdOrCode, reason = '') => {
    return axios.patch(`orders/my/${orderIdOrCode}/cancel`, { reason });
};

export const getAdminOrdersApi = (params = {}) => {
    return axios.get('admin/orders', { params });
};

export const getAdminOrderDetailApi = (orderIdOrCode) => {
    return axios.get(`admin/orders/${orderIdOrCode}`);
};

export const updateAdminOrderStatusApi = (orderIdOrCode, status, note = '') => {
    return axios.patch(`admin/orders/${orderIdOrCode}/status`, { status, note });
};

export const resolveAdminCancelRequestApi = (orderIdOrCode, action, note = '') => {
    return axios.patch(`admin/orders/${orderIdOrCode}/cancel-request`, { action, note });
};

export const getHomeArticlesApi = (limit = 6) => {
    return axios.get(`articles/home?limit=${limit}`);
};

export const getArticleDetailApi = (slug) => {
    return axios.get(`articles/${slug}`);
};

export const getUserProfileApi = () => {
    return axios.get('/user/profile', { baseURL: '' });
};

export const getAdminProfileApi = () => {
    return axios.get('/admin/profile', { baseURL: '' });
};

export const getModeratorProfileApi = () => {
    return axios.get('/moderator/profile', { baseURL: '' });
};

export const getProfileByIdApi = (userId) => {
    return axios.get(`/users/${userId}`, {
        baseURL: PROFILE_API_BASE_URL,
    });
};

export const updateProfileApi = (userId, data, method = 'patch') => {
    const requestMethod = method.toLowerCase() === 'put' ? 'put' : 'patch';

    return axios[requestMethod](`/users/${userId}/profile`, data, {
        baseURL: PROFILE_API_BASE_URL,
    });
};
