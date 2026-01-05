"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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
import { ClaimStatus } from "@/lib/claims";
import { API_BASE_URL } from "@/lib/constants";
import {
  getInsuranceClaim,
  updateInsuranceClaimStatus,
} from "../../../services/claims/insurer/insurerClaims.api";

/* ------------------------- helpers / constants ------------------------- */

const humanize = (s?: string) =>
  typeof s === "string" ? s.replaceAll("_", " ") : "";

const TABS = ["overview", "documents", "activity", "action"] as const;
type DetailsTab = (typeof TABS)[number];

const TYPE_COLORS: Record<string, string> = {
  DAMAGE_REPORT: "bg-amber-100 text-amber-800",
  POLICE_REPORT: "bg-indigo-100 text-indigo-800",
  SITE_INSPECTION_REPORT: "bg-teal-100 text-teal-800",
  LAND_OWNERSHIP_PROOF: "bg-emerald-100 text-emerald-800",
  PAYMENT_PROOF: "bg-amber-100 text-amber-800",
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700",
  "In Review": "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  "In Court": "bg-purple-100 text-purple-700",
  Rejected: "bg-red-100 text-red-700",
  PAYED: "bg-green-100 text-green-700",
};

const API_TO_UI_STATUS: Record<string, keyof typeof STATUS_COLORS> = {
  SUBMITTED: "Submitted",
  IN_EVALUATION: "In Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  IN_COURT: "In Court",
  PAYED: "PAYED",
};

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
  const qc = useQueryClient();
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("overview");
  const [actionStatus, setActionStatus] = useState<ClaimStatus | null>(null);
  const [reason, setReason] = useState("");

  const claimId = selectedClaim?.id ?? null;

  /* ----------------------------- data fetching ----------------------------- */
  const {
    data: fullClaim,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["claimDetails", claimId],
    queryFn: () => getInsuranceClaim(claimId as string),
    enabled: !!claimId,
    staleTime: 60_000,
  });

  const fc = fullClaim as any;

  /* ------------------------------- computed UI ----------------------------- */
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

  const docCount = Array.isArray(fc?.documents)
    ? fc.documents.length
    : typeof selectedClaim?.documents === "number"
    ? selectedClaim.documents
    : 0;

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

  const activities: any[] = useMemo(() => {
    if (Array.isArray(fc?.activities)) return fc.activities;
    if (Array.isArray(fc?.activityLogs)) return fc.activityLogs;
    if (Array.isArray(fc?.history)) return fc.history;
    return [];
  }, [fc]);

  /* --------------------------- action states --------------------------- */
  const statusIsLocked = fc?.status === ClaimStatus.PAYED;
  const paymentProofExists = (fc?.documents ?? []).some(
    (doc: any) =>
      doc.documentType === "PAYMENT_PROOF" || doc.type === "PAYMENT_PROOF"
  );
  const canMarkPayed = !statusIsLocked && paymentProofExists;

  /* --------------------------- status update mutation ---------------------- */
  const { mutate: doUpdateStatus, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!claimId || !actionStatus) throw new Error("Select a status first.");
      return await updateInsuranceClaimStatus(claimId, {
        status: actionStatus,
        reason: reason?.trim() || undefined,
      });
    },
    onMutate: async () => {
      if (!claimId || !actionStatus) return;
      await qc.cancelQueries({ queryKey: ["claimDetails", claimId] });
      await qc.cancelQueries({ queryKey: ["insurerClaims"] });
      await qc.cancelQueries({ queryKey: ["insurerDashboard"] });

      const prevDetails = qc.getQueryData<any>(["claimDetails", claimId]);
      const nowIso = new Date().toISOString();

      const optimisticDetails = prevDetails
        ? {
            ...prevDetails,
            status: actionStatus,
            activities: [
              {
                id: `tmp-${nowIso}`,
                action: "Status Updated (optimistic)",
                fromStatus: prevDetails.status,
                toStatus: actionStatus,
                reason: reason?.trim() || undefined,
                createdAt: nowIso,
                performedBy: { name: "You" },
              },
              ...(Array.isArray(prevDetails.activities)
                ? prevDetails.activities
                : []),
            ],
          }
        : prevDetails;

      if (optimisticDetails) {
        qc.setQueryData(["claimDetails", claimId], optimisticDetails);
      }

      qc.setQueriesData({ queryKey: ["insurerClaims"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((c: any) =>
            c.claimId === claimId || c.id === claimId
              ? { ...c, status: actionStatus }
              : c
          ),
        };
      });

      return { prevDetails };
    },
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.prevDetails) {
        qc.setQueryData(["claimDetails", claimId], ctx.prevDetails);
      }
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Failed to update status";
      toast.error(msg);
    },
    onSuccess: (result) => {
      toast.success(result?.message || "Status updated");
      setReason("");
      setActionStatus(null);
      setDetailsTab("activity");
    },
    onSettled: async () => {
      await Promise.allSettled([
        qc.invalidateQueries({ queryKey: ["claimDetails", claimId] }),
        qc.invalidateQueries({ queryKey: ["insurerClaims"] }),
        qc.invalidateQueries({ queryKey: ["insurerDashboard"] }),
      ]);
    },
  });

  /* --------------------------- handlers --------------------------- */
  const copyId = async () => {
    if (!claimId) return;
    try {
      await navigator.clipboard.writeText(claimId);
      toast.success("Claim ID copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handlePencil = () => {
    
    if (!claimId) return;
    console.log(`claim when clicked: ${claimId}`);

    // Navigate to the evaluator-specific page
    router.push(`/paymentPage/${claimId}`);
  
  };

  /* --------------------------- render --------------------------- */
  return (
    <AnimatePresence>
      {selectedClaim && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} // ⛔ prevent outside click
            className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white shadow-2xl z-50"
          >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-[#0a2045] truncate">{title}</h3>
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
                onClick={handlePencil}
                disabled={!claimId}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Take action"
                aria-label="Take action"
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

            {/* Action */}
            {detailsTab === "action" && (
              <div className="space-y-4">
                {/* FINAL STATE WARNING */}
                {statusIsLocked && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    This claim is already <b>PAYED</b>. Status changes are permanently locked.
                  </div>
                )}

                {/* PAYMENT PROOF WARNING */}
                {!paymentProofExists && !statusIsLocked && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    You must upload a <b>PAYMENT_PROOF</b> document before marking this claim as PAYED.
                  </div>
                )}

                {/* STATUS OPTIONS */}
                <div>
                  <p className="text-sm text-slate-600 mb-2">Update status</p>
                  <div className="flex flex-col gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        disabled={statusIsLocked}
                        checked={actionStatus === ClaimStatus.APPROVED}
                        onChange={() => setActionStatus(ClaimStatus.APPROVED)}
                      />
                      <span className="text-sm">Approve</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        disabled={statusIsLocked}
                        checked={actionStatus === ClaimStatus.REJECTED}
                        onChange={() => setActionStatus(ClaimStatus.REJECTED)}
                      />
                      <span className="text-sm">Reject</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        disabled={!canMarkPayed}
                        checked={actionStatus === ClaimStatus.PAYED}
                        onChange={() => setActionStatus(ClaimStatus.PAYED)}
                      />
                      <span className="text-sm">Mark as Payed</span>
                    </label>
                  </div>
                </div>

                {/* REASON */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    disabled={statusIsLocked}
                    className="w-full min-h-[96px] border rounded-lg px-3 py-2 text-sm"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2">
                  <button
                    onClick={() => doUpdateStatus()}
                    disabled={
                      !actionStatus ||
                      saving ||
                      statusIsLocked ||
                      (actionStatus === ClaimStatus.PAYED && !paymentProofExists)
                    }
                    className="px-3 py-2 rounded-md bg-[#0a2045] text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Update Status"}
                  </button>

                  <button
                    disabled={saving || statusIsLocked}
                    onClick={() => {
                      setActionStatus(null);
                      setReason("");
                    }}
                    className="px-3 py-2 rounded-md border"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
