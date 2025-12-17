"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreateUser, useRoles } from "@/hooks/useUsers";
import type { CreateUserDto, Role } from "@/lib/userTypes";
import { listInsuranceOptions, type InsuranceOption } from "../../../services/insurance/insurance.api";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

/* ---------- Zod schema ---------- */
const CreateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 6 characters"),
    email: z.string().email("Enter a valid email"),
    phoneNumber: z
      .string()
      .min(10, "Phone number is too short must at least 10 number")
      .regex(/^[\d+()\-\s]{7,}$/, "Enter a valid phone number"),
    role_id: z.string().min(1, "Role is required"),
    insurance_company_id: z.string().optional(),       // conditionally required
    // helper (not sent to API) to allow conditional validation
    role_name: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const isRep = /insurance\s*represent/i.test(val.role_name ?? "");
    if (isRep && !val.insurance_company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Insurance company is required for Insurance Representatives",
        path: ["insurance_company_id"],
      });
    }
  });

type FormValues = z.infer<typeof CreateUserSchema>;

export default function CreateUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role_id: "",
      insurance_company_id: "",
      role_name: "",
    },
  });

  const roleId = watch("role_id");

  // Load insurance companies for the dropdown
  const {
    data: companies = [],
    isLoading: loadingCompanies,
  } = useQuery<InsuranceOption[]>({
    queryKey: ["insurance", "options"],
    queryFn: () => listInsuranceOptions(),
    staleTime: 60_000,
  });

  // Keep role_name in sync (used by Zod to decide if company is required)
  useEffect(() => {
    const selected = roles.find((r: Role) => r.id === roleId);
    const roleName = (selected?.name ?? "").toString();
    setValue("role_name", roleName, { shouldValidate: true });
    // If leaving Insurance Rep, clear company
    if (!/insurance\s*represent/i.test(roleName)) {
      setValue("insurance_company_id", "");
    }
  }, [roleId, roles, setValue]);

  const isInsuranceRep = useMemo(() => {
    const selected = roles.find((r: Role) => r.id === roleId);
    return /insurance\s*represent/i.test((selected?.name ?? "").toString());
  }, [roles, roleId]);

  const onSubmit = handleSubmit(async (values) => {
  const { role_name, insurance_company_id, role_id, ...rest } = values;

  const payload = {
    ...rest, // name, email, phoneNumber
    roleId: role_id,
    ...( /insurance\s*represent/i.test(role_name ?? "")
        ? { insuranceCompanyId: insurance_company_id }
        : {} ),
  };

  try {
    await toast.promise(createUser.mutateAsync(payload as any), {
      loading: "Creating user…",
      success: "User created successfully",
      error: (err: any) =>
        err?.message || err?.response?.data?.message || "Failed to create user",
    });
    onSuccess?.();
    reset({
      name: "",
      email: "",
      phoneNumber: "",
      role_id: "",
      insurance_company_id: "",
      role_name: "",
    });
  } catch {
    // handled by toast.promise
  }
});

  return (
    <form onSubmit={onSubmit} className="grid gap-3 max-w-lg p-4 border rounded-lg bg-white">
      {/* Name */}
      <div>
        <input
          className={`border rounded text-blue-500 px-3 py-2 w-full ${errors.name ? "border-rose-400" : ""}`}
          placeholder="Full name"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <input
          className={`border rounded text-blue-500 px-3 py-2 w-full ${errors.email ? "border-rose-400" : ""}`}
          placeholder="Email"
          type="email"
          {...register("email")}
        />
        {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <input
          className={`border rounded text-blue-500 px-3 py-2 w-full ${errors.phoneNumber ? "border-rose-400" : ""}`}
          placeholder="Phone number"
          {...register("phoneNumber")}
        />
        {errors.phoneNumber && (
          <p className="mt-1 text-xs text-rose-600">{errors.phoneNumber.message}</p>
        )}
      </div>

      {/* Role */}
      <label className="space-y-1">
        <span className="text-xs text-slate-600">Role</span>
        <select
          className={`border rounded text-blue-500 px-3 py-2 w-full ${errors.role_id ? "border-rose-400" : ""}`}
          {...register("role_id")}
        >
          <option value="">Select role…</option>
          {roles.map((r: Role) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.role_id && <p className="mt-1 text-xs text-rose-600">{errors.role_id.message}</p>}
      </label>

      {/* Hidden helper for schema (kept in sync above) */}
      <input type="hidden" {...register("role_name")} />

      {/* Company (shown only when needed) */}
      {isInsuranceRep && (
        <label className="space-y-1">
          <span className="text-xs text-slate-600">Insurance Company (required)</span>
          <select
            className={`border rounded text-blue-500 px-3 py-2 w-full ${errors.insurance_company_id ? "border-rose-400" : ""}`}
            disabled={loadingCompanies}
            {...register("insurance_company_id")}
          >
            <option value="">
              {loadingCompanies ? "Loading companies…" : "Select company…"}
            </option>
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.insurance_company_id && (
            <p className="mt-1 text-xs text-rose-600">{errors.insurance_company_id.message}</p>
          )}
        </label>
      )}

      <button
        type="submit"
        disabled={isSubmitting || createUser.isPending}
        className="rounded px-4 py-2 bg-[#0a2045] text-white disabled:opacity-60"
      >
        {isSubmitting || createUser.isPending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
