export type UUID = string;

/** Prisma enum (mirror it here) */
export enum ClaimStatus {
  SUBMITTED = "SUBMITTED",
  IN_EVALUATION = "IN_EVALUATION",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
  RESOLVED_IN_COURT = "RESOLVED_IN_COURT",
}

/** Keep in sync with your Prisma enum */
export type DocumentType =
  | "DAMAGE_REPORT"
  | "POLICE_REPORT"
  | "SITE_INSPECTION_REPORT"
  | "LAND_OWNERSHIP_PROOF";

/** --- Domain Models (match your includes/selects) --- */

export interface UserLite {
  id: UUID;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;   // <- now available
}

export interface Company {
  companyId: UUID;
  name: string;
  email?: string;                // <- selected in service
  representatives?: UserLite[];  // <- selected in service
}

export interface ClaimDocument {
  documentId: UUID;              // <- canonical id from API
  documentType: DocumentType;
  filePath: string;

  createdAt?: string;
  updatedAt?: string;

  // optional convenience fields some endpoints may provide
  name?: string;
  filename?: string;
  url?: string;

  // compatibility (some legacy code checks `id`)
  id?: UUID;

  uploader?: UserLite | null;    // <- selected in service
}

export interface Claim {
  claimId: UUID;
  ClaimTitle: string | null;
  status: ClaimStatus;
  submissionDate: string; // ISO

  companyId: UUID;
  submittedById: UUID;
  evaluatorId?: UUID | null;

  // stored on the claim row (capitalized in DB)
  PhoneNumber: string;           // <- now surfaced to FE
  Email: string;                 // <- now surfaced to FE

  // includes
  company?: Company;
  documents?: ClaimDocument[];
  evaluator?: UserLite | null;   // <- with phoneNumber
  submittedBy?: UserLite | null; // <- contractor/submitter
}

/** --- Request payloads (DTO mirrors) --- */
export interface CreateClaimPayload {
  companyId: UUID;
  claimTitle: string;
}

export interface UpdateClaimPayload {
  claimTitle?: string; // <= 25 chars
  companyId?: string;
}

/** --- Query params (DTO mirrors) --- */
export type QueryClaimsParams = {
  status?: string /* | ClaimStatus | ClaimStatus[] */;
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


