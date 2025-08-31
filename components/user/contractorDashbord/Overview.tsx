"use client";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, FileText, X, Bell } from "lucide-react";
import { Claim } from "../../../lib/claimTypes";


type Props = {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
};

export default function Overview({ claims, onSelectClaim }: Props) {
  // Status counts
  const statusCounts = ["Submitted", "In Review", "Approved", "Rejected"].map(
    (status) => ({
      label: status,
      count: claims.filter((c) => c.status === status).length,
    })
  );

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statusCounts.map((card) => {
          const icon =
            card.label === "Approved" ? (
              <CheckCircle />
            ) : card.label === "In Review" ? (
              <AlertCircle />
            ) : card.label === "Submitted" ? (
              <FileText />
            ) : (
              <X />
            );

          const color =
            card.label === "Approved"
              ? "bg-green-100 text-green-600"
              : card.label === "In Review"
              ? "bg-yellow-100 text-yellow-600"
              : card.label === "Submitted"
              ? "bg-blue-100 text-blue-600"
              : "bg-red-100 text-red-600";

          return (
            <motion.div
              key={card.label}
              whileHover={{ scale: 1.03 }}
              className={`rounded-2xl shadow p-6 flex items-center space-x-3 ${color}`}
            >
              <div>{icon}</div>
              <div>
                <p className="text-sm">{card.label}</p>
                <h3 className="text-2xl font-bold">{card.count}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Latest Claims */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Latest Claims</h2>
        <div className="divide-y">
          {claims
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
                    {claim.incidentDate} • {claim.status}
                  </p>
                </div>
                <span className="text-xs text-gray-400">ID: {claim.id}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Latest Notifications */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Latest Notifications</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-500" />
            Claim C-1012 was approved yesterday.
          </li>
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Claim C-1015 is under review.
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            New document uploaded for Claim C-1017.
          </li>
        </ul>
      </div>
    </div>
  );
}
