import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || "/api",
});

instance.interceptors.response.use(
    (response) => response?.data ? response.data : response,
    (error) => {
        if (error.response && error.response.status === 429) {
            return Promise.reject({ 
                status: 429, 
                message: error.response.data.error || "Quá nhiều yêu cầu, thử lại sau 1 giờ" 
            });
        }
        if (error.response && error.response.status === 400) {
            return Promise.reject(error.response.data);
        }
        return Promise.reject(error);
    }
);

export default instance;