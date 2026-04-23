
import api from "@/lib/axios";
import {
  ApiMessage,
  Claim,
  ClaimStatus,
  DashboardResponse,
  Paginated,
  QueryClaimsParams,
} from "@/lib/claims";

export type InsuranceAllowedStatus = "APPROVED" | "REJECTED";

//Same helper for consistent error formatting
function handleError(error: any): never {
  const msg =
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    "Unexpected error";
  throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
}

// If your DTO has extra fields (e.g. note/reason), add them here.
export type UpdateInsuranceClaimStatusPayload = {
  status: ClaimStatus;
  reason?: string;
};

// GET /insurance-rep/claims
export const listInsuranceClaims = async (
  params: QueryClaimsParams = {}
): Promise<Paginated<Claim>> => {
  try {
    const res = await api.get("/insurance-rep/claims", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// GET /insurance-rep/claims/:claimId
export const getInsuranceClaim = async (claimId: string): Promise<Claim> => {
  try {
    const res = await api.get(`/insurance-rep/claims/${claimId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// PATCH /insurance-rep/claims/:claimId/status
export const updateInsuranceClaimStatus = async (
  claimId: string,
  payload: UpdateInsuranceClaimStatusPayload
): Promise<ApiMessage<Claim>> => {
  const res = await api.patch(`/insurance-rep/claims/${claimId}/status`, payload)
  return res.data;
};

// GET /insurance-rep/claims/metrics/summary/company
export const getInsuranceDashboard = async (): Promise<DashboardResponse> => {
  try {
    const res = await api.get(
      "/insurance-rep/claims/metrics/summary/company"
    );
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
