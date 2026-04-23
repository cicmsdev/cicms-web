"use client";

import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Download, ArrowLeft } from "lucide-react";

import Button from "../../ui/Button";
import { getEvaluatorClaim } from "../../../services/claims/evaluator/evaluator.api";
import { createDocument } from "../../../services/document/document.api";
import type { DocumentType } from "@/lib/documentTypes";
import { API_BASE_URL } from "@/lib/constants";

/* -------------------------------- helpers/constants -------------------------------- */
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const sizeStr = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;

const humanize = (s?: string) => (typeof s === "string" ? s.replaceAll("_", " ") : "");

const ALLOWED_FOR_USER = ["SITE_INSPECTION_REPORT"] as const;

// Evaluator schema mirrors CreateOrUpdate's documents array, restricted to SITE_INSPECTION_REPORT
const evaluatorSchema = z
  .object({
    documents: z
      .array(
        z.object({
          documentType: z.string(),
          file: z.instanceof(File),
        })
      )
      .min(1, "Add at least one document"),
  })
  .superRefine((data, ctx) => {
    const docs = data.documents ?? [];
    for (let i = 0; i < docs.length; i++) {
      const item = docs[i];
      // allowed type
      if (!(ALLOWED_FOR_USER as readonly string[]).includes(item.documentType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documents", i, "documentType"],
          message: "Only SITE_INSPECTION_REPORT is allowed.",
        });
      }
      // file presence & validations
      if (!(item as any)?.file) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documents", i, "file"],
          message: "Select a file.",
        });
      } else {
        const f = item.file as File;
        if (!ALLOWED_MIME.has(f.type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["documents", i, "file"],
            message: "File must be PDF, DOC/DOCX, PNG, or JPG.",
          });
        }
        if (f.size > MAX_BYTES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["documents", i, "file"],
            message: "File must be 25MB or smaller.",
          });
        }
      }
    }
  });

type EvaluatorFormValues = z.infer<typeof evaluatorSchema>;

