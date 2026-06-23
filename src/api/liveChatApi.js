import axios from '../util/axios.customize';

export const liveChatApi = {
    getRecentMessages: (liveId) => axios.get(`livestream/${liveId}/chat/messages`),
};
