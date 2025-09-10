// services/claims/manager/manager.api.ts
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

export type AssignEvaluatorPayload = {
  evaluatorId: string;
  reason?: string;
};

export type EvaluatorLite = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  insuranceCompany?: { companyId: string; name: string } | null;
  assignedCount: number;
};

export type ListEvaluatorsResponse = {
  data: EvaluatorLite[];
  page: number;
  pageSize: number;
  total: number;
};

export const listManagerClaims = async (
  params: QueryClaimsParams = {}
): Promise<Paginated<Claim>> => {
  try {
    const res = await api.get("/claim-manager/claims", { params });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getManagerClaim = async (claimId: string): Promise<Claim> => {
  try {
    const res = await api.get(`/claim-manager/claims/${claimId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export async function assignManagerEvaluator(
  claimId: string,
  arg: string | AssignEvaluatorPayload
): Promise<ApiMessage<void>> {
  const payload = typeof arg === 'string' ? { evaluatorId: arg } : arg;
  const res = await api.patch(`/claim-manager/claims/${claimId}/assign-evaluator`, payload);
  return res.data;
}

//list evaluators (optionally filtered by search)
export const listManagerEvaluators = async (
  search?: string,
  page = 1,
  pageSize = 50
): Promise<ListEvaluatorsResponse> => {
  try {
    const res = await api.get("claim-manager/claims/evaluators", {
      params: { search, page, pageSize },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getManagerDashboard = async (): Promise<DashboardResponse> => {
  try {
    const res = await api.get("/claim-manager/claims/metrics/summary");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
