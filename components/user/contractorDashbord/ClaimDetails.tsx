"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { InfiniteData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  X,
  FileText,
  Download,
  Copy,
  SquarePen,
  Phone,
  Mail,
  User,
  Building2,
  Users,
} from "lucide-react";
import type { UiClaim } from "@/lib/uiClaims";
import { getMyClaim } from "../../../services/claims/contractor/claims.api";
import { API_BASE_URL } from "@/lib/constants";
import {
  
  useMarkRead,
  useMarkAllRead,
  
} from "@/hooks/useNotifications";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";

/* ------------------------ helpers / constants ------------------------ */

const humanize = (s?: string) =>
  typeof s === "string" ? s.replaceAll("_", " ") : "";

const TABS = ["overview", "documents", "activity", "notifications"] as const;
type DetailsTab = (typeof TABS)[number];

const TYPE_COLORS: Record<string, string> = {
  DAMAGE_REPORT: "bg-amber-100 text-amber-800",
  POLICE_REPORT: "bg-indigo-100 text-indigo-800",
  SITE_INSPECTION_REPORT: "bg-teal-100 text-teal-800",
  LAND_OWNERSHIP_PROOF: "bg-emerald-100 text-emerald-800",
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700",
  "In Review": "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  "In Court": "bg-purple-100 text-purple-700",
  Rejected: "bg-red-100 text-red-700",
};

// Map API enums -> UI labels used by STATUS_COLORS
const API_TO_UI_STATUS: Record<string, keyof typeof STATUS_COLORS> = {
  SUBMITTED: "Submitted",
  IN_EVALUATION: "In Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  IN_COURT: "In Court",
};

// Turn any raw status (enum or UI label) into a UI label key for STATUS_COLORS
function toUiStatus(raw?: string): keyof typeof STATUS_COLORS | undefined {
  if (!raw) return undefined;
  if (raw in STATUS_COLORS) return raw as keyof typeof STATUS_COLORS;
  const enumish = raw.toUpperCase().replace(/\s+/g, "_");
  if (enumish in API_TO_UI_STATUS) return API_TO_UI_STATUS[enumish];
  const guess = humanize(raw)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase()) as keyof typeof STATUS_COLORS;
  return guess in STATUS_COLORS ? guess : undefined;
}

function uiStatusLabel(raw?: string) {
  return toUiStatus(raw) ?? (raw ? humanize(raw) : "");
}

function statusBadgeClass(raw?: string) {
  const ui = toUiStatus(raw);
  return ui ? STATUS_COLORS[ui] : "bg-slate-100 text-slate-700";
}

type Props = {
  selectedClaim: UiClaim | null;
  onClose: () => void;
  onUpdate?: (claimId: string) => void;
};

export default function ClaimDetails({
  selectedClaim,
  onClose,
  onUpdate,
}: Props) {
  const router = useRouter();
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("overview");
  const claimId = selectedClaim?.id ?? null;

  const {
    data: fullClaim,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["claimDetails", claimId],
    queryFn: () => getMyClaim(claimId as string),
    enabled: !!claimId,
    staleTime: 60_000,
  });

  const fc = fullClaim as any;

  const title =
    fc?.ClaimTitle ?? selectedClaim?.projectName ?? "Untitled claim";
  const headerStatusLabel =
    uiStatusLabel(fc?.status) ||
    uiStatusLabel(selectedClaim?.status) ||
    "Submitted";

  const date =
    (fc?.submissionDate && new Date(fc.submissionDate).toLocaleDateString()) ||
    (selectedClaim?.incidentDate &&
      new Date(selectedClaim.incidentDate).toLocaleDateString()) ||
    "";

  // Safer docCount
  const docCount = Array.isArray(fc?.documents)
    ? fc.documents.length
    : typeof selectedClaim?.documents === "number"
    ? selectedClaim.documents
    : 0;

  // Contacts
  const evaluatorName = fc?.evaluator?.name ?? "";
  const evaluatorEmail = fc?.evaluator?.email ?? "";
  const evaluatorPhone = fc?.evaluator?.phoneNumber ?? "";

  const submitterName = fc?.submittedBy?.name ?? "";
  const submitterEmail = fc?.submittedBy?.email ?? "";
  const submitterPhone = fc?.submittedBy?.phoneNumber ?? "";

  const companyName = fc?.company?.name ?? "";
  const companyEmail = fc?.company?.email ?? "";
  const representatives = Array.isArray(fc?.company?.representatives)
    ? fc.company.representatives
    : [];

  // Activities: accept various backend shapes (optional)
  const activities: any[] = useMemo(() => {
    if (Array.isArray(fc?.activities)) return fc.activities;
    if (Array.isArray(fc?.activityLogs)) return fc.activityLogs;
    if (Array.isArray(fc?.history)) return fc.history;
    return [];
  }, [fc]);

  const copyId = async () => {
    if (!claimId) return;
    try {
      await navigator.clipboard.writeText(claimId);
    } catch {}
  };

  const handleUpdate = () => {
    if (!claimId) return;
    if (onUpdate) onUpdate(claimId);
    else router.push(`/createClaim/${claimId}`);
  };


  const markRead = useMarkRead();
