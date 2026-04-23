"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, FileText, X, Bell, CreditCard } from "lucide-react";
import type { UiClaim, UiStatus } from "@/lib/uiClaims";
import { UI_STATUSES } from "@/lib/uiClaims";
import type { NotificationDto } from "@/lib/notifications";
import { readableType, timeago } from "@/lib/notifications";

type Props = {
  claims: UiClaim[];
  /** overall total (unfiltered); falls back to claims.length if not provided */
  total?: number;
  onSelectClaim: (claim: UiClaim) => void;

  // latest notifications
  latestNotifications?: NotificationDto[];
  latestNotificationsLoading?: boolean;
  onOpenNotifications?: () => void;
};

const iconFor = (s: UiStatus) =>
  s === "Payed" ? (
    <CreditCard />
  ) : s === "Approved" || s === "Resolved" ? (
    <CheckCircle />
  ) : s === "In Review" || s === "In Court" ? (
    <AlertCircle />
  ) : s === "Submitted" ? (
    <FileText />
  ) : (
    <X />
  );

const colorFor = (s: UiStatus) =>
  s === "Payed"
    ? "bg-green-600 text-green-100"
    : s === "Approved"
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

// pick an icon for a notification type (optional nicety)
const notifIcon = (t: NotificationDto["type"]) => {
  switch (t) {
    case "DM_MESSAGE":
    case "CLAIM_MESSAGE":
      return <Bell className="h-4 w-4" />;
    case "CLAIM_STATUS_CHANGED":
      return <AlertCircle className="h-4 w-4" />;
    case "EVALUATOR_ASSIGNED":
      return <CheckCircle className="h-4 w-4" />;
    case "DOCUMENT_ADDED":
      return <FileText className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export default function Overview({
  claims,
  total,
  onSelectClaim,
  //bring these into scope with sensible defaults
  latestNotifications = [],
  latestNotificationsLoading = false,
  onOpenNotifications = () => { },
}: Props) {
  const statusCounts = UI_STATUSES.map((status) => ({
    label: status,
    count: claims.filter((c) => c.status === status).length,
  }));

  const totalCount = total ?? claims.length;

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
        {/* Total Claims */}
        <motion.div
          key="total"
          whileHover={{ scale: 1.03 }}
          className="rounded-2xl shadow p-6 flex items-center space-x-3 bg-blue-900 text-white"
        >
          <FileText className="opacity-90" />
          <div>
            <p className="text-sm opacity-90">Total Claims</p>
            <h3 className="text-2xl font-bold">{totalCount}</h3>
          </div>
        </motion.div>

        {/* Status cards */}
        {statusCounts.map((card) => (
          <motion.div
            key={card.label}
            whileHover={{ scale: 1.03 }}
            className={`rounded-2xl shadow p-6 flex items-center space-x-3 ${colorFor(
              card.label as UiStatus
            )}`}
          >
            {iconFor(card.label as UiStatus)}
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
                  <p className="font-medium text-gray-800">
                    {claim.projectName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(claim.incidentDate).toLocaleDateString()} •{" "}
                    {claim.status}
                  </p>
                </div>
                <span className="text-xs text-gray-400">ID: {claim.id}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Latest Notifications (placeholder) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Latest Notifications</h2>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="text-sm text-blue-700 hover:underline"
          >
            View all
          </button>
        </div>

        {latestNotificationsLoading ? (
          <div className="text-sm text-gray-500">Loading notifications…</div>
        ) : latestNotifications.length === 0 ? (
          <div className="text-sm text-gray-500">No recent notifications.</div>
        ) : (
          <div className="divide-y">
            {latestNotifications
              .slice() // don't mutate cache
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .slice(0, 3)
              .map((n: NotificationDto) => (
                <div
                  key={n.id}
                  className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-lg px-2"
                  onClick={onOpenNotifications}
                  title={n.title || readableType(n.type)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{notifIcon(n.type)}</div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {n.title || readableType(n.type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {timeago(n.createdAt)}
                        {n.claim?.ClaimTitle ? ` • ${n.claim.ClaimTitle}` : ""}
                      </p>
                      {n.body && (
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional right-side subtle badge */}
                  <span className="text-xs text-gray-400 uppercase">
                    {n.type.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
