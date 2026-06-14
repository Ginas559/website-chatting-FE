import axios from '../util/axios.customize';

export const livestreamApi = {
    getCurrent: () => axios.get('livestream/current'),
};
