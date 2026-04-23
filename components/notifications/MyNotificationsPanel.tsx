// src/components/notifications/MyNotificationsPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useMyNotificationsPaged,
  useMarkOneRead,
  useMarkAllRead,
  useArchiveOne,
  useUnreadCount,
} from '@/hooks/useNotifications';
import type { NotificationDto } from '@/lib/notifications';
import { Loader2, Check, Archive, RefreshCw } from 'lucide-react';

const prettyTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
};

// Strong, accessible chip colors
const TYPE_STYLES: Record<string, string> = {
  CLAIM_STATUS_CHANGED: 'bg-[#0a2045] text-white',
  EVALUATOR_ASSIGNED: 'bg-emerald-600 text-white',
};
const DEFAULT_TYPE_STYLE = 'bg-gray-800 text-white';

// Card highlight for unread
const liClass = (n: NotificationDto) =>
  `p-3 flex items-start gap-3 ${n.readAt ? 'bg-white' : 'bg-[#f5f8ff] ring-2 ring-[#0a2045]/30'}`;

export default function MyNotificationsPanel() {
  // filters
  const [filters, setFilters] = useState({
    unreadOnly: false,
    includeArchived: false,
    claimId: undefined as string | undefined,
    types: [] as string[],
  });

  // pagination (page size fixed at 3)
  const [page, setPage] = useState(1);
  const pageSize = 3;

  // reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [JSON.stringify(filters)]);

  const { data, status, error, isFetching } = useMyNotificationsPaged({
    page,
    pageSize,
    filters,
  });

  const items: NotificationDto[] = useMemo(() => data?.notifications ?? [], [data]);
  const totalPages = data?.pagination.pages ?? 1;

  const unreadCount = useUnreadCount();

  // mutations
  const markOne = useMarkOneRead();
  const markAll = useMarkAllRead();
  const archiveOne = useArchiveOne();

  const onMarkOne = (id: string) => {
    if (!markOne.isPending) markOne.mutate(id);
  };
  const onArchiveOne = (id: string) => {
    if (!archiveOne.isPending) archiveOne.mutate(id);
  };
  const onMarkAll = () => {
    if (!markAll.isPending) markAll.mutate();
  };

  // page helpers
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageButtons = (() => {
    // sliding window around current page
    const maxBtns = 7;
    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxBtns - 1);
    start = Math.max(1, Math.min(start, end - maxBtns + 1));

    const btns = [];
    if (start > 1) {
      btns.push(
        <button
          key={1}
          onClick={() => setPage(1)}
          className={`px-2 py-1 rounded-md border ${page === 1 ? 'bg-[#0a2045] text-white border-[#0a2045]' : 'bg-white'}`}
        >
          1
        </button>,
      );
      if (start > 2) btns.push(<span key="el1" className="px-1 text-gray-500">…</span>);
    }
    for (let p = start; p <= end; p++) {
      btns.push(
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`px-2 py-1 rounded-md border ${
            page === p ? 'bg-[#0a2045] text-white border-[#0a2045]' : 'bg-white hover:bg-gray-50'
          }`}
        >
          {p}
        </button>,
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) btns.push(<span key="el2" className="px-1 text-gray-500">…</span>);
      btns.push(
        <button
          key={totalPages}
          onClick={() => setPage(totalPages)}
          className={`px-2 py-1 rounded-md border ${
            page === totalPages ? 'bg-[#0a2045] text-white border-[#0a2045]' : 'bg-white'
          }`}
        >
          {totalPages}
        </button>,
      );
    }
    return btns;
  })();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[#0a2045]">Notifications</h2>
          <p className="text-xs text-gray-600">
            Unread: <span className="font-semibold">{unreadCount.data?.count ?? 0}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAll}
            disabled={markAll.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-[#0a2045] text-white px-3 py-1 text-sm hover:brightness-110 disabled:opacity-60"
            title="Mark all as read"
          >
            {markAll.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
            Mark all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.unreadOnly}
            onChange={(e) => setFilters((f) => ({ ...f, unreadOnly: e.target.checked }))}
          />
          <span className="text-gray-800">Unread only</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(e) => setFilters((f) => ({ ...f, includeArchived: e.target.checked }))}
          />
          <span className="text-gray-800">Include archived</span>
        </label>

        <div className="inline-flex items-center gap-2">
          <span className="text-gray-800">Types:</span>
          {['CLAIM_STATUS_CHANGED', 'EVALUATOR_ASSIGNED'].map((t) => {
            const on = filters.types.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    types: on ? f.types.filter((x) => x !== t) : [...f.types, t],
                  }))
                }
                className={`rounded-md px-2 py-1 border text-sm ${
                  on
                    ? 'bg-[#0a2045] text-white border-[#0a2045]'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t === 'CLAIM_STATUS_CHANGED' ? 'Status' : 'Assignment'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {(status === 'pending' || isFetching) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {status === 'error' && (
        <div className="text-sm text-red-600">
          {(error as Error)?.message ?? 'Failed to load notifications'}
        </div>
      )}

      <ul className="divide-y rounded-lg border bg-white shadow-sm">
        {items.map((n) => (
          <li key={n.id} className={liClass(n)}>
            {/* Chip */}
            <div
              className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                TYPE_STYLES[n.type] ?? DEFAULT_TYPE_STYLE
              }`}
            >
              {n.type === 'CLAIM_STATUS_CHANGED' ? 'Status' : n.type === 'EVALUATOR_ASSIGNED' ? 'Assignment' : n.type}
            </div>

            {/* Body */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{n.title ?? '(no title)'}</div>
                <div className="text-xs text-gray-600">{prettyTime(n.createdAt)}</div>
              </div>

              {n.body ? <p className="text-[13px] text-gray-800 mt-1">{n.body}</p> : null}

              <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-3">
                {n.claim?.claimId ? (
                  <span>
                    <span className="font-medium text-gray-800">Claim:</span>{' '}
                    {n.claim.ClaimTitle ?? n.claim.claimId}
                  </span>
                ) : null}
                {n.message?.messageId ? (
                  <span>
                    <span className="font-medium text-gray-800">Msg:</span> {n.message.messageId}
                  </span>
                ) : null}
                {n.actor?.name ? (
                  <span>
                    <span className="font-medium text-gray-800">By:</span> {n.actor.name}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {!n.readAt && (
                  <button
                    onClick={() => onMarkOne(n.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-[#0a2045] text-white px-2 py-1 text-xs hover:brightness-110"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" /> Mark read
                  </button>
                )}
                {!n.archivedAt && (
                  <button
                    onClick={() => onArchiveOne(n.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-800 text-white px-2 py-1 text-xs hover:brightness-110"
                    title="Archive"
                  >
                    <Archive className="h-3 w-3" /> Archive
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}

        {items.length === 0 && status === 'success' && (
          <li className="p-4 text-sm text-gray-600">No notifications.</li>
        )}
      </ul>

      {/* Pagination controls */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-xs text-gray-600">
          Page <span className="font-semibold">{page}</span> of{' '}
          <span className="font-semibold">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => canPrev && setPage(page - 1)}
            disabled={!canPrev}
            className="px-2 py-1 rounded-md border bg-white text-sm text-blue-600 disabled:opacity-50"
          >
            Prev
          </button>

          <div className="flex items-center gap-1">{pageButtons}</div>

          <button
            onClick={() => canNext && setPage(page + 1)}
            disabled={!canNext}
            className="px-2 py-1 rounded-md border bg-white text-sm  text-blue-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
