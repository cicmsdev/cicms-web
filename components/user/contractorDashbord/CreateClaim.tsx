"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Trash2, ArrowLeft } from "lucide-react";

import Input from "../../ui/Input";
import Button from "../../ui/Button";

import { listInsurance } from "../../../services/insurance/insurance.api";
import {
  createClaim,
  getMyClaim,
  updateMyClaim,
} from "../../../services/claims/contractor/claims.api";
// ⬇️ add this (evaluator fetcher)
import { getEvaluatorClaim } from "../../../services/claims/evaluator/evaluator.api";

import {
  createDocument,
  deleteDocument,
} from "../../../services/document/document.api";

import type { Insurance } from "@/lib/insuranceTypes";
import type { Claim } from "@/lib/claims";
import type { DocumentType } from "@/lib/documentTypes";
import { API_BASE_URL } from "@/lib/constants";

// ---------- helpers/constants ----------
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);
const MAX_BYTES = 25 * 1024 * 1024;

const ALL_DOC_TYPES = [
  "DAMAGE_REPORT",
  "POLICE_REPORT",
  "LAND_OWNERSHIP_PROOF",
  "SITE_INSPECTION_REPORT", // added
] as const;
type DocType = (typeof ALL_DOC_TYPES)[number];

const inputLikeSelect =
  "appearance-none h-10 sm:h-12 w-full rounded-lg border px-3 sm:px-4 text-sm sm:text-base text-gray-900 bg-white outline-none " +
  "focus:ring-2 focus:ring-[#0a2045]/30 focus:border-[#0a2045] disabled:opacity-50 disabled:cursor-not-allowed pr-10";

const sizeStr = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;

const humanize = (s?: string) =>
  typeof s === "string" ? s.replaceAll("_", " ") : "";

// Build schema per mode (create vs edit)
const makeSchema = (isEdit: boolean, allowed: readonly DocType[]) =>
  z
    .object({
      companyId: z.string().uuid("Select a valid company"),
      claimTitle: z.string().min(3).max(25).trim(),
      documents: z
        .array(
          z.object({
            documentType: z.string(),
            file: z.instanceof(File),
          })
        )
        .optional()
        .default([]),
    })
    .superRefine((data, ctx) => {
      const docs = data.documents ?? [];
      for (let i = 0; i < docs.length; i++) {
        const item = docs[i];
        if (!allowed.includes(item.documentType as DocType)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["documents", i, "documentType"],
            message: "This document type is not allowed for your role.",
          });
        }
        if (!(item as any)?.file) continue;
        if (!ALLOWED_MIME.has((item.file as File).type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["documents", i, "file"],
            message: "File must be PDF, DOC, DOCX, PNG, or JPG.",
          });
        }
        if ((item.file as File).size > MAX_BYTES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["documents", i, "file"],
            message: "File must be 25MB or smaller.",
          });
        }
      }
    });

// ---------- component ----------
type Props = { claimId?: string };

