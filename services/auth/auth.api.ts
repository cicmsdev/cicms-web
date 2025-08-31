import axios from "axios";
import { API_BASE_URL } from "../../lib/constants";

//handle login service
export const login = async (email: string, password: string) => {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password,
  });
  return res.data;
};


// handle Verify otp service
export const verifyOtp = async (email: string, otp: string) => {
  const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
    email,
    otp,
  });
  return res.data;
};

// handle resend otp verify 
export const resendOtp = async (email: string) => {
  const res = await axios.post(`${API_BASE_URL}/auth/resend-otp`, {
    email,
  });
  return res.data;
};
