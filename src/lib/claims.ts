export type UUID = string;

/** Prisma enum (mirror it here) */
export enum ClaimStatus {
  SUBMITTED = "SUBMITTED",
  IN_EVALUATION = "IN_EVALUATION",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
  RESOLVED_IN_COURT = "RESOLVED_IN_COURT",
  PAYED = "PAYED", 
}

/** Keep in sync with your Prisma enum */
export type DocumentType =
  | "DAMAGE_REPORT"
  | "POLICE_REPORT"
  | "SITE_INSPECTION_REPORT"
  | "LAND_OWNERSHIP_PROOF"
  | "PAYMENT_PROOF"; 

/** --- Domain Models (match your includes/selects) --- */

export interface UserLite {
  id: UUID;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}

export interface Company {
  companyId: UUID;
  name: string;
  email?: string;
  representatives?: UserLite[];
}

export interface ClaimDocument {
  documentId: UUID;
  documentType: DocumentType;
  filePath: string;

  createdAt?: string;
  updatedAt?: string;

  // optional convenience fields
  name?: string;
  filename?: string;
  url?: string;

  // backward compatibility
  id?: UUID;

  uploader?: UserLite | null;
}

export interface Claim {
  claimId: UUID;
  ClaimTitle: string | null;
  status: ClaimStatus;
  submissionDate: string;
  claimType: string;

  companyId: UUID;
  submittedById: UUID;
  evaluatorId?: UUID | null;

  phoneNumber?: string;
  email?: string;

  company?: Company;
  documents?: ClaimDocument[];
  evaluator?: UserLite | null;
  submittedBy?: UserLite | null;
}

/** --- Request payloads (DTO mirrors) --- */
export interface CreateClaimPayload {
  companyId: UUID;
  claimTitle: string;
  claimType: string;
}

export interface UpdateClaimPayload {
  claimTitle?: string;
  companyId?: string;
  claimType?: string;
}

/** --- Query params (DTO mirrors) --- */
export type QueryClaimsParams = {
  status?: string;
  search?: string;
  submittedFrom?: string;
  submittedTo?: string;
  page?: number;
  pageSize?: number;
};

/** --- API response shapes --- */
export interface ApiMessage<T = unknown> {
  message: string;
  data: T;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalClaims: number;
  submitted: number;
  approved: number;
  rejected: number;
  inReview: number;
  resolved: number;
  inCourt: number;
  payed: number; 
}

export interface DashboardRecentItem {
  claimId: UUID;
  ClaimTitle: string | null;
  status: ClaimStatus;
  submissionDate: string;
  company: { companyId: UUID; name: string };
}

export interface DashboardResponse {
  summary: DashboardSummary;
  recent: DashboardRecentItem[];
}
