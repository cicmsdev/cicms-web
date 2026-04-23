// src/components/notifications/AdminNotificationsPanel.tsx
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAdminNotificationsPaged } from '@/hooks/useAdminNotifications';
import type { NotificationDto } from '@/lib/notifications';
import { Calendar as CalendarIcon, Loader2, RefreshCw, Search } from 'lucide-react';

const prettyTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

// Brand / palette
const PRIMARY = '#0a2045';

// Notification type styles
const TYPE_STYLES: Record<string, string> = {
  CLAIM_STATUS_CHANGED: `bg-[${PRIMARY}] text-white`,
  EVALUATOR_ASSIGNED: 'bg-emerald-600 text-white',
};
const DEFAULT_TYPE_STYLE = 'bg-gray-800 text-white';




function toYMD(d: Date) {
  return d.toLocaleDateString('en-CA'); // yyyy-mm-dd
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function AdminNotificationsPanel() {
  // filters
  const [q, setQ] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [claimId, setClaimId] = useState<string>('');
  const [actorId, setActorId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');



  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    q,
    types.join(','),
    unreadOnly,
    includeArchived,
    userId,
    claimId,
    actorId,
    dateFrom,
    dateTo,
    sortDir,
  ]);

  const { data, status, error, isFetching, refetch } = useAdminNotificationsPaged({
    page,
    pageSize,
    filters: {
      q: q || undefined,
      types: types.length ? types : undefined,
      unreadOnly,
      includeArchived,
      userId: userId || undefined,
      claimId: claimId || undefined,
      actorId: actorId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortDir,
     
    } as any,
  });

  const items: NotificationDto[] = useMemo(() => data?.notifications ?? [], [data]);
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.pages ?? 1;

  // date presets (optional helpers)
  const setPreset = (preset: 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH') => {
    const now = new Date();
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    if (preset === 'TODAY') {
      const ymd = toYMD(now);
      setDateFrom(ymd);
      setDateTo(ymd);
      return;
    }
    if (preset === 'LAST_7') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setDateFrom(toYMD(from));
      setDateTo(toYMD(now));
      return;
    }
    if (preset === 'LAST_30') {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      setDateFrom(toYMD(from));
      setDateTo(toYMD(now));
      return;
    }
    if (preset === 'THIS_MONTH') {
      setDateFrom(toYMD(startOfMonth(now)));
      setDateTo(toYMD(now));
    }
  };

  const pageButtons: ReactNode[] = (() => {
    const maxBtns = 7;
    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxBtns - 1);
    start = Math.max(1, Math.min(start, end - maxBtns + 1));

    const btns: ReactNode[] = [];
    if (start > 1) {
      btns.push(
        <button
          key={1}
          onClick={() => setPage(1)}
          className={`px-2 py-1 rounded-md border ${
            page === 1 ? `bg-[${PRIMARY}] text-white border-[${PRIMARY}]` : 'bg-white hover:bg-gray-50'
          }`}
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
            page === p ? `bg-[${PRIMARY}] text-white border-[${PRIMARY}]` : 'bg-white hover:bg-gray-50'
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
            page === totalPages ? `bg-[${PRIMARY}] text-white border-[${PRIMARY}]` : 'bg-white hover:bg-gray-50'
          }`}
        >
          {totalPages}
        </button>,
      );
    }
    return btns;
  })();

  // latest admin notifications (3 newest) — unchanged, included if you need it elsewhere
  const { data: latestAdminNotifs, status: latestStatus } = useAdminNotificationsPaged({
    page: 1,
    pageSize: 3,
    filters: { includeArchived: false, unreadOnly: false, sortDir: 'desc' },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold text-[${PRIMARY}]`}>All Notifications (Admin)</h2>
        <button
          onClick={() => refetch()}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-[${PRIMARY}] text-white hover:brightness-110 disabled:opacity-50`}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
        {/* Search */}
        <label
          className={`md:col-span-2 flex items-center gap-2 border rounded-md px-2 py-1 bg-white border-gray-300 focus-within:ring-2 focus-within:ring-[${PRIMARY}]`}
        >
          <Search className="h-4 w-4 text-gray-900" />
          <input
            className="w-full outline-none placeholder:text-blue-900"
            placeholder="Search title/body/claim/user/actor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        {/* IDs */}
        <input
          className={`text-gray-900 border rounded-md px-2 py-1 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
          placeholder="Recipient userId"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          className={`text-gray-900 border rounded-md px-2 py-1 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
          placeholder="ClaimId"
          value={claimId}
          onChange={(e) => setClaimId(e.target.value)}
        />
        <input
          className={`text-gray-900 border rounded-md px-2 py-1 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
          placeholder="ActorId"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
        />

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className={`accent-[${PRIMARY}]`}
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            <span className="text-gray-900">Unread only</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className={`accent-[${PRIMARY}]`}
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            <span className="text-gray-900">Include archived</span>
          </label>
        </div>

        {/* Date range */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-900" />
            <input
              type="date"
              className={`border rounded-md px-2 py-1 bg-gray-900 hover:bg-gray-800 text-white" focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-gray-900">to</span>
            <input
              type="date"
              className={`border rounded-md px-2 py-1 bg-gray-900 hover:bg-gray-800 text-white" focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setPreset('ALL')} className="px-2 py-1 rounded-md border bg-gray-900 hover:bg-gray-800 text-white">
              All time
            </button>
            <button onClick={() => setPreset('TODAY')} className="px-2 py-1 rounded-md border bg-gray-900 hover:bg-gray-800 text-white">
              Today
            </button>
            <button onClick={() => setPreset('LAST_7')} className="px-2 py-1 rounded-md border bg-gray-900 hover:bg-gray-800 text-white">
              Last 7 days
            </button>
            <button onClick={() => setPreset('LAST_30')} className="px-2 py-1 rounded-md border bg-gray-900 hover:bg-gray-800 text-white">
              Last 30 days
            </button>
            <button onClick={() => setPreset('THIS_MONTH')} className="px-2 py-1 rounded-md border bg-gray-900 hover:bg-gray-800 text-white">
              This month
            </button>
          </div>
        </div>

        {/* Notification Types */}
        <div className="flex items-center px-7 gap-2">
          <span className="text-gray-900">Types:</span>
          {['CLAIM_STATUS_CHANGED', 'EVALUATOR_ASSIGNED'].map((t) => {
            const on = types.includes(t);
            return (
              <button
                key={t}
                onClick={() => setTypes((arr) => (on ? arr.filter((x) => x !== t) : [...arr, t]))}
                className={`rounded-md px-2 py-1 border text-xs ${
                  on ? `bg-[${PRIMARY}] text-white border-[${PRIMARY}]` : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t === 'CLAIM_STATUS_CHANGED' ? 'Status' : 'Assignment'}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          className={`text-gray-900 border rounded-md px-2 py-1 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[${PRIMARY}]`}
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as any)}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>

        
      </div>

      {/* Content */}
      {status === 'pending' && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {status === 'error' && (
        <div className="text-sm text-red-600">{(error as Error)?.message ?? 'Failed to load notifications'}</div>
      )}

      <div className="rounded-lg border bg-white overflow-x-auto shadow-sm">
        <table className="min-w-full text-sm">
          <thead className={`text-white bg-[${PRIMARY}]`}>
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Type</th>
              <th className="text-left px-3 py-2 font-semibold">Title / Body</th>
              <th className="text-left px-3 py-2 font-semibold">Recipient</th>
              <th className="text-left px-3 py-2 font-semibold">Claim</th>
              <th className="text-left px-3 py-2 font-semibold">Actor</th>
              <th className="text-left px-3 py-2 font-semibold">Read</th>
              <th className="text-left px-3 py-2 font-semibold">Archived</th>
              <th className="text-left px-3 py-2 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {items.map((n, idx) => (
              <tr key={n.id} className={`border-t ${idx % 2 ? 'bg-gray-50/60' : 'bg-white'} hover:bg-[#f5f8ff]`}>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[n.type] ?? DEFAULT_TYPE_STYLE}`}>
                    {n.type === 'CLAIM_STATUS_CHANGED' ? 'Status' : n.type === 'EVALUATOR_ASSIGNED' ? 'Assignment' : n.type}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-gray-900">{n.title ?? '(no title)'}</div>
                  {n.body ? <div className="text-gray-800 text-[13px] mt-0.5">{n.body}</div> : null}
                </td>
                <td className="px-3 py-2">
                  {n.user ? (
                    <div className="text-gray-900">
                      {n.user.name ?? '—'}
                      <div className="text-xs text-gray-600">{n.user.email ?? n.user.id}</div>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  {n.claim ? (
                    <div className="text-gray-900">
                      <div className="font-medium">{(n as any).claim.ClaimTitle ?? '—'}</div>
                      <div className="text-xs text-gray-600">{n.claim.claimId}</div>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  {n.actor ? (
                    <div className="text-gray-900">
                      <div className="font-medium">{n.actor.name ?? '—'}</div>
                      <div className="text-xs text-gray-600">{n.actor.email ?? n.actor.id}</div>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className={yesNo(!!n.readAt)}> {n.readAt ? 'Yes' : 'No'} </span>
                </td>
                <td className="px-3 py-2">
                  <span className={yesNo(!!n.archivedAt)}> {n.archivedAt ? 'Yes' : 'No'} </span>
                </td>
                <td className="px-3 py-2 text-gray-900">{prettyTime(n.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 && status === 'success' && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-700">No notifications found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-xs text-gray-800">
          Total: <span className="font-semibold">{total}</span> • Page{' '}
          <span className="font-semibold">{data?.pagination.page ?? 1}</span> of{' '}
          <span className="font-semibold">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded-md border text-sm bg-white disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>
          <div className="flex items-center gap-1">{pageButtons}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded-md border text-sm bg-white disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Small badge for Yes/No
function yesNo(yes?: boolean) {
  return yes
    ? 'inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-600 text-white'
    : 'inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-300 text-gray-800';
}
