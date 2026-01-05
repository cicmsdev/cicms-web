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
  AlertCircle,
  Clock,
  CheckCircle,
  Gavel,
  Loader2,
} from "lucide-react";

import { getErrorMessage } from "@/lib/errors";
import type { UiClaim } from "@/lib/uiClaims";
import { ClaimStatus } from "@/lib/claims";
import { API_BASE_URL } from "@/lib/constants";
import {
  getEvaluatorClaim,
  updateEvaluatorClaimStatus,
  EvaluatorAllowedStatus,
} from "../../../services/claims/evaluator/evaluator.api";
import { useAuth } from "../../../context/AuthContext";

/* ------------------------- helpers / constants ------------------------- */

const humanize = (s?: string) =>
  typeof s === "string" ? s.replaceAll("_", " ") : "";

const TABS = ["overview", "documents", "activity", "action"] as const;
type DetailsTab = (typeof TABS)[number];

const TYPE_COLORS: Record<string, string> = {
  DAMAGE_REPORT: "bg-amber-100 text-amber-800 border-amber-200",
  POLICE_REPORT: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SITE_INSPECTION_REPORT: "bg-teal-100 text-teal-800 border-teal-200",
  LAND_OWNERSHIP_PROOF: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DEFAULT: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700 border-blue-200",
  "In Review": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "In Court": "bg-purple-100 text-purple-700 border-purple-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

const API_TO_UI_STATUS: Record<string, keyof typeof STATUS_COLORS> = {
  SUBMITTED: "Submitted",
  IN_EVALUATION: "In Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  RESOLVED_IN_COURT: "In Court",
};

const EVALUATOR_STATUS_ICONS = {
  [EvaluatorAllowedStatus.IN_EVALUATION]: Clock,
  [EvaluatorAllowedStatus.RESOLVED]: CheckCircle,
  [EvaluatorAllowedStatus.RESOLVED_IN_COURT]: Gavel,
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
  return ui
    ? `${STATUS_COLORS[ui]} border px-2 py-1 rounded-full text-xs font-medium`
    : "bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-full text-xs";
}

// Helper function to check if status update is allowed
const canUpdateStatus = (currentStatus: string | undefined): boolean => {
  if (!currentStatus) return false;
  const status = currentStatus.toUpperCase();
  return (
    status === ClaimStatus.APPROVED ||
    status === ClaimStatus.IN_EVALUATION ||
    status === ClaimStatus.RESOLVED ||
    status === ClaimStatus.RESOLVED_IN_COURT
  );
};

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
  const [actionStatus, setActionStatus] =
    useState<EvaluatorAllowedStatus | null>(null);
  const [reason, setReason] = useState("");

  const claimId = selectedClaim?.id ?? null;

  /* ----------------------------- data fetching ----------------------------- */
  const {
    data: fullClaim,
    isLoading,
    isError,
    error,
    refetch: refetchClaim,
  } = useQuery({
    queryKey: ["claimDetails", claimId],
    queryFn: () => getEvaluatorClaim(claimId as string),
    enabled: !!claimId,
    staleTime: 60_000,
    retry: 2,
  });

  const fc = fullClaim as any;

  /* ------------------------------- computed UI ----------------------------- */
  const title =
    fc?.ClaimTitle ?? selectedClaim?.projectName ?? "Untitled claim";
  const headerStatusLabel =
    uiStatusLabel(fc?.status) ||
    uiStatusLabel(selectedClaim?.status) ||
    "Submitted";
  const date = fc?.submissionDate
    ? new Date(fc.submissionDate).toLocaleDateString()
    : "";

  const docCount = Array.isArray(fc?.documents) ? fc.documents.length : 0;
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

  // Check if status update is allowed
  const canUpdate = canUpdateStatus(fc?.status);

  /* --------------------------- status update mutation ---------------------- */
  const { mutate: doUpdateStatus, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!claimId || !actionStatus) throw new Error("Select a status first.");
      if (!canUpdate)
        throw new Error("Status update not allowed in current state.");

      return await updateEvaluatorClaimStatus(claimId, {
        status: actionStatus,
        reason: reason?.trim() || undefined,
      });
    },

    // ✅ OPTIMISTIC UPDATE
    onMutate: async () => {
      if (!claimId || !actionStatus) return;

      await qc.cancelQueries({ queryKey: ["claimDetails", claimId] });
      await qc.cancelQueries({ queryKey: ["evaluatorClaims"] });
      await qc.cancelQueries({ queryKey: ["evaluatorDashboard"] });

      const prevDetails = qc.getQueryData<any>(["claimDetails", claimId]);

      const now = new Date().toISOString();
      const optimisticDetails = prevDetails
        ? {
            ...prevDetails,
            status: actionStatus,
            activities: [
              {
                id: `tmp-${now}`,
                action: "Status Updated (optimistic)",
                fromStatus: prevDetails.status,
                toStatus: actionStatus,
                reason: reason?.trim() || undefined,
                createdAt: now,
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

      qc.setQueriesData({ queryKey: ["evaluatorClaims"] }, (old: any) => {
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

      qc.setQueriesData(
        { queryKey: ["evaluatorDashboard"] },
        (old: any) => old
      );

      return { prevDetails };
    },

    // 🧯 ROLLBACK on error
    onError: (e: unknown, _vars, ctx) => {
      if (ctx?.prevDetails) {
        qc.setQueryData(["claimDetails", claimId], ctx.prevDetails);
      }
      toast.error(getErrorMessage(e, "Failed to update status"));
    },

    // ✅ SUCCESS: gently re-sync with server
    onSuccess: async (result) => {
      toast.success(result?.message || "Status updated");
      setReason("");
      setActionStatus(null);
      setDetailsTab("activity");
    },

    // 🔄 SETTLED: refetch to ensure we match the server
    onSettled: async () => {
      await Promise.allSettled([
        qc.invalidateQueries({ queryKey: ["claimDetails", claimId] }),
        qc.invalidateQueries({ queryKey: ["evaluatorClaims"] }),
        qc.invalidateQueries({ queryKey: ["evaluatorDashboard"] }),
      ]);
    },
  });

  /* -------------------------------- handlers -------------------------------- */

  const copyId = async () => {
    if (!claimId) return;
    try {
      await navigator.clipboard.writeText(claimId);
      toast.success("Claim ID copied to clipboard");
    } catch {
      toast.error("Failed to copy Claim ID");
    }
  };

  const handleUpdate = () => {
    if (!claimId) return;
    console.log(`claim when clicked: ${claimId}`);

    // Navigate to the evaluator-specific page
    router.push(`/evaluateClaim/${claimId}`);
  };

  const downloadDocument = async (documentId: string, filename: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/download`
      );
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  /* --------------------------------- render --------------------------------- */
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
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-[#0a2045] truncate">
                {title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={statusBadgeClass(headerStatusLabel)}>
                  {headerStatusLabel}
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-full text-xs">
                  {docCount} document{docCount === 1 ? "" : "s"}
                </span>
                {date && <span className="text-xs text-slate-500">{date}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleUpdate}
                disabled={!claimId}
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                title={claimId ? "Open edit/upload" : "No claim selected"}
              >
                <SquarePen size={18} />
              </button>

              <button
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="sticky top-[76px] z-10 bg-white/95 backdrop-blur border-b">
            <div className="flex gap-6 px-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailsTab(tab)}
                  className={`capitalize pb-3 -mb-px transition-colors text-sm font-medium ${
                    detailsTab === tab
                      ? "border-b-2 border-[#0a2045] text-[#0a2045]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
            {/* Load/Error */}
            {isLoading && (
              <div className="flex items-center justify-center h-40">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading claim details...</span>
                </div>
              </div>
            )}

            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <div>
                    <p className="font-medium">Failed to load claim details</p>
                    <p className="text-sm mt-1">
                      {(error as Error)?.message || "Please try again"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => refetchClaim()}
                  className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                {/* Overview */}
                {detailsTab === "overview" && (
                  <div className="space-y-6">
                    {/* Claim Meta */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-700 mb-3">
                        Claim Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Claim ID:</span>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs bg-white px-2 py-1 rounded border">
                              {claimId}
                            </code>
                            <button
                              onClick={copyId}
                              className="text-slate-500 hover:text-slate-700 transition-colors"
                              title="Copy Claim ID"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        {date && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              Submission Date:
                            </span>
                            <span className="font-medium">{date}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Company Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-700">
                        Company Information
                      </h4>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                          <Building2
                            size={20}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {companyName || "No company assigned"}
                            </p>
                            {companyEmail && (
                              <p className="text-sm text-slate-600 truncate">
                                {companyEmail}
                              </p>
                            )}
                          </div>
                        </div>

                        {representatives.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">
                              Representatives:
                            </p>
                            {representatives.map((rep: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 bg-white border rounded-lg"
                              >
                                <p className="font-medium">
                                  {rep.name || "Unnamed Representative"}
                                </p>
                                {rep.email && (
                                  <p className="text-sm text-slate-600">
                                    {rep.email}
                                  </p>
                                )}
                                {rep.phoneNumber && (
                                  <p className="text-sm text-slate-600">
                                    {rep.phoneNumber}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-700">
                        Contact Information
                      </h4>
                      <div className="grid gap-3">
                        {/* Evaluator */}
                        {evaluatorName && (
                          <div className="p-3 bg-white border rounded-lg">
                            <p className="font-medium text-sm text-slate-600 mb-2">
                              Evaluator
                            </p>
                            <p className="font-medium">{evaluatorName}</p>
                            {evaluatorEmail && (
                              <p className="text-sm text-slate-600">
                                {evaluatorEmail}
                              </p>
                            )}
                            {evaluatorPhone && (
                              <p className="text-sm text-slate-600">
                                {evaluatorPhone}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Submitter */}
                        {submitterName && (
                          <div className="p-3 bg-white border rounded-lg">
                            <p className="font-medium text-sm text-slate-600 mb-2">
                              Submitted By
                            </p>
                            <p className="font-medium">{submitterName}</p>
                            {submitterEmail && (
                              <p className="text-sm text-slate-600">
                                {submitterEmail}
                              </p>
                            )}
                            {submitterPhone && (
                              <p className="text-sm text-slate-600">
                                {submitterPhone}
                              </p>
                            )}
                          </div>
                        )}
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
                        {(fc?.documents ?? []).map(
                          (rawDoc: any, idx: number) => {
                            const docId =
                              rawDoc?.documentId ?? rawDoc?.id ?? null;
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

                            const createdAt =
                              rawDoc?.createdAt || rawDoc?.uploadDate;
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
                              TYPE_COLORS[docType] ??
                              "bg-slate-100 text-slate-700";

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
                          }
                        )}
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
                          const action =
                            a.action ?? a.type ?? a.event ?? "Updated";
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
                                    <span className="font-medium">
                                      {action}
                                    </span>
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
                                          <span className="text-slate-500">
                                            —
                                          </span>
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
                                          <span className="text-slate-500">
                                            —
                                          </span>
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
                  <div className="space-y-6">
                    {!canUpdate ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 text-yellow-800">
                          <AlertCircle size={20} />
                          <div>
                            <p className="font-medium">
                              Status update not available
                            </p>
                            <p className="text-sm mt-1">
                              You can only update status when the claim is in
                              "Approved", "Resolved", or "Resolved in Court"
                              state. Current status:{" "}
                              <span className="font-medium">
                                {headerStatusLabel}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-4">
                            Update Claim Status
                          </h4>
                          <div className="grid gap-3">
                            {Object.values(EvaluatorAllowedStatus)
                              .filter(
                                (status) =>
                                  status !==
                                  EvaluatorAllowedStatus.IN_EVALUATION
                              )
                              .map((status) => {
                                const Icon = EVALUATOR_STATUS_ICONS[status];
                                const isSelected = actionStatus === status;

                                return (
                                  <label
                                    key={status}
                                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? "border-[#0a2045] bg-blue-50"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="evaluator-status"
                                      value={status}
                                      checked={isSelected}
                                      onChange={() => setActionStatus(status)}
                                      className="text-[#0a2045] focus:ring-[#0a2045]"
                                    />
                                    {Icon && (
                                      <Icon
                                        size={20}
                                        className="text-slate-600"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {humanize(status)}
                                      </p>
                                      <p className="text-sm text-slate-600 mt-1">
                                        {status ===
                                          EvaluatorAllowedStatus.RESOLVED &&
                                          "Mark claim as resolved"}
                                        {status ===
                                          EvaluatorAllowedStatus.RESOLVED_IN_COURT &&
                                          "Resolved through legal process"}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                        </div>

                        <div>
                          <label className="block font-medium text-slate-700 mb-3">
                            Reason for status change
                            <span className="text-slate-400 font-normal">
                              {" "}
                              (optional)
                            </span>
                          </label>
                          <textarea
                            className="w-full min-h-[120px] p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0a2045] focus:border-transparent resize-none"
                            placeholder="Provide details about this status change..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                          />
                          <div className="flex justify-between mt-2">
                            <span className="text-sm text-slate-500">
                              Maximum 500 characters
                            </span>
                            <span className="text-sm text-slate-500">
                              {reason.length}/500
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                          <button
                            onClick={() => doUpdateStatus()}
                            disabled={!actionStatus || saving}
                            className="flex-1 bg-[#0a2045] text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142c63] transition-colors"
                          >
                            {saving ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                Updating...
                              </span>
                            ) : (
                              "Update Status"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setActionStatus(null);
                              setReason("");
                            }}
                            disabled={saving}
                            className="px-6 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-medium text-slate-700 mb-2">
                            Status Transition Rules
                          </h5>
                          <ul className="text-sm text-slate-600 space-y-1">
                            <li>
                              • Mark Resolved: From APPROVED, RESOLVED, or
                              RESOLVED_IN_COURT
                            </li>
                            <li>
                              • Resolved in Court: From APPROVED,
                              RESOLVED_IN_COURT, or RESOLVED
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
