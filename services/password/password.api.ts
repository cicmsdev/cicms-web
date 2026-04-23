// services/auth/password.api.ts
import axios from "axios";
import { API_BASE_URL } from "../../src/lib/constants";
import { ChangePassword } from "../../src/lib/passwordTypes"; 

//Change password
export const changePassword = async (dto: ChangePassword) => {
  try {
    const res = await axios.patch(`${API_BASE_URL}/password/change`, dto);
    return res.data;
  } catch (error: any) {
    console.error("Error changing password:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to change password" };
  }
};

// Reset user password (when user must change default password)
export const resetUserPassword = async (dto: ChangePassword) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/password/reset-password`, dto);
    return res.data;
  } catch (error: any) {
    console.error("Error resetting user password:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to reset user password" };
  }
};

// Reset password (admin / forgot-password flow)
export const resetPassword = async (email: string) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/password/reset`, { email });
    return res.data;
  } catch (error: any) {
    console.error("Error resetting password:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to reset password" };
  }
};
