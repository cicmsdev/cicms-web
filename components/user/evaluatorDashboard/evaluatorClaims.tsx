"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { UiClaim } from "@/lib/uiClaims";

type Props = {
  claims: UiClaim[];
  onSelectClaim: (claim: UiClaim) => void;
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

export default function Claims({ claims, onSelectClaim }: Props) {
  const [sortKey, setSortKey] = useState<"date" | "status" | "project" | "type">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const itemsPerPage = 6;

  // Build list of available claim types from data (stable, deduped)
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of claims) {
      const k = c.claimType ?? null;                  // <-- use UiClaim.claimType
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
            const raw = (c.claimType ?? "OTHERS") as string; // <-- use UiClaim.claimType
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
      if (sortKey === "project") return a.projectName.localeCompare(b.projectName);
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

  return (
    <>
      {/* Sorting + Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedClaims.map((claim) => {
              const rawType = (claim.claimType ?? "OTHERS") as string;          // <-- use UiClaim.claimType
              const type = rawType.toUpperCase();
              const typeLabel = claim.claimTypeLabel ?? humanize(type);          // <-- use UiClaim.claimTypeLabel
              const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.OTHERS;        // <-- safe fallback

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
                  className="bg-white p-4 rounded-xl shadow hover:shadow-md transition cursor-pointer"
                  onClick={() => onSelectClaim(claim)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800">{claim.projectName}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
                      {claim.status}
                    </span>
                  </div>

                  {/* Claim Type pill */}
                  <div className="mb-2">
                    <span
                      className="inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: `${typeColor}1A`, // ~10% tint
                        color: "#0a2045",
                        border: `1px solid ${typeColor}`,
                      }}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: typeColor }}
                      />
                      {typeLabel}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500">Claim ID: {claim.id}</p>
                  <p className="text-sm text-gray-500">Incident: {incident}</p>
                  <p className="text-sm text-gray-500">Documents: {claim.documents}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50 text-blue-500 hover:bg-gray-100"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 border rounded-lg ${
                  currentPage === i + 1 ? "bg-[#0a2045] text-white" : "hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-lg disabled:opacity-50 text-blue-500 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
