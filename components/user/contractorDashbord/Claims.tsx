"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { UiClaim } from "@/lib/uiClaims";
import CreateOrUpdateClaimPage from "./CreateClaim";



type Props = {
  claims: UiClaim[];
  onSelectClaim: (claim: UiClaim) => void;
  onRefresh?: () => void;
};

// --- helpers ---
const humanize = (s?: string | null) =>
  s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";

const TYPE_COLORS: Record<string, string> = {
  MATERIAL_DAMAGE: "#0072B2",
  EQUIPMENT_DAMAGE: "#E69F00",
  WORKSITE_ACCIDENT: "#009E73",
  STRUCTURAL_FAILURE: "#D55E00",
  FIRE: "#CC79A7",
  NATURAL_DISASTER: "#56B4E9",
  ACCIDENT: "#F0E442",
  OTHERS: "#6b7280",
};





export default function Claims({ claims, onSelectClaim, onRefresh }: Props) {
  const [sortKey, setSortKey] = useState<"date" | "status" | "project" | "type">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const itemsPerPage = 6;

  // Build list of available claim types from data (stable, deduped)
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of claims) {
      const k = c.claimType ?? null;
      if (k) set.add(String(k).toUpperCase());
    }
    const arr = Array.from(set).sort();
    return ["ALL", ...arr];
  }, [claims]);

  const sortedClaims = useMemo(() => {
    // filter by type first
    const filtered =
      typeFilter === "ALL"
        ? claims
        : claims.filter((c) => {
            const raw = (c.claimType ?? "OTHERS") as string;
            return raw.toUpperCase() === typeFilter;
          });

    // then sort
    const arr = [...filtered].sort((a, b) => {
      if (sortKey === "date") {
        const da = a.incidentDate ? new Date(a.incidentDate).getTime() : 0;
        const db = b.incidentDate ? new Date(b.incidentDate).getTime() : 0;
        return db - da;
      }
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "project") return (a.projectName ?? "").localeCompare(b.projectName ?? "");
      if (sortKey === "type") {
        const at = String(a.claimType ?? "");
        const bt = String(b.claimType ?? "");
        return at.localeCompare(bt);
      }
      return 0;
    });

    return arr;
  }, [claims, sortKey, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedClaims.length / itemsPerPage));
  const paginatedClaims = useMemo(
    () => sortedClaims.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedClaims, currentPage]
  );

  // After success: close modal and optionally refetch
  const handleCreatedOrUpdated = () => {
    setShowCreate(false);
    onRefresh?.();
  };

  

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-[#0a2045]">Claims</h2>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setTypeFilter(e.target.value);
            }}
            className="border rounded-lg px-3 py-2 text-sm text-[#0a2045]"
            aria-label="Filter by claim type"
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? "All Types" : humanize(opt)}
              </option>
            ))}
          </select>

          <select
            value={sortKey}
            onChange={(e) => {
              setCurrentPage(1);
              setSortKey(e.target.value as any);
            }}
            className="border rounded-lg px-3 py-2 text-sm text-[#0a2045]"
            aria-label="Sort claims"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="project">Sort by Project</option>
            <option value="type">Sort by Type</option>
          </select>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2045] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New claim
          </button>
        </div>
      </div>

      {/* Empty state */}
      {sortedClaims.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500 border rounded-xl bg-white">
          No claims match your filters.
        </div>
      )}

      {/* Claims Cards */}
      {sortedClaims.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedClaims.map((claim) => {
              const rawType = (claim.claimType ?? "OTHERS") as string;
              const type = rawType.toUpperCase();
              const typeLabel = claim.claimTypeLabel ?? humanize(type);
              const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.OTHERS;

              const statusClass =
                claim.status === "Approved"
                  ? "bg-green-100 text-green-600"
                  : claim.status === "In Review"
                  ? "bg-yellow-100 text-yellow-600"
                  : claim.status === "Submitted"
                  ? "bg-blue-100 text-blue-600"
                  : claim.status === "Resolved"
                  ? "bg-emerald-100 text-emerald-600"
                  : claim.status === "In Court"
                  ? "bg-purple-100 text-purple-600"
                  : claim.status === "Payed"
                  ? "bg-green-600 text-green-100"
                  : "bg-red-100 text-red-600";


              const incident = claim.incidentDate
                ? new Date(claim.incidentDate).toLocaleDateString()
                : "—";

              return (
                <motion.div
                  key={claim.id}
                  whileHover={{ scale: 1.02 }}
                  layout
                  className="cursor-pointer rounded-xl bg-white p-4 shadow transition hover:shadow-md"
                  onClick={() => onSelectClaim(claim)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">{claim.projectName ?? "—"}</h4>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusClass}`}>{claim.status}</span>
                  </div>

                  {/* Claim Type pill */}
                  <div className="mb-2">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${typeColor}1A`,
                        color: "#0a2045",
                        border: `1px solid ${typeColor}`,
                      }}
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColor }} />
                      {typeLabel}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500">Claim ID: {claim.id}</p>
                  <p className="text-sm text-gray-500">Incident: {incident}</p>
                  <p className="text-sm text-gray-500">
                    Documents: {typeof claim.documents === "number" ? claim.documents : (claim.documents as any[])?.length ?? 0}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-lg border px-3 py-1 text-blue-500 hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`rounded-lg border px-3 py-1 ${
                  currentPage === i + 1 ? "bg-[#0a2045] text-white" : "hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-lg border px-3 py-1 text-blue-500 hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Create Claim Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-blue-700">Create New Claim</h2>
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
              <CreateOrUpdateClaimPage
                claimId={undefined}
              />
              
            </div>
          </div>
        </div>
      )}
    </>
  );
}
