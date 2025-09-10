"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, FileText, X, Bell } from "lucide-react";
import type { UiClaim, UiStatus } from "@/lib/uiClaims";
import { UI_STATUSES } from "@/lib/uiClaims";

type Props = {
  claims: UiClaim[];
  /** overall total (unfiltered); falls back to claims.length if not provided */
  total?: number;
  onSelectClaim: (claim: UiClaim) => void;
};

const iconFor = (s: UiStatus) =>
  s === "Approved" || s === "Resolved" ? (
    <CheckCircle />
  ) : s === "In Review" || s === "In Court" ? (
    <AlertCircle />
  ) : s === "Submitted" ? (
    <FileText />
  ) : (
    <X />
  );

const colorFor = (s: UiStatus) =>
  s === "Approved"
    ? "bg-green-100 text-green-600"
    : s === "Resolved"
    ? "bg-emerald-100 text-emerald-600"
    : s === "In Review"
    ? "bg-yellow-100 text-yellow-600"
    : s === "In Court"
    ? "bg-purple-100 text-purple-600"
    : s === "Submitted"
    ? "bg-blue-100 text-blue-600"
    : "bg-red-100 text-red-600";

export default function Overview({ claims, total, onSelectClaim }: Props) {
  const statusCounts = UI_STATUSES.map((status) => ({
    label: status,
    count: claims.filter((c) => c.status === status).length,
  }));

  const totalCount = total ?? claims.length;

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {/* Total Claims (overall) */}
        <motion.div
          key="total"
          whileHover={{ scale: 1.03 }}
          className="rounded-2xl shadow p-6 flex items-center space-x-3 bg-blue-900 text-white"
          title="Overall total claims for your account"
        >
          <div><FileText className="opacity-90" /></div>
          <div>
            <p className="text-sm opacity-90">Total Claims</p>
            <h3 className="text-2xl font-bold">{totalCount}</h3>
          </div>
        </motion.div>

        {/* Status cards (respect current filters since they use `claims`) */}
        {statusCounts.map((card) => (
          <motion.div
            key={card.label}
            whileHover={{ scale: 1.03 }}
            className={`rounded-2xl shadow p-6 flex items-center space-x-3 ${colorFor(card.label as UiStatus)}`}
            title={`${card.label} (filtered)`}
          >
            <div>{iconFor(card.label as UiStatus)}</div>
            <div>
              <p className="text-sm">{card.label}</p>
              <h3 className="text-2xl font-bold">{card.count}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Latest Claims */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Latest Claims</h2>
        <div className="divide-y">
          {claims
            .slice()
            .sort(
              (a, b) =>
                new Date(b.incidentDate).getTime() -
                new Date(a.incidentDate).getTime()
            )
            .slice(0, 3)
            .map((claim) => (
              <div
                key={claim.id}
                className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-lg px-2"
                onClick={() => onSelectClaim(claim)}
              >
                <div>
                  <p className="font-medium text-gray-800">{claim.projectName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(claim.incidentDate).toLocaleDateString()} • {claim.status}
                  </p>
                </div>
                <span className="text-xs text-gray-400">ID: {claim.id}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Latest Notifications (placeholder) */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Latest Notifications</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Claim C-1012 was approved yesterday.
          </li>
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Claim C-1015 is under review.
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            New document uploaded for Claim C-1017.
          </li>
        </ul>
      </div>
    </div>
  );
}
