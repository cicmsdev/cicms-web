// src/lib/axios.ts
import axios from "axios";
import { API_BASE_URL } from "./constants";

// Create a reusable axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, 
});

// Add a request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.message ||
      error.response?.statusText ||
      error.message;
    return Promise.reject(Array.isArray(msg) ? msg.join(", ") : msg);
  }
);

export default api;
