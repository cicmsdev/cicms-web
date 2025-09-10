import axios from "axios";
import { API_BASE_URL } from "../../src/lib/constants";
import type {
  Insurance,
  CreateInsurance,
  UpdateInsurance,
} from "../../src/lib/insuranceTypes";

// GET /insurance
export const listInsurance = async (): Promise<Insurance[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/insurance`);
    return res.data;
  } catch (error: any) {
    console.error("Error listing insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to list insurance companies" };
  }
};

// GET /insurance/:id
export const getInsurance = async (id: string): Promise<Insurance> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/insurance/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("Error fetching insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to fetch insurance company" };
  }
};

// POST /insurance
export const createInsurance = async (dto: CreateInsurance): Promise<Insurance> => {
  try {
    const res = await axios.post(`${API_BASE_URL}/insurance`, dto);
    return res.data;
  } catch (error: any) {
    console.error("Error creating insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to create insurance company" };
  }
};

// PATCH /insurance/:id
export const updateInsurance = async (
  id: string,
  dto: UpdateInsurance
): Promise<Insurance> => {
  try {
    const res = await axios.patch(`${API_BASE_URL}/insurance/${id}`, dto);
    return res.data;
  } catch (error: any) {
    console.error("Error updating insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to update insurance company" };
  }
};

// DELETE /insurance/:id  (soft delete)
export const removeInsurance = async (
  id: string
): Promise<{ message?: string } | Insurance> => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/insurance/${id}`);
    return res.data;
  } catch (error: any) {
    console.error("Error removing insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to remove insurance company" };
  }
};

// PATCH /insurance/:id/restore
export const restoreInsurance = async (
  id: string
): Promise<{ message?: string } | Insurance> => {
  try {
    const res = await axios.patch(`${API_BASE_URL}/insurance/${id}/restore`);
    return res.data;
  } catch (error: any) {
    console.error("Error restoring insurance:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to restore insurance company" };
  }
};
