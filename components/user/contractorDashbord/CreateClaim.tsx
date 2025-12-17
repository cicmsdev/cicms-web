"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Trash2 } from "lucide-react";

import Input from "../../ui/Input";
import Button from "../../ui/Button";

import { listInsurance } from "../../../services/insurance/insurance.api";
import {
  createClaim,
  getMyClaim,
  updateMyClaim,
} from "../../../services/claims/contractor/claims.api";

import {
  createDocument,
  deleteDocument,
} from "../../../services/document/document.api";

import type { Insurance } from "@/lib/insuranceTypes";
import type { Claim } from "@/lib/claims";
import type { DocumentType } from "@/lib/documentTypes";
import { API_BASE_URL } from "@/lib/constants";

/* ------------------------- helpers/constants ------------------------- */

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
] as const;
type DocType = (typeof ALL_DOC_TYPES)[number];

// NEW: Claim types
const ALL_CLAIM_TYPES = [
  "MATERIAL_DAMAGE",
  "EQUIPMENT_DAMAGE",
  "WORKSITE_ACCIDENT",
  "STRUCTURAL_FAILURE",
  "FIRE",
  "NATURAL_DISASTER",
  "ACCIDENT",
  "OTHERS",
] as const;
type ClaimType = (typeof ALL_CLAIM_TYPES)[number];

const sizeStr = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;

const humanize = (s?: string) =>
  typeof s === "string" ? s.replaceAll("_", " ") : "";

/* ------------------------- Schema ------------------------- */

