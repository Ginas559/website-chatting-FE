import axios from '../util/axios.customize';

export const liveChatModerationApi = {
    getMyBans: () => axios.get('live-chat/moderation/my-bans'),
    createUnbanRequest: (caseId, reason) => axios.post(`live-chat/moderation/bans/${caseId}/unban-request`, { reason }),
};
