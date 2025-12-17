import { ClaimStatus } from "@/lib/claims";
import type { Claim as ApiClaim } from "@/lib/claims";

export const UI_STATUSES = [
  "Submitted",
  "In Review",
  "Approved",
  "Rejected",
  "Resolved",
  "In Court",
  "Payed",
  
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
  [ClaimStatus.PAYED]: "Payed",
};

export const uiToStatus: Record<UiStatus, ClaimStatus> = {
  Submitted: ClaimStatus.SUBMITTED,
  "In Review": ClaimStatus.IN_EVALUATION,
  Approved: ClaimStatus.APPROVED,
  Rejected: ClaimStatus.REJECTED,
  Resolved: ClaimStatus.RESOLVED,
  "In Court": ClaimStatus.RESOLVED_IN_COURT,
  Payed: ClaimStatus.PAYED,
};

export interface UiClaim {
  id: string;
  projectName: string;
  status: UiStatus;
  incidentDate: string;
  documents: number;
  claimType?: string | null;
  claimTypeLabel?: string | null;
  submitterName?: string | null;   
  submitterEmail?: string | null;  
  companyName?: string | null;     
  evaluatorName?: string | null;   
  evaluatorEmail?: string | null;  
  _api?: ApiClaim;
}

// --- helpers for safe extraction ---
const isStr = (v: unknown): v is string => typeof v === "string";

const pickName = (v: any): string | null =>
  isStr(v) ? v : (isStr(v?.name) ? v.name : null);

const pickEmail = (v: any): string | null =>
  isStr(v?.email) ? v.email : null;

const humanizeLabel = (s: unknown): string | null =>
  isStr(s)
    ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

/**  derive a document count from any API shape (keep yours) */
function docCountFrom(c: any): number {
  if (typeof c?.documentsCount === "number") return c.documentsCount;
  if (typeof c?._count?.documents === "number") return c._count.documents;
  if (Array.isArray(c?.documents)) return c.documents.length;
  return 0;
}

export function toUiClaim(c: ApiClaim): UiClaim {
  const anyC: any = c;

  // Ensure claimType is a string (Prisma enums are strings, but guard anyway)
  const rawType =
    isStr(anyC.claimType) ? anyC.claimType :
    isStr(anyC.type) ? anyC.type : null;

  // Prefer nested objects if present
  const submitterObj = anyC.submittedBy ?? anyC.submitter ?? null;
  const evaluatorObj = anyC.evaluator ?? null;
  const companyObj   = anyC.company ?? null;

  return {
    id: anyC.claimId ?? anyC.id,
    projectName: anyC.ClaimTitle ?? anyC.projectName ?? "Untitled claim",
    status: statusToUi[anyC.status as ClaimStatus] ?? "Submitted",
    incidentDate: anyC.incidentDate ?? anyC.submissionDate,
    documents: docCountFrom(anyC),

    claimType: rawType,
    claimTypeLabel: anyC.claimTypeLabel ?? humanizeLabel(rawType),

    // Names/emails: handle strings or nested objects gracefully
    submitterName: anyC.submitterName ?? pickName(submitterObj) ?? null,
    submitterEmail: anyC.submitterEmail ?? pickEmail(submitterObj) ?? null,

    companyName:
      anyC.companyName ??
      (isStr(companyObj) ? companyObj : (isStr(companyObj?.name) ? companyObj.name : null)) ??
      null,

    evaluatorName: anyC.evaluatorName ?? pickName(evaluatorObj) ?? null,
    evaluatorEmail: anyC.evaluatorEmail ?? pickEmail(evaluatorObj) ?? null,

    _api: c,
  };
}

