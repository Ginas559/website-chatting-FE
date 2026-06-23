import axios from '../util/axios.customize';

export const sendChatMessageApi = (receiverId, content) => {
    return axios.post('chat/send', { receiverId, content });
};

export const getChatHistoryApi = (senderId, receiverId, params = {}) => {
    return axios.get(`chat/history/${senderId}/${receiverId}`, { params });
};

export const markChatAsReadApi = (senderId) => {
    return axios.patch(`chat/read/${senderId}`);
};

export const getSupportUserApi = () => {
    return axios.get('chat/support');
};

export const getChatContactsApi = () => {
    return axios.get('chat/contacts');
};

export const getChatUsersApi = () => {
    return axios.get('chat/users');
};

export const getChatUserByIdApi = (id) => {
    return axios.get(`chat/users/${id}`);
};

