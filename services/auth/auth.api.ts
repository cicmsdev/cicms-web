import axios from "axios";
import { API_BASE_URL } from "../../src/lib/constants";

// Handle login service
export const login = async (email: string, password: string) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    return res.data;
  } catch (error: any) {
    // Extract error message from backend response
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'An unexpected error occurred';
    throw new Error(errorMessage);
  }
};

// Handle Verify OTP service
export const verifyOtp = async (email: string, otp: string) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
      email,
      otp,
    });
    return res.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'An unexpected error occurred';
    throw new Error(errorMessage);
  }
};

// Handle resend OTP
export const resendOtp = async (email: string) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/resend-otp`, {
      email,
    });
    return res.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'An unexpected error occurred';
    throw new Error(errorMessage);
  }
};