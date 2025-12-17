// src/services/notifications/notifications.admin.api.ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

function withAuth(init: RequestInit = {}, token?: string): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

const toQuery = (params: Record<string, any>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => Array.isArray(v)
      ? `${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`
      : `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export type AdminListParams = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  includeArchived?: boolean;
  userId?: string;
  actorId?: string;
  claimId?: string;
  messageId?: string;
  q?: string;
  dateFrom?: string; // YYYY-MM-DD or ISO
  dateTo?: string;   // YYYY-MM-DD or ISO
  types?: string[];
  sortDir?: 'asc' | 'desc';
};

export async function adminListNotifications(params: AdminListParams = {}, token?: string) {
  const qs = toQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    unreadOnly: params.unreadOnly ? 'true' : undefined,
    includeArchived: params.includeArchived ? 'true' : undefined,
    userId: params.userId,
    actorId: params.actorId,
    claimId: params.claimId,
    messageId: params.messageId,
    q: params.q,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    types: params.types?.length ? params.types : undefined,
    sortDir: params.sortDir ?? 'desc',
  });

  const res = await fetch(`${API}/api/notifications/admin?${qs}`, withAuth({}, token));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`adminListNotifications failed: ${res.status} ${text}`);
  }
  return (await res.json()) as import('@/lib/notifications').PagedNotifications;
}