const markAllRead = useMarkAllRead();

  

  // When user switches to Notifications tab, mark all read for this claim
  useEffect(() => {
    if (detailsTab === "notifications" && claimId) {
      markAllRead.mutate();
    }
  }, [detailsTab, claimId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {selectedClaim && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white shadow-2xl z-50"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-[#0a2045] truncate">
                {title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-1 rounded-full ${statusBadgeClass(
                    headerStatusLabel
                  )}`}
                  title={headerStatusLabel}
                >
                  {headerStatusLabel}
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {docCount} document{docCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdate}
                disabled={!claimId}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Update claim"
                aria-label="Update claim"
              >
                <SquarePen size={16} />
              </button>

              <button
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-slate-800">
            {/* Meta */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[92px]">Claim ID:</span>
                <span className="font-mono text-xs bg-slate-50 border rounded px-2 py-0.5 break-all">
                  {claimId}
                </span>
                <button
                  className="ml-1 inline-flex items-center text-slate-500 hover:text-slate-800"
                  onClick={copyId}
                  title="Copy Claim ID"
                >
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[92px]">Submitted:</span>
                <span>{date || "—"}</span>
              </div>
            </div>

            {/* Load/Error */}
            {isLoading && (
              <div className="animate-pulse space-y-3">
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            )}
            {isError && (
              <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2">
                {(error as Error)?.message || "Failed to load claim details"}
              </div>
            )}

            {/* Tabs */}
            <div className="sticky top-[64px] z-10 bg-white/95 backdrop-blur">
              <div className="flex gap-6 border-b">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailsTab(tab)}
                    className={`capitalize pb-2 -mb-px transition-colors ${
                      detailsTab === tab
                        ? "border-b-2 border-[#0a2045] text-[#0a2045] font-medium"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview */}
            {detailsTab === "overview" && (
              <div className="text-sm text-slate-800 space-y-4">
                {/* Company */}
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-500" />
                    <span className="text-slate-500 min-w-[92px]">
                      Company:
                    </span>
                    <span className="font-medium">{companyName || "—"}</span>
                  </div>
                  <div className="mt-1 pl-6">
                    <span className="text-slate-500 mr-2">Email:</span>
                    {companyEmail ? (
                      <a
                        href={`mailto:${companyEmail}`}
                        className="inline-flex items-center gap-2 hover:underline break-all"
                      >
                        <Mail size={14} className="text-slate-500" />
                        {companyEmail}
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>

                {/* Company Representatives */}
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-500" />
                    <span className="text-slate-500 min-w-[92px]">Reps:</span>
                    <span className="font-medium">
                      {representatives.length || 0}
                    </span>
                  </div>
                  {representatives.length > 0 && (
                    <ul className="mt-1 space-y-1 pl-6">
                      {representatives.map((r: any) => (
                        <li
                          key={r.id ?? r.email ?? r.name}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                          <span className="inline-flex items-center gap-1 font-medium">
                            <User size={14} className="text-slate-500" />
                            {r.name || "—"}
                          </span>
                          {r.email && (
                            <a
                              href={`mailto:${r.email}`}
                              className="inline-flex items-center gap-1 text-slate-600 hover:underline break-all"
                            >
                              <Mail size={14} />
                              {r.email}
                            </a>
                          )}
                          {r.phoneNumber && (
                            <a
                              href={`tel:${r.phoneNumber}`}
                              className="inline-flex items-center gap-1 text-slate-600 hover:underline"
                            >
                              <Phone size={14} />
                              {r.phoneNumber}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Evaluator */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 min-w-[92px]">
                      Evaluator:
                    </span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <User size={14} className="text-slate-500" />
                      {evaluatorName || "Unassigned"}
                    </span>
                  </div>
                  <div className="mt-1 pl-6 space-y-1">
                    <div>
                      <span className="text-slate-500 mr-2">Email:</span>
                      {evaluatorEmail ? (
                        <a
                          href={`mailto:${evaluatorEmail}`}
                          className="inline-flex items-center gap-2 hover:underline break-all"
                        >
                          <Mail size={14} className="text-slate-500" />
                          {evaluatorEmail}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 mr-2">Phone:</span>
                      {evaluatorPhone ? (
                        <a
                          href={`tel:${evaluatorPhone}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <Phone size={14} className="text-slate-500" />
                          {evaluatorPhone}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submitter (Contractor) */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 min-w-[92px]">
                      Submitted by:
                    </span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <User size={14} className="text-slate-500" />
                      {submitterName || "—"}
                    </span>
                  </div>
                  <div className="mt-1 pl-6 space-y-1">
                    <div>
                      <span className="text-slate-500 mr-2">Email:</span>
                      {submitterEmail ? (
                        <a
                          href={`mailto:${submitterEmail}`}
                          className="inline-flex items-center gap-2 hover:underline break-all"
                        >
                          <Mail size={14} className="text-slate-500" />
                          {submitterEmail}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 mr-2">Phone:</span>
                      {submitterPhone ? (
                        <a
                          href={`tel:${submitterPhone}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <Phone size={14} className="text-slate-500" />
                          {submitterPhone}
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
                        {detailsTab === "documents" && (
                          <div className="space-y-3">
                            {!((fc?.documents ?? []).length > 0) && (
                              <p className="text-sm text-slate-500">No documents.</p>
                            )}
            
                            {(fc?.documents ?? []).length > 0 && (
                              <div className="max-h-96 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                {(fc?.documents ?? []).map((rawDoc: any, idx: number) => {
                                  const docId = rawDoc?.documentId ?? rawDoc?.id ?? null;
                                  const filePath = rawDoc?.filePath ?? "";
                                  const nameFromPath =
                                    typeof filePath === "string" && filePath.length
                                      ? filePath.split(/[\\/]/).pop()
                                      : "";
                                  const displayName =
                                    rawDoc?.name ||
                                    rawDoc?.filename ||
                                    nameFromPath ||
                                    (docId
                                      ? `Document ${String(docId).slice(0, 6)}`
                                      : `Document ${idx + 1}`);
            
                                  const createdAt = rawDoc?.createdAt || rawDoc?.uploadDate;
                                  const createdAtStr = createdAt
                                    ? new Date(createdAt).toLocaleString()
                                    : "";
            
                                  const downloadUrl = docId
                                    ? `${API_BASE_URL}/documents/${docId}/download`
                                    : rawDoc?.url || null;
            
                                  const docType: string =
                                    rawDoc?.documentType ?? rawDoc?.type ?? "";
                                  const typeLabel = humanize(docType);
                                  const typeClass =
                                    TYPE_COLORS[docType] ?? "bg-slate-100 text-slate-700";
            
                                  const uploader = rawDoc?.uploader;
                                  const uploaderName = uploader?.name ?? "";
                                  const uploaderEmail = uploader?.email ?? "";
                                  const uploaderPhone = uploader?.phoneNumber ?? "";
            
                                  return (
                                    <div
                                      key={docId ?? idx}
                                      className="border rounded-lg p-3 hover:shadow-sm transition"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <FileText
                                              size={16}
                                              className="shrink-0 text-slate-500"
                                            />
                                            <p className="text-sm font-semibold truncate">
                                              {displayName}
                                            </p>
                                          </div>
            
                                          {createdAtStr && (
                                            <p className="text-xs text-slate-500 mt-1">
                                              {createdAtStr}
                                            </p>
                                          )}
            
                                          {typeLabel && (
                                            <span
                                              className={`inline-block mt-2 text-[10px] px-2 py-1 rounded-full uppercase tracking-wide ${typeClass}`}
                                            >
                                              {typeLabel}
                                            </span>
                                          )}
            
                                          {(uploaderName ||
                                            uploaderEmail ||
                                            uploaderPhone) && (
                                            <div className="mt-2 text-xs text-slate-600 space-y-1">
                                              <div className="flex items-center gap-1">
                                                <span className="text-slate-500">
                                                  Uploaded by:
                                                </span>
                                                <span className="inline-flex items-center gap-1 font-medium">
                                                  <User
                                                    size={12}
                                                    className="text-slate-500"
                                                  />
                                                  {uploaderName || "—"}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-3 pl-4">
                                                {uploaderEmail && (
                                                  <a
                                                    href={`mailto:${uploaderEmail}`}
                                                    className="inline-flex items-center gap-1 hover:underline break-all"
                                                  >
                                                    <Mail size={12} />
                                                    {uploaderEmail}
                                                  </a>
                                                )}
                                                {uploaderPhone && (
                                                  <a
                                                    href={`tel:${uploaderPhone}`}
                                                    className="inline-flex items-center gap-1 hover:underline"
                                                  >
                                                    <Phone size={12} />
                                                    {uploaderPhone}
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
            
                                        <div className="shrink-0">
                                          {downloadUrl ? (
                                            <a
                                              href={downloadUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-[#0a2045] border-slate-200"
                                              title="View / Download"
                                            >
                                              <Download size={14} />
                                              Download
                                            </a>
                                          ) : (
                                            <span className="text-xs text-slate-400">
                                              No link
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
            
                        {/* Activity */}
                        {detailsTab === "activity" && (
                          <div className="space-y-3">
                            {activities.length === 0 && (
                              <p className="text-sm text-slate-500">No activity yet.</p>
                            )}
            
                            {/* Scrollable container */}
                            {activities.length > 0 && (
                              <div className="max-h-96 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                {activities.map((a: any, idx: number) => {
                                  const key = a.id ?? a.activityId ?? idx;
                                  const when =
                                    a.createdAt ?? a.timestamp ?? a.date ?? a.time;
                                  const whenStr = when
                                    ? new Date(when).toLocaleString()
                                    : "";
                                  const actorName =
                                    a.performedBy?.name ??
                                    a.actor?.name ??
                                    a.user?.name ??
                                    a.actorName ??
                                    a.userName ??
                                    a.performedBy?.email ??
                                    a.actorEmail ??
                                    a.userEmail ??
                                    "System";
                                  const action = a.action ?? a.type ?? a.event ?? "Updated";
                                  const fromStatus = a.fromStatus ?? a.oldStatus;
                                  const toStatus = a.toStatus ?? a.newStatus;
                                  const reasonText = a.reason ?? "";
            
                                  return (
                                    <div
                                      key={key}
                                      className="border rounded-lg p-3 hover:shadow-sm transition"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <User
                                              size={16}
                                              className="text-slate-500 shrink-0"
                                            />
                                            <p className="text-sm font-medium truncate">
                                              {actorName}
                                            </p>
                                          </div>
            
                                          <p className="text-xs text-slate-500 mt-1">
                                            {whenStr}
                                          </p>
            
                                          <div className="mt-2 text-sm">
                                            <span className="font-medium">{action}</span>
                                            {(fromStatus || toStatus) && (
                                              <span className="ml-1 inline-flex items-center gap-1">
                                                {fromStatus ? (
                                                  <span
                                                    className={`px-1.5 py-0.5 rounded ${statusBadgeClass(
                                                      fromStatus
                                                    )}`}
                                                  >
                                                    {uiStatusLabel(fromStatus)}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-500">—</span>
                                                )}
                                                <span className="mx-1">→</span>
                                                {toStatus ? (
                                                  <span
                                                    className={`px-1.5 py-0.5 rounded ${statusBadgeClass(
                                                      toStatus
                                                    )}`}
                                                  >
                                                    {uiStatusLabel(toStatus)}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-500">—</span>
                                                )}
                                              </span>
                                            )}
                                          </div>
            
                                          {reasonText && (
                                            <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                                              Reason: {reasonText}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
