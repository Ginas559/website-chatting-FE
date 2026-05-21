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
    return axios.get(`products/home?limit=${limit}`);
};

export const getProductDetailApi = (slug) => {
    return axios.get(`products/${slug}`);
};

export const getProductCategoriesApi = () => {
    return axios.get('products/categories');
};

export const searchProductsApi = (params = {}) => {
    return axios.get('products', { params });
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
