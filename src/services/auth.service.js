import axios from "../util/axios.customize";

const authService = {
  register: (data) => {
    return axios.post("register", data);
  },
  
  verifyOTP: (data) => {
    return axios.post("verify-otp", data);
  }
};

export default authService;