import { ClaimStatus } from "@/lib/claims";
import type { Claim as ApiClaim } from "@/lib/claims";

export const UI_STATUSES = [
  "Submitted",
  "In Review",
  "Approved",
  "Rejected",
  "Resolved",
  "In Court",
] as const;

export type UiStatus = (typeof UI_STATUSES)[number];

export type UiFilters = {
  status: UiStatus[];
  project: string;
  fromDate: string; // "yyyy-mm-dd" or ""
  toDate: string;   // "yyyy-mm-dd" or ""
};

export const statusToUi: Record<ClaimStatus, UiStatus> = {
  [ClaimStatus.SUBMITTED]: "Submitted",
  [ClaimStatus.IN_EVALUATION]: "In Review",
  [ClaimStatus.APPROVED]: "Approved",
  [ClaimStatus.REJECTED]: "Rejected",
  [ClaimStatus.RESOLVED]: "Resolved",
  [ClaimStatus.RESOLVED_IN_COURT]: "In Court",
};

export const uiToStatus: Record<UiStatus, ClaimStatus> = {
  Submitted: ClaimStatus.SUBMITTED,
  "In Review": ClaimStatus.IN_EVALUATION,
  Approved: ClaimStatus.APPROVED,
  Rejected: ClaimStatus.REJECTED,
  Resolved: ClaimStatus.RESOLVED,
  "In Court": ClaimStatus.RESOLVED_IN_COURT,
};

export interface UiClaim {
  id: string;
  projectName: string;
  status: UiStatus;
  incidentDate: string;
  documents: number;
  _api?: ApiClaim;
}

/** ← NEW: derive a document count from any API shape */
function docCountFrom(c: any): number {
  if (typeof c?.documentsCount === "number") return c.documentsCount;       // flattened from _count
  if (typeof c?._count?.documents === "number") return c._count.documents; // raw Prisma _count
  if (Array.isArray(c?.documents)) return c.documents.length;               // full array present
  return 0;
}

export function toUiClaim(c: ApiClaim): UiClaim {
  const anyC: any = c;
  return {
    id: anyC.claimId ?? anyC.id,                                             
    projectName: anyC.ClaimTitle ?? anyC.projectName ?? "Untitled claim",
    status: statusToUi[anyC.status as ClaimStatus] ?? "Submitted",
    incidentDate: anyC.incidentDate ?? anyC.submissionDate,                  
    documents: docCountFrom(anyC),                                           
    _api: c,
  };
}
