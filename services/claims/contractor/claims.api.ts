// src/services/claims.api.ts
import api from "@/lib/axios";
import {
  ApiMessage,
  Claim,
  CreateClaimPayload,
  DashboardResponse,
  Paginated,
  QueryClaimsParams,
  UpdateClaimPayload,
} from "@/lib/claims";

// 🔹 helper for consistent error formatting
function handleError(error: any): never {
  const msg =
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    "Unexpected error";
  throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
}

export const createClaim = async (
  payload: CreateClaimPayload
): Promise<ApiMessage<Claim>> => {
  try {
    const res = await api.post("/contractor/claims", payload);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateMyClaim = async (
  claimId: string,
  payload: UpdateClaimPayload
): Promise<ApiMessage<Claim>> => {
  try {
    const res = await api.patch(`/contractor/claims/${claimId}`, payload);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getMyClaim = async (claimId: string): Promise<Claim> => {
  try {
    const res = await api.get(`/contractor/claims/${claimId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const listMyClaims = async (
  params: QueryClaimsParams = {}
): Promise<Paginated<Claim>> => {
  try {
    const res = await api.get("/contractor/claims", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getMyDashboard = async (): Promise<DashboardResponse> => {
  try {
    const res = await api.get("/contractor/claims/metrics/summary");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
