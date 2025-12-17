"use client";

import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Download, ArrowLeft } from "lucide-react";

import Button from "../../ui/Button";
import { getInsuranceClaim } from "../../../services/claims/insurer/insurerClaims.api";
import { createDocument } from "../../../services/document/document.api";
import type { DocumentType } from "@/lib/documentTypes";
import { API_BASE_URL } from "@/lib/constants";

/* ----------------------------- constants ----------------------------- */
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

const ALLOWED_TYPE = "PAYMENT_PROOF";

/* ---------------------------- Zod schema ---------------------------- */
const paymentProofSchema = z
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
      if (item.documentType !== ALLOWED_TYPE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documents", i, "documentType"],
          message: `Only ${ALLOWED_TYPE} is allowed.`,
        });
      }
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

type PaymentProofFormValues = z.infer<typeof paymentProofSchema>;

/* ---------------------------- Component ---------------------------- */
export default function UploadPaymentProofPage() {
  const router = useRouter();
  const params = useParams();
  const claimId = params?.claimId as string;
  const qc = useQueryClient();

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", claimId],
    queryFn: () => getInsuranceClaim(claimId),
    enabled: !!claimId,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentProofFormValues>({
    resolver: zodResolver(paymentProofSchema),
    defaultValues: { documents: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "documents",
  });
  const docs = watch("documents");

  const { mutate: uploadDocuments, isPending } = useMutation({
    mutationFn: async (payload: PaymentProofFormValues) => {
      const toUpload = payload.documents ?? [];
      if (toUpload.length === 0) throw new Error("Add at least one document");

      const results = await Promise.allSettled(
        toUpload.map((d) =>
          createDocument({
            documentType: d.documentType as DocumentType,
            claimId,
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
    },
    onSuccess: () => {
      toast.success("Payment proof uploaded successfully");
      reset({ documents: [] });
      qc.invalidateQueries({ queryKey: ["claim", claimId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload");
    },
  });

  const onSubmit: SubmitHandler<PaymentProofFormValues> = (data) =>
    uploadDocuments(data);

  const handleBack = () => router.back();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading claim details...
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Claim not found
      </div>
    );
  }

  const existingDocs: any[] = (claim as any)?.documents ?? [];

  return (
    <div className="min-h-screen flex justify-center items-center p-4 sm:p-6 lg:p-10 bg-white">
      <div className="w-full max-w-xl border rounded-2xl shadow-md p-6 lg:p-8">
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center text-[#0a2045] hover:text-[#6784c6] mb-4 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-[#0a2045] mb-2">
          Upload Payment Proof
        </h1>
        <p className="text-gray-500 mb-4">
          Upload your PAYMENT_PROOF document. Core claim fields are locked.
        </p>

        {/* Existing Documents */}
        <div className="mb-4">
          <h3 className="text-md font-semibold text-[#0a2045] mb-2">
            Existing Documents
          </h3>
          {existingDocs.length === 0 ? (
            <p className="text-sm text-gray-500">No documents.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {existingDocs.map((d: any, idx: number) => {
                const docId = d?.documentId ?? d?.id ?? idx;
                const name = d?.name || d?.filename || `Document ${idx + 1}`;
                const createdAtStr = d?.createdAt
                  ? new Date(d.createdAt).toLocaleString()
                  : "";
                const downloadUrl = docId
                  ? `${API_BASE_URL}/documents/${docId}/download`
                  : null;
                return (
                  <div
                    key={docId}
                    className="border rounded-lg p-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {createdAtStr && (
                        <p className="text-xs text-gray-500">{createdAtStr}</p>
                      )}
                      <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ALLOWED_TYPE}
                      </span>
                    </div>
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
                );
              })}
            </div>
          )}
        </div>

        {/* Add new documents */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-[#0a2045]">
              Add Payment Proof
            </h3>
            <button
              type="button"
              onClick={() =>
                append({ documentType: ALLOWED_TYPE, file: undefined as any })
              }
              className="inline-flex items-center px-3 py-2 text-sm rounded border text-[#0a2045] hover:bg-blue-50"
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
                  <div
                    key={field.id}
                    className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start"
                  >
                    <div>
                      <input
                        type="hidden"
                        value={ALLOWED_TYPE}
                        {...register(`documents.${idx}.documentType` as const)}
                      />

                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-900">
                          Document Type
                        </label>
                        <div className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {ALLOWED_TYPE}
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1 text-gray-900">
                          File
                        </label>
                        {!currentFile ? (
                          <label className="inline-flex justify-center items-center px-3 py-2 text-sm rounded border cursor-pointer hover:bg-blue-50 text-[#0a2045]">
                            Select file
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              className="hidden"
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
                            <label className="inline-flex justify-center items-center px-3 py-2 text-sm rounded border cursor-pointer hover:bg-blue-50 text-[#0a2045]">
                              Replace
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
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
                        className="px-3 py-2 text-sm rounded border text-red-600 hover:bg-red-50"
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
              No documents added. Click <span className="font-medium">Add
              document</span> to start.
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t">
          <div className="flex justify-center mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full max-w-xs bg-[#0a2045] hover:bg-[#142c63] text-white h-10 sm:h-12 text-sm sm:text-base flex justify-center items-center"
                label={isPending ? "Uploading..." : "Upload Payment Proof"}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
