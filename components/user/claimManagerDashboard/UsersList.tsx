
"use client";

import { useMemo, useState } from "react";
import { useUsers, useRoles } from "@/hooks/useUsers";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import CreateUserForm from "./CreateUserForm"; 

const prettyDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const RoleName = (r: any) => (typeof r === "string" ? r : r?.name ?? "—");

type QueryState = {
  q: string;
  roleId: string;
  status: string;
  defaultPw: string; // "", "true", "false"
  page: number;
  pageSize: number;
  sort: string; // e.g. "name:asc"
};

export default function UsersList() {
  const [qs, setQs] = useState<QueryState>({
    q: "",
    roleId: "",
    status: "",
    defaultPw: "",
    page: 1,
    pageSize: 10,
    sort: "createdAt:desc",
  });


  const [showCreate, setShowCreate] = useState(false);

  const apiQuery = useMemo(
    () => ({
      q: qs.q || undefined,
      roleId: qs.roleId || undefined,
      status: qs.status || undefined,
      defaultPw: qs.defaultPw ? qs.defaultPw === "true" : undefined,
      page: qs.page,
      pageSize: qs.pageSize,
      sort: qs.sort,
    }),
    [qs]
  );

  const { data, isLoading, error, isFetching } = useUsers(apiQuery);
  const { data: roles = [] } = useRoles();

  const onReset = () =>
    setQs((s) => ({ ...s, q: "", roleId: "", status: "", defaultPw: "", page: 1 }));

  const changePage = (p: number) =>
    setQs((s) => ({ ...s, page: Math.max(1, Math.min(data?.pages ?? 1, p)) }));

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* Toolbar with New User button */}
        <div className="mb-3 flex items-center gap-2">
          <div className="text-sm font-medium text-slate-700 hidden md:block">Filters</div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0a2045] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New user
            </button>
          </div>
        </div>

        {/* MOBILE: collapsed filter block */}
        <details className="md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </span>
            <span className="text-xs text-slate-500">
              {qs.q || qs.roleId || qs.status || qs.defaultPw ? "Applied" : "None"}
            </span>
          </summary>

          <div className="mt-3 space-y-3">
            <SearchField value={qs.q} onChange={(v) => setQs((s) => ({ ...s, q: v, page: 1 }))} />

            <div className="grid grid-cols-1 gap-3">
              <SelectField
                label="Role"
                value={qs.roleId}
                onChange={(v) => setQs((s) => ({ ...s, roleId: v, page: 1 }))}
                options={[{ label: "All roles", value: "" }, ...roles.map((r: any) => ({ label: r.name, value: r.id }))]}
              />
              <SelectField
                label="Status"
                value={qs.status}
                onChange={(v) => setQs((s) => ({ ...s, status: v, page: 1 }))}
                options={[
                  { label: "All", value: "" },
                  { label: "ACTIVE", value: "ACTIVE" },
                  { label: "SUSPENDED", value: "SUSPENDED" },
                ]}
              />
              <SelectField
                label="Default PW"
                value={qs.defaultPw}
                onChange={(v) => setQs((s) => ({ ...s, defaultPw: v, page: 1 }))}
                options={[
                  { label: "All", value: "" },
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectInline
                label="Page size"
                value={String(qs.pageSize)}
                onChange={(v) => setQs((s) => ({ ...s, pageSize: Number(v), page: 1 }))}
                options={["5", "10", "20"].map((n) => ({ label: n, value: n }))}
              />
              <SelectInline
                label="Sort"
                value={qs.sort}
                onChange={(v) => setQs((s) => ({ ...s, sort: v, page: 1 }))}
                options={[
                  { label: "Newest", value: "createdAt:desc" },
                  { label: "Oldest", value: "createdAt:asc" },
                  { label: "Name A–Z", value: "name:asc" },
                  { label: "Name Z–A", value: "name:desc" },
                  { label: "Last login ↓", value: "lastLogin:desc" },
                  { label: "Last login ↑", value: "lastLogin:asc" },
                ]}
              />

              <button
                className="ml-auto rounded-lg border text-blue-600 border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={onReset}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </details>

        {/* DESKTOP: grid controls */}
        <div className="hidden md:grid md:gap-2 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="block text-xs font-medium text-slate-600 mb-1">Search</span>
            <SearchField value={qs.q} onChange={(v) => setQs((s) => ({ ...s, q: v, page: 1 }))} />
          </label>

          <label>
            <span className="block text-xs font-medium text-slate-600 mb-1">Role</span>
            <select
              className="w-full rounded-lg border text-blue-600 border-slate-300 px-3 py-2 text-sm"
              value={qs.roleId}
              onChange={(e) => setQs((s) => ({ ...s, roleId: e.target.value, page: 1 }))}
            >
              <option value="">All roles</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="block text-xs font-medium text-slate-600 mb-1">Status</span>
            <select
              className="w-full rounded-lg border text-blue-600 border-slate-300 px-3 py-2 text-sm"
              value={qs.status}
              onChange={(e) => setQs((s) => ({ ...s, status: e.target.value, page: 1 }))}
            >
              <option value="">All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </label>

          <label>
            <span className="block text-xs font-medium text-slate-600 mb-1">Default PW</span>
            <select
              className="w-full rounded-lg border text-blue-600 border-slate-300 px-3 py-2 text-sm"
              value={qs.defaultPw}
              onChange={(e) => setQs((s) => ({ ...s, defaultPw: e.target.value, page: 1 }))}
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>

        {/* DESKTOP second row */}
        <div className="mt-2 hidden md:flex md:flex-wrap md:items-center md:gap-2">
          <SelectInline
            label="Page size"
            value={String(qs.pageSize)}
            onChange={(v) => setQs((s) => ({ ...s, pageSize: Number(v), page: 1 }))}
            options={["5", "10", "20"].map((n) => ({ label: n, value: n }))}
          />

          <SelectInline
            label="Sort"
            value={qs.sort}
            onChange={(v) => setQs((s) => ({ ...s, sort: v, page: 1 }))}
            options={[
              { label: "Newest", value: "createdAt:desc" },
              { label: "Oldest", value: "createdAt:asc" },
              { label: "Name A–Z", value: "name:asc" },
              { label: "Name Z–A", value: "name:desc" },
              { label: "Last login ↓", value: "lastLogin:desc" },
              { label: "Last login ↑", value: "lastLogin:asc" },
            ]}
          />

          <button
            className="ml-auto rounded-lg border text-blue-600 border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-4 text-sm text-slate-600">Loading users…</div>
        ) : error ? (
          <div className="p-4 text-sm text-rose-700 bg-rose-50 rounded-xl">
            {(error as any)?.message ?? "Failed to load"}
          </div>
        ) : (
          <>
            {/* MOBILE: Card list */}
            <div className="md:hidden divide-y">
              {data?.items.map((u: any) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 break-all">{u.email}</div>
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-indigo-100">
                      {RoleName(u.role)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Field label="Phone" value={u.phoneNumber || "—"} />
                    <Field
                      label="Status"
                      value={
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                            (u.status ?? "").toUpperCase() === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-rose-50 text-rose-700 ring-rose-100"
                          }`}
                        >
                          {u.status}
                        </span>
                      }
                    />
                    <Field label="Default PW" value={u.isDefaultPassword ? "Yes" : "No"} />
                    <Field label="Last login" value={prettyDate(u.lastLogin)} />
                    <div className="col-span-2">
                      <Field label="User ID" value={<span className="break-all">{u.id}</span>} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block max-h-[60vh] overflow-auto rounded-xl">
              <table className="w-full text-sm text-slate-800">
                <thead className="sticky top-0 z-10 bg-[#0a2045] text-white shadow-sm">
                  <tr>
                    <Th label="Name" />
                    <Th label="Email" />
                    <Th label="Phone" />
                    <Th label="Role" />
                    <Th label="Status" />
                    <Th label="Default PW" />
                    <Th label="Last Login" />
                  </tr>
                </thead>
                <tbody className="[&>tr:hover]:bg-slate-50">
                  {data?.items.map((u: any, i: number) => (
                    <tr
                      key={u.id}
                      className={`border-t border-slate-200 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.id}</div>
                      </td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 tabular-nums">{u.phoneNumber}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-indigo-100">
                          {RoleName(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            (u.status ?? "").toUpperCase() === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : "bg-rose-50 text-rose-700 ring-rose-100"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{u.isDefaultPassword ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{prettyDate(u.lastLogin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-slate-600">
              <span>
                Page <strong>{data?.page}</strong> of <strong>{data?.pages}</strong>
              </span>
              <span className="mx-2 hidden sm:inline">•</span>
              <span>
                Total <strong>{data?.total}</strong> users
              </span>

              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  className="rounded-lg border text-blue-600 border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => changePage((data?.page ?? 1) - 1)}
                  disabled={(data?.page ?? 1) <= 1}
                >
                  ‹ Prev
                </button>
                <button
                  className="rounded-lg border text-blue-600 border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => changePage((data?.page ?? 1) + 1)}
                  disabled={(data?.page ?? 1) >= (data?.pages ?? 1)}
                >
                  Next ›
                </button>
              </div>

              {isFetching && <span className="text-xs text-slate-500">Updating…</span>}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm  text-blue-700 font-semibold">Create New User</h2>
              <button
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* Close modal after success */}
              <CreateUserForm onSuccess={() => setShowCreate(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ shared bits (unchanged) ============ */
function Th({ label }: { label: string }) {
  return <th className="px-4 py-3 text-left font-semibold">{label}</th>;
}
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border text-blue-600 border-slate-300 px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
        placeholder="Search name, email, phone…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
    </div>
  );
}
function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        className="w-full rounded-lg border text-blue-600 border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
function SelectInline({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-slate-600">{label}</span>
      <select
        className="rounded-lg border text-blue-600 border-slate-300 px-3 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <div className="text-[13px] text-slate-800">{value}</div>
    </div>
  );
}