/* -------------------------------- component -------------------------------- */
export default function EvaluateClaimPage() {
  const router = useRouter();
  const params = useParams();
  const claimId = params?.claimId as string;
  const qc = useQueryClient();

  // Fetch claim (role-aware endpoint to avoid 403)
  const { data: claim, isLoading } = useQuery({
    queryKey: ["evaluator-claim", claimId],
    queryFn: () => getEvaluatorClaim(claimId),
    enabled: !!claimId,
  });

  // RHF setup (documents array like CreateOrUpdate)
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
    reset,
  } = useForm<EvaluatorFormValues>({
    resolver: zodResolver(evaluatorSchema),
    defaultValues: { documents: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "documents" });
  const docs = watch("documents");

  // Upload mutation (mirrors CreateOrUpdate's multi-upload flow)
  const { mutate: uploadDocuments, isPending } = useMutation({
    mutationFn: async (payload: EvaluatorFormValues) => {
      const toUpload = payload.documents ?? [];
      if (toUpload.length === 0) throw new Error("Add at least one document");

      const results = await Promise.allSettled(
        toUpload.map((d) =>
          createDocument({
            documentType: d.documentType as DocumentType, // always SITE_INSPECTION_REPORT
            claimId,
            file: d.file,
          })
        )
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`Uploaded ${toUpload.length - failed}/${toUpload.length} documents. Some failed.`);
      }
    },
    onSuccess: () => {
      toast.success("Report(s) uploaded successfully");
      reset({ documents: [] });
      qc.invalidateQueries({ queryKey: ["evaluator-claim", claimId] });
      // Stay on page so evaluators can add more. If you prefer to go back, uncomment:
      // router.back();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload");
    },
  });

  const onSubmit: SubmitHandler<EvaluatorFormValues> = (data) => uploadDocuments(data);

  const handleBack = () => router.back();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">Loading claim details...</div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center text-red-500">Claim not found</div>
      </div>
    );
  }

  const existingDocs: any[] = (claim as any)?.documents ?? [];

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

        {/* Header & status notice (mirrors CreateOrUpdate) */}
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold text-[#0a2045] mb-2">Evaluate Claim</h1>
          <p className="text-gray-500 mb-4">You can upload Site Inspection Report(s). Core fields are locked for evaluators.</p>

          <div className={`p-3 rounded-lg mb-4 ${"bg-blue-50 border border-blue-200"}`}>
            <p className={`text-sm ${"text-blue-800"}`}>
              <strong>Current Status:</strong> {(claim as any)?.status || "UNKNOWN"}
              <span className="block mt-1">Allowed document: SITE_INSPECTION_REPORT.</span>
            </p>
          </div>

          <div className="text-sm text-slate-600 mb-2">
            <p><strong>Claim:</strong> {(claim as any)?.ClaimTitle || "Untitled"}</p>
            <p><strong>ID:</strong> {claimId}</p>
          </div>
        </div>

        {/* Existing Documents (read-only for evaluator) */}
        <div className="pt-2">
          <h3 className="text-md font-semibold text-[#0a2045] mb-2">Existing Documents</h3>
          {existingDocs.length === 0 ? (
            <p className="text-sm text-gray-500">No documents.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {existingDocs.map((d: any, idx: number) => {
                const docId = d?.documentId ?? d?.id ?? null;
                const name = d?.name || d?.filename || `Document ${idx + 1}`;
                const createdAtStr = d?.createdAt ? new Date(d.createdAt).toLocaleString() : "";
                const downloadUrl = docId ? `${API_BASE_URL}/documents/${docId}/download` : null;
                const typeLabel = humanize(d?.documentType ?? d?.type);

                return (
                  <div key={docId ?? idx} className="border rounded-lg p-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {createdAtStr && <p className="text-xs text-gray-500">{createdAtStr}</p>}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new documents (mirrors CreateOrUpdate) */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-[#0a2045]">Add Site Inspection Report(s)</h3>
            <button
              type="button"
              onClick={() => append({ documentType: "SITE_INSPECTION_REPORT", file: undefined as any })}
              className={`inline-flex items-center px-3 py-2 text-sm rounded border text-[#0a2045] hover:bg-blue-50`}
            >
              Add document
            </button>
          </div>

          {fields.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {fields.map((field, idx) => {
                const current = docs?.[idx];
                const currentFile = current?.file as File | undefined;

                return (
                  <div key={field.id} className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                    <div>
                      {/* Hidden registered input to ensure RHF value even if UI is non-editable */}
                      <input
                        type="hidden"
                        value="SITE_INSPECTION_REPORT"
                        {...register(`documents.${idx}.documentType` as const)}
                      />

                      {/* Read-only label for type */}
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-900">Document Type</label>
                        <div className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          SITE INSPECTION REPORT
                        </div>
                      </div>

                      {/* File */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1 text-gray-900">File</label>
                        {!currentFile ? (
                          <label className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border cursor-pointer hover:bg-blue-50 text-[#0a2045]`}>
                            Select file
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setValue(`documents.${idx}.file` as const, f, { shouldValidate: true });
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700">{currentFile.name} ({sizeStr(currentFile.size)})</span>
                            <label className={`inline-flex justify-center items-center px-3 py-2 text-sm rounded border cursor-pointer hover:bg-blue-50 text-[#0a2045]`}>
                              Replace
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setValue(`documents.${idx}.file` as const, f, { shouldValidate: true });
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
                        <p className="text-xs text-gray-500 mt-1">PDF, DOC/DOCX, PNG, or JPG — up to 25MB.</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className={`px-3 py-2 text-sm rounded border text-red-600 hover:bg-red-50`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents added. Click <span className="font-medium">Add document</span> to start.</p>
          )}
        </div>

        {/* Footer - Submit */}
        <div className="shrink-0 pt-4 border-t">
          <div className="flex justify-center mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <Button
                type="submit"
                disabled={isPending}
                className={`w-full max-w-xs bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center`}
                label={isPending ? "Uploading..." : "Upload Report(s)"}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
