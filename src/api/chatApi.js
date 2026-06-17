import axios from '../util/axios.customize';

export const sendChatMessageApi = (receiverId, content) => {
    return axios.post('chat/send', { receiverId, content });
};

export const getChatHistoryApi = (senderId, receiverId) => {
    return axios.get(`chat/history/${senderId}/${receiverId}`);
};

export const markChatAsReadApi = (senderId) => {
    return axios.patch(`chat/read/${senderId}`);
};

export const getSupportUserApi = () => {
    return axios.get('chat/support');
};
