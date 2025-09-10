"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { UiClaim } from "@/lib/uiClaims";

type Props = {
  claims: UiClaim[];
  onSelectClaim: (claim: UiClaim) => void;
};

export default function Claims({ claims, onSelectClaim }: Props) {
  const [sortKey, setSortKey] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const sortedClaims = [...claims].sort((a, b) => {
    if (sortKey === "date") {
      return new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime();
    }
    if (sortKey === "status") return a.status.localeCompare(b.status);
    if (sortKey === "project") return a.projectName.localeCompare(b.projectName);
    return 0;
  });

  const totalPages = Math.ceil(sortedClaims.length / itemsPerPage);
  const paginatedClaims = sortedClaims.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      {/* Sorting + Create */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#0a2045]">Claims</h2>
        <div className="flex items-center gap-3">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-[#0a2045]"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
            <option value="project">Sort by Project</option>
          </select>

          <Link
            href="/createClaim"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-[#0a2045] text-white hover:bg-[#142c63] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0a2045]"
            aria-label="Create new claim"
          >
            <Plus size={16} />
            New Claim
          </Link>
        </div>
      </div>

      {/* Claims Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedClaims.map((claim) => (
          <motion.div
            key={claim.id}
            whileHover={{ scale: 1.02 }}
            layout
            className="bg-white p-4 rounded-xl shadow hover:shadow-md transition cursor-pointer"
            onClick={() => onSelectClaim(claim)}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-800">{claim.projectName}</h4>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
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
                    : "bg-red-100 text-red-600"
                }`}
              >
                {claim.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">Claim ID: {claim.id}</p>
            <p className="text-sm text-gray-500">
              Incident: {new Date(claim.incidentDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">Documents: {claim.documents}</p>
          </motion.div>
        ))}
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
  );
}