const makeSchema = (allowed: readonly DocType[]) =>
  z
    .object({
      companyId: z.string().uuid("Select a valid company"),
      claimTitle: z
        .string()
        .min(3, "Title must be at least 3 characters")
        .max(25, "Max 25 characters")
        .trim(),
      claimType: z.enum(ALL_CLAIM_TYPES),
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
            message: "This document type is not allowed.",
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

/* ------------------------- component ------------------------- */

type Props = { claimId?: string };

export default function CreateOrUpdateClaimPage({ claimId: propId }: Props) {
  const router = useRouter();
  const params = useParams();
  const routeClaimId = (params?.claimId as string) || undefined;
  const claimId = propId ?? routeClaimId;
  const isEdit = Boolean(claimId);
  const qc = useQueryClient();

  const ALLOWED_FOR_USER: readonly DocType[] = ALL_DOC_TYPES;

  // Companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["insurance"],
    queryFn: listInsurance,
    select: (res: any): Insurance[] =>
      (Array.isArray(res) ? res : res?.data) ?? [],
  });

  // Existing claim (edit)
  const { data: existing } = useQuery<Claim>({
    queryKey: ["claim-edit", claimId],
    queryFn: () => getMyClaim!(claimId as string),
    enabled: isEdit && !!claimId,
  });

  const canEdit = isEdit ? (existing as any)?.status === "SUBMITTED" : true;
  const lockCoreFields = isEdit && !canEdit;
  const canDeleteDocs = isEdit && canEdit;
  const disableDocButtons = isEdit && !canEdit;

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
    resolver: zodResolver(makeSchema(ALLOWED_FOR_USER)),
    defaultValues: { documents: [], claimType: "" as unknown as ClaimType },
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
        claimType:
          ((existing as any)?.claimType as ClaimType) ??
          ("OTHERS" as ClaimType),
        documents: [],
      } as any);
    }
  }, [isEdit, existing, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "documents",
  });
  const docs = watch("documents");

  // CREATE or UPDATE
  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: FormData) => {
      if (!isEdit) {
        // CREATE
        const created = await createClaim({
          companyId: payload.companyId,
          claimTitle: payload.claimTitle,
          claimType: payload.claimType,
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
              `Uploaded ${toUpload.length - failed}/${
                toUpload.length
              } documents. Some failed.`
            );
          }
        }
        return created;
      } else {
        // UPDATE
        if (canEdit) {
          await updateMyClaim(claimId!, {
            claimTitle: payload.claimTitle,
            companyId: payload.companyId,
            claimType: payload.claimType,
          });
        }

        const toUpload = payload.documents ?? [];
        if (toUpload.length > 0 && canEdit) {
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
              `Uploaded ${toUpload.length - failed}/${
                toUpload.length
              } documents. Some failed.`
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
      router.replace("/contractorDash");
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

  // Existing docs (edit)
  const existingDocs: any[] = (existing as any)?.documents ?? [];
  const handleDeleteDoc = async (documentId?: string) => {
    if (!documentId) return;
    try {
      await deleteDocument(documentId);
      toast.success("Document removed");
      await qc.invalidateQueries({ queryKey: ["claim-edit", claimId] });
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to delete"
      );
    }
  };

  /* ------------------------- UI ------------------------- */

  return (
    <div className="w-full flex justify-center p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col w-full max-w-lg p-4 border rounded-lg bg-white max-h-[80vh] h-[80vh]"
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Title */}
          <div className="mb-1">
            <h1 className="text-lg font-semibold text-[#0a2045]">
              {isEdit ? "Update Claim" : "Create New Claim"}
            </h1>
            {isEdit && existing && (
              <p
                className={`mt-1 text-xs ${
                  canEdit ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                Current Status: <b>{(existing as any)?.status || "UNKNOWN"}</b>
                {!canEdit && (
                  <span className="block">
                    Only claims with <b>SUBMITTED</b> status can be edited.
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Company */}
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Insurance Company</span>
            <select
              disabled={companiesLoading || lockCoreFields}
              className={`border rounded text-blue-500 px-3 py-2 w-full ${
                errors.companyId ? "border-rose-400" : ""
              } ${lockCoreFields ? "opacity-60" : ""}`}
              {...register("companyId")}
            >
              <option value="">
                {companiesLoading ? "Loading companies…" : "Select company…"}
              </option>
              {companies.map((c: Insurance) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.companyId.message as string}
              </p>
            )}
          </label>

          {/* Claim Type */}
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Claim Type</span>
            <select
              disabled={lockCoreFields}
              className={`border rounded text-blue-500 px-3 py-2 w-full ${
                errors.claimType ? "border-rose-400" : ""
              } ${lockCoreFields ? "opacity-60" : ""}`}
              {...register("claimType")}
            >
              <option value="">Select type…</option>
              {ALL_CLAIM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            {errors.claimType && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.claimType.message as string}
              </p>
            )}
          </label>

          {/* Claim Title */}
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Claim Title</span>
            <Input
              type="text"
              placeholder="e.g., Roof damage at Site A"
              className={`border rounded text-blue-500 px-3 py-2 w-full ${
                errors.claimTitle ? "border-rose-400" : ""
              } ${lockCoreFields ? "opacity-60" : ""}`}
              disabled={lockCoreFields}
              {...register("claimTitle")}
            />
            {errors.claimTitle ? (
              <p className="mt-1 text-xs text-rose-600">
                {errors.claimTitle.message as string}
              </p>
            ) : (
              <span className="text-[11px] text-slate-500">
                Max 25 characters
              </span>
            )}
          </label>

          {/* Existing Documents (edit only) */}
          {isEdit && (
            <div className="mt-2">
              <span className="text-xs text-slate-600">Existing Documents</span>
              <div className="mt-1 space-y-2">
                {existingDocs.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents.</p>
                ) : (
                  existingDocs.map((d: any, idx: number) => {
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
                        className="border rounded px-3 py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
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
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border bg-white hover:bg-slate-50 text-[#0a2045] border-slate-200"
                            >
                              <Download size={14} />
                              Download
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(docId || undefined)}
                            disabled={!canDeleteDocs}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border ${
                              !canDeleteDocs
                                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-rose-200 text-rose-600 hover:bg-rose-50"
                            }`}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* New Documents */}
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {isEdit ? "Add More Documents" : "Attach Documents"}
              </span>
              <button
                type="button"
                onClick={() =>
                  append({ documentType: "", file: undefined as any })
                }
                disabled={disableDocButtons}
                className={`rounded px-3 py-2 border text-[#0a2045] text-sm ${
                  disableDocButtons
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-50"
                }`}
              >
                Add document
              </button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-gray-500">No documents added.</p>
            )}

            {fields.map((field, idx) => {
              const current = docs?.[idx];
              const hasType = !!current?.documentType;
              const currentFile = current?.file;

              return (
                <div key={field.id} className="border rounded p-3 space-y-3">
                  {/* Type */}
                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-600">
                      Document Type
                    </span>
                    <select
                      className={`border rounded text-blue-500 px-3 py-2 w-full ${
                        errors.documents?.[idx]?.documentType
                          ? "border-rose-400"
                          : ""
                      } ${disableDocButtons ? "opacity-60" : ""}`}
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
                      <option value="">Select type…</option>
                      {ALL_DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    {errors.documents?.[idx]?.documentType && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.documents[idx]!.documentType!.message as string}
                      </p>
                    )}
                    {!hasType && (
                      <p className="text-[11px] text-slate-500">
                        Select a document type to enable the file picker.
                      </p>
                    )}
                  </label>

                  {/* File */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600">File</span>
                    {!currentFile ? (
                      <label
                        className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border text-[#0a2045] ${
                          hasType && !disableDocButtons
                            ? "cursor-pointer hover:bg-blue-50"
                            : "opacity-60 cursor-not-allowed"
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
                              setValue(`documents.${idx}.file` as const, f, {
                                shouldValidate: true,
                              });
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
                          className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border text-[#0a2045] ${
                            disableDocButtons
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer hover:bg-blue-50"
                          }`}
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
                                setValue(`documents.${idx}.file` as const, f, {
                                  shouldValidate: true,
                                });
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}
                    {errors.documents?.[idx]?.file && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.documents[idx]!.file!.message as string}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      PDF, DOC/DOCX, PNG, or JPG — up to 25MB.
                    </p>
                  </div>

                  {/* Remove row */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      disabled={disableDocButtons}
                      className={`rounded px-3 py-2 border text-sm ${
                        disableDocButtons
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions (sticky at the bottom of the form box) */}
        <div className="pt-2 border-t bg-white">
          <button
            type="submit"
            disabled={isPending}
            className="rounded px-4 py-2 bg-[#0a2045] text-white disabled:opacity-60 w-full"
          >
            {isPending
              ? isEdit
                ? "Saving…"
                : "Submitting…"
              : isEdit
              ? "Save Changes"
              : "Submit Claim"}
          </button>

          <div className="mt-2">
            <Button
              type="button"
              className="w-full border bg-white text-[#0a2045]"
              onClick={() => router.back()}
              label="Back"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
