"use client";

import { useMemo, useRef, useEffect } from "react";
import { Bell, Check, Trash2, AlertCircle } from "lucide-react";
import {
  useNotificationsInfinite,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useArchive,
  type Page,                   // ⬅️ import Page type from the hook
} from "@/hooks/useNotifications";
import type { NotificationDto } from '@/lib/notifications';

type Props = { claimId?: string };

export default function NotificationsTab({ claimId }: Props) {
  const pageSize = 10;
  const unreadOnly = false;

  const { data: unreadGlobal, isLoading: loadingCount } = useUnreadCount();
  const unread = unreadGlobal?.count ?? 0;

  const {
    data,
    status,
    isLoading,                 // ⬅️ use this instead of status === "loading"
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useNotificationsInfinite({ unreadOnly, claimId, pageSize });

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p: Page) => p.notifications),  // ⬅️ typed
    [data]
  );

  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const archive = useArchive();

  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || !endRef.current) return;
    const el = endRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [hasNextPage, fetchNextPage, data?.pages?.length]);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#0a2045]" aria-hidden />
          <h2 className="text-lg font-semibold">
            Notifications{claimId ? " (This claim)" : ""}
          </h2>
          <span className="text-xs text-gray-500">
            ({loadingCount ? "…" : unread} unread)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Refresh"
          >
            ↻ Refresh
          </button>
          <button
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            title={claimId ? "Mark all as read (this claim)" : "Mark all as read"}
          >
            <Check className="h-4 w-4" /> Mark all
          </button>
        </div>
      </div>

      {status === "error" && (
        <div className="p-4 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {(error as Error)?.message ?? "Failed to load notifications."}
        </div>
      )}

      {isLoading && (
        <ul className="divide-y animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="py-3 flex gap-3 items-start">
              <span className="mt-2 inline-block w-2 h-2 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "success" && (
        <div className="divide-y">
          {items.length === 0 && (
            <div className="p-6 text-sm text-gray-600">
              {claimId ? "No notifications for this claim." : "You’re all caught up."}
            </div>
          )}

          {items.map((n: NotificationDto) => (   // ⬅️ typed `n`
            <div key={n.id} className="py-3 flex gap-3 items-start">
              <span
                className={`mt-2 inline-block w-2 h-2 rounded-full ${
                  n.readAt ? "bg-gray-300" : "bg-blue-600"
                }`}
                aria-label={n.readAt ? "Read" : "Unread"}
                title={n.readAt ? "Read" : "Unread"}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {n.title ?? readableType(n.type)}
                </div>
                {n.body && <div className="text-sm text-gray-700 break-words">{n.body}</div>}
                <div className="text-[11px] text-gray-400 mt-1">
                  {timeago(n.createdAt)}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {!n.readAt && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                      disabled={markRead.isPending}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => archive.mutate(n.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-gray-50 inline-flex items-center gap-1 disabled:opacity-50"
                    disabled={archive.isPending}
                    title="Archive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Archive
                  </button>

                  {(n.data?.claimId || n.claimId) && (
                    <a
                      href={`/claims/${n.data?.claimId ?? n.claimId}`}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={endRef} />
          {hasNextPage && (
            <div className="p-3 text-center text-xs text-gray-500">
              {isFetchingNextPage ? "Loading…" : "Scroll to load more"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




/* ---------------- helpers ---------------- */

function readableType(t: NotificationDto["type"]) {
  switch (t) {
    case "DM_MESSAGE":
      return "New message";
    case "CLAIM_MESSAGE":
      return "New claim message";
    case "CLAIM_STATUS_CHANGED":
      return "Claim status changed";
    case "EVALUATOR_ASSIGNED":
      return "Assigned to claim";
    case "DOCUMENT_ADDED":
      return "Document added";
    case "SYSTEM":
      return "System";
    default:
      return "Notification";
  }
}

function timeago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