export default function CreateOrUpdateClaimPage({ claimId: propId }: Props) {
  const router = useRouter();
  const params = useParams();
  const routeClaimId = (params?.claimId as string) || undefined;
  const claimId = propId ?? routeClaimId;
  const isEdit = Boolean(claimId);
  const qc = useQueryClient();

  // role
  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isContractor = (role ?? "").toUpperCase() === "CONTRACTOR";
  const isEvaluator = (role ?? "").toUpperCase() === "EVALUATOR";

  // allowed doc types per role
  const ALLOWED_FOR_USER: readonly DocType[] = isContractor
    ? (["DAMAGE_REPORT", "POLICE_REPORT", "LAND_OWNERSHIP_PROOF"] as const)
    : (["SITE_INSPECTION_REPORT"] as const);

  // companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["insurance"],
    queryFn: listInsurance,
    select: (res: any): Insurance[] =>
      (Array.isArray(res) ? res : res?.data) ?? [],
  });

  // existing claim (edit) — role-aware fetcher to avoid 403
  const { data: existing } = useQuery<Claim>({
    queryKey: ["claim-edit", claimId, role],
    queryFn: () =>
      isContractor
        ? getMyClaim!(claimId as string)
        : getEvaluatorClaim!(claimId as string),
    enabled: isEdit && !!claimId && (isContractor || isEvaluator),
  });

  // Editing rules:
  // - Contractors: editable only when SUBMITTED
  // - Evaluators: core fields locked, but can upload SITE_INSPECTION_REPORT
  const canEdit = isEdit
    ? isContractor
      ? (existing as any)?.status === "SUBMITTED"
      : true
    : true;

  const lockCoreFields = isEvaluator || (isEdit && !canEdit); // locks company/title inputs
  const canDeleteDocs = isContractor && canEdit; // evaluators can't delete
  const disableDocButtons = isContractor ? isEdit && !canEdit : false; // evaluators can add/replace files

  // RHF
  type FormData = z.input<ReturnType<typeof makeSchema>>;
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(makeSchema(isEdit, ALLOWED_FOR_USER)),
    defaultValues: { documents: [] },
  });

  // Prefill on edit
  useEffect(() => {
    if (isEdit && existing) {
      reset({
        companyId:
          (existing as any)?.companyId ??
          (existing as any)?.company?.companyId ??
          "",
        claimTitle: (existing as any)?.ClaimTitle ?? "",
        documents: [],
      } as any);
    }
  }, [isEdit, existing, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: "documents" });
  const docs = watch("documents");

  // CREATE or UPDATE
  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: FormData) => {
      if (!isEdit) {
        // CREATE (contractors only)
        if (isEvaluator) {
          throw new Error("Evaluators cannot create new claims.");
        }
        const created = await createClaim({
          companyId: payload.companyId as any,
          claimTitle: payload.claimTitle,
        });

        const createdClaim = (created?.data ?? created) as any;
        const newId: string =
          createdClaim?.claimId ?? createdClaim?.data?.claimId;
        if (!newId) throw new Error("Claim created but claimId missing");

        const toUpload = payload.documents ?? [];
        if (toUpload.length > 0) {
          const results = await Promise.allSettled(
            toUpload.map((d) =>
              createDocument({
                documentType: d.documentType as DocumentType,
                claimId: newId,
                file: d.file,
              })
            )
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            toast.error(
              `Uploaded ${toUpload.length - failed}/${toUpload.length} documents. Some failed.`
            );
          }
        }
        return created;
      } else {
        // UPDATE
        if (isContractor) {
          // contractors can update core fields only when allowed
          if (canEdit) {
            await updateMyClaim(claimId!, {
              claimTitle: payload.claimTitle,
              companyId: payload.companyId,
            });
          } else {
            // silently ignore core update if locked
          }
        } else {
          // evaluator: never update core fields, they only upload documents
        }

        const toUpload = payload.documents ?? [];
        if (toUpload.length > 0) {
          const results = await Promise.allSettled(
            toUpload.map((d) =>
              createDocument({
                documentType: d.documentType as DocumentType,
                claimId: claimId!,
                file: d.file,
              })
            )
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            toast.error(
              `Uploaded ${toUpload.length - failed}/${toUpload.length} documents. Some failed.`
            );
          }
        }
        await qc.invalidateQueries({ queryKey: ["claim-edit", claimId] });
        return true;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Changes saved" : "Claim submitted");
      reset({ documents: [] } as any);
      router.back();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (isEdit ? "Failed to save changes" : "Failed to submit claim");
      toast.error(msg);
    },
  });

  const onSubmit = (data: FormData) => mutate(data);

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // existing docs (edit)
  const existingDocs: any[] = (existing as any)?.documents ?? [];

  const handleDeleteDoc = async (documentId?: string) => {
    if (!documentId) return;
    try {
      await deleteDocument(documentId);
      toast.success("Document removed");
      await qc.invalidateQueries({ queryKey: ["claim-edit", claimId] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center items-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-xl border rounded-2xl shadow-md p-6 lg:p-8">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center text-[#0a2045] hover:text-[#6784c6] mb-4 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          {/* Header */}
          <div className="shrink-0">
            <h1 className="text-2xl font-semibold text-[#0a2045] mb-2">
              {isEdit ? "Update Claim" : "Create New Claim"}
            </h1>
            <p className="text-gray-500 mb-4">
              {isEdit
                ? isEvaluator
                  ? "You can upload a Site Inspection Report. Core fields are locked."
                  : "Modify the title or attach more documents."
                : "Fill in the details below to submit your claim."}
            </p>

            {/* Status Display */}
            {isEdit && existing && (
              <div
                className={`p-3 rounded-lg mb-4 ${
                  canEdit
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    canEdit ? "text-blue-800" : "text-amber-900"
                  }`}
                >
                  <strong>Current Status:</strong>{" "}
                  {(existing as any)?.status || "UNKNOWN"}
                  {!canEdit && isContractor && (
                    <span className="block mt-1">
                      Only claims with "SUBMITTED" status can be edited by contractors.
                    </span>
                  )}
                  {isEvaluator && (
                    <span className="block mt-1">
                      Core fields are locked for evaluators; you may upload a SITE_INSPECTION_REPORT.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5 mb-6">
            {/* Company */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Insurance Company
              </label>
              <div className="relative">
                <select
                  disabled={companiesLoading || lockCoreFields}
                  className={inputLikeSelect}
                  {...register("companyId")}
                >
                  <option value="">Select a company</option>
                  {companies.map((c: Insurance) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {errors.companyId && (
                <p className="text-red-500 text-xs sm:text-sm">
                  {errors.companyId.message as string}
                </p>
              )}
            </div>

            {/* Claim Title */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Claim Title
              </label>
              <Input
                type="text"
                placeholder="e.g., Roof damage at Site A"
                className={`h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4 text-gray-900 w-full ${
                  lockCoreFields ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={lockCoreFields}
                {...register("claimTitle")}
              />
              <div className="flex justify-between">
                {errors.claimTitle ? (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.claimTitle.message as string}
                  </p>
                ) : (
                  <span className="text-xs text-gray-400">
                    Max 25 characters
                  </span>
                )}
              </div>
            </div>

            {/* Existing documents (edit only) */}
            {isEdit && (
              <div className="pt-2">
                <h3 className="text-md font-semibold text-[#0a2045] mb-2">
                  Existing Documents
                </h3>
                {existingDocs.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {existingDocs.map((d: any, idx: number) => {
                      const docId = d?.documentId ?? d?.id ?? null;
                      const name =
                        d?.name || d?.filename || `Document ${idx + 1}`;
                      const createdAtStr = d?.createdAt
                        ? new Date(d.createdAt).toLocaleString()
                        : "";
                      const downloadUrl = docId
                        ? `${API_BASE_URL}/documents/${docId}/download`
                        : null;
                      const typeLabel = humanize(d?.documentType ?? d?.type);

                      return (
                        <div
                          key={docId ?? idx}
                          className="border rounded-lg p-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {name}
                            </p>
                            {createdAtStr && (
                              <p className="text-xs text-gray-500">
                                {createdAtStr}
                              </p>
                            )}
                            {typeLabel && (
                              <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {typeLabel}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {downloadUrl && (
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-white hover:bg-slate-50 text-[#0a2045] border-slate-200"
                              >
                                <Download size={14} />
                                Download
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(docId || undefined)}
                              disabled={!canDeleteDocs}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${
                                !canDeleteDocs
                                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                  : "border-red-200 text-red-600 hover:bg-red-50"
                              }`}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* New documents */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-md font-semibold text-[#0a2045]">
                  {isEdit
                    ? "Add More Documents (optional)"
                    : "Attach Documents (optional)"}
                </h3>
                <button
                  type="button"
                  onClick={() => append({ documentType: "", file: undefined as any })}
                  disabled={disableDocButtons}
                  className={`inline-flex items-center px-3 py-2 text-sm rounded border text-[#0a2045] ${
                    disableDocButtons
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-50"
                  }`}
                >
                  Add document
                </button>
              </div>

              {fields.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {fields.map((field, idx) => {
                    const current = docs?.[idx];
                    const hasType = !!current?.documentType;
                    const currentFile = current?.file;

                    return (
                      <div
                        key={field.id}
                        className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start"
                      >
                        <div>
                          {/* Type first */}
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-900">
                              Document Type
                            </label>
                            <select
                              className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 ${
                                disableDocButtons ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              disabled={disableDocButtons}
                              {...register(`documents.${idx}.documentType` as const)}
                              onChange={(e) => {
                                setValue(
                                  `documents.${idx}.documentType` as const,
                                  e.target.value,
                                  { shouldValidate: true }
                                );
                                setValue(
                                  `documents.${idx}.file` as const,
                                  undefined as any,
                                  { shouldValidate: true }
                                );
                              }}
                            >
                              <option value="">Select type</option>
                              {ALLOWED_FOR_USER.map((t) => (
                                <option key={t} value={t}>
                                  {t.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                            {errors.documents?.[idx]?.documentType && (
                              <p className="text-red-500 text-xs sm:text-sm">
                                {errors.documents[idx]!.documentType!.message as string}
                              </p>
                            )}
                            {!hasType && (
                              <p className="text-xs text-gray-500 mt-1">
                                Select a document type to enable the file picker.
                              </p>
                            )}
                          </div>

                          {/* File (after type) */}
                          <div className="mt-3">
                            <label className="block text-sm font-medium mb-1 text-gray-900">
                              File
                            </label>
                            {!currentFile ? (
                              <label
                                className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border text-[#0a2045] ${
                                  hasType && !disableDocButtons
                                    ? "cursor-pointer hover:bg-blue-50"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                              >
                                {hasType ? "Select file" : "Select type first"}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                  className="hidden"
                                  disabled={!hasType || disableDocButtons}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f)
                                      setValue(
                                        `documents.${idx}.file` as const,
                                        f,
                                        { shouldValidate: true }
                                      );
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700">
                                  {currentFile.name} ({sizeStr(currentFile.size)})
                                </span>
                                <label
                                  className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border ${
                                    disableDocButtons
                                      ? "opacity-50 cursor-not-allowed"
                                      : "cursor-pointer hover:bg-blue-50"
                                  } text-[#0a2045]`}
                                >
                                  Replace
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    className="hidden"
                                    disabled={disableDocButtons}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f)
                                        setValue(
                                          `documents.${idx}.file` as const,
                                          f,
                                          { shouldValidate: true }
                                        );
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                            {errors.documents?.[idx]?.file && (
                              <p className="text-red-500 text-xs sm:text-sm mt-1">
                                {errors.documents[idx]!.file!.message as string}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              PDF, DOC/DOCX, PNG, or JPG — up to 25MB.
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            disabled={disableDocButtons}
                            className={`px-3 py-2 text-sm rounded border ${
                              disableDocButtons
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No documents added. Click{" "}
                  <span className="font-medium">Add document</span> to start.
                </p>
              )}
            </div>
          </div>

          {/* Footer - Submit Button */}
          <div className="shrink-0 pt-4 border-t">
            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                disabled={isPending}
                className={`w-full max-w-xs bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center`}
                label={
                  isEdit
                    ? isPending
                      ? "Saving..."
                      : isEvaluator
                      ? "Upload Report"
                      : "Save Changes"
                    : isPending
                    ? "Submitting..."
                    : "Submit Claim"
                }
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
