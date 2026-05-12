import axios from './axios.customize';

export const loginApi = (email, password) => {
    return axios.post('login', { email, password });
};

export const refreshTokenApi = (refreshToken) => {
    return axios.post('refresh-token', { refreshToken });
};

export const logoutApi = (refreshToken) => {
    return axios.post('logout', { refreshToken });
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
