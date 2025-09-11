// services/claims/evaluator/evaluator.api.ts
import api from "@/lib/axios";
import {
  ApiMessage,
  Claim,
  DashboardResponse,
  Paginated,
  QueryClaimsParams,
} from "@/lib/claims";

function handleError(error: any): never {
  const msg =
    error?.response?.data?.message ||
    error?.response?.statusText ||
    error?.message ||
    "Unexpected error";
  throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
}

export type UpdateEvaluatorClaimStatusPayload = {
  status: string; // IN_EVALUATION, RESOLVED, or RESOLVED_IN_COURT
  reason?: string;
};

export enum EvaluatorAllowedStatus {
  IN_EVALUATION = 'IN_EVALUATION',
  RESOLVED = 'RESOLVED',
  RESOLVED_IN_COURT = 'RESOLVED_IN_COURT',
}

export const listEvaluatorClaims = async (
  params: QueryClaimsParams = {}
): Promise<Paginated<Claim>> => {
  try {
    const res = await api.get("/evaluator/claims", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getEvaluatorClaim = async (claimId: string): Promise<Claim> => {
  try {
    const res = await api.get(`/evaluator/claims/${claimId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const startEvaluation = async (claimId: string): Promise<ApiMessage<void>> => {
  try {
    const res = await api.patch(`/evaluator/claims/${claimId}/start`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateEvaluatorClaimStatus = async (
  claimId: string,
  status: UpdateEvaluatorClaimStatusPayload
): Promise<ApiMessage<{ claimId: string; status: string; updatedAt: string }>> => {
  try {
    const res = await api.patch(`/evaluator/claims/${claimId}/status`, status);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getEvaluatorDashboard = async (): Promise<DashboardResponse> => {
  try {
    const res = await api.get("/evaluator/claims/metrics/summary/me");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};