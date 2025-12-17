
// src/services/notifications/notifications.api.ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

function withAuth(init: RequestInit = {}, token?: string): RequestInit {
  return {
    ...init,
    credentials: 'include', // keep if you also use httpOnly cookies elsewhere
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

type ListMineParams = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  includeArchived?: boolean;
  claimId?: string;
  types?: string[];
};

const toQuery = (params: Record<string, any>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => Array.isArray(v)
      ? `${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`
      : `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

export async function listMine(params: ListMineParams = {}, token?: string) {
  const qs = toQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    unreadOnly: params.unreadOnly ? 'true' : undefined,
    includeArchived: params.includeArchived ? 'true' : undefined,
    claimId: params.claimId,
    types: params.types?.length ? params.types : undefined,
  });
  const res = await fetch(`${API}/notifications/me?${qs}`, withAuth({}, token));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`listMine failed: ${res.status} ${text}`);
  }
  return (await res.json()) as import('@/lib/notifications').PagedNotifications;
}

export async function unreadCount(token?: string) {
  const res = await fetch(`${API}/notifications/unread-count`, withAuth({}, token));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`unreadCount failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { count: number };
}

export async function markRead(ids: string[], token?: string) {
  const res = await fetch(
    `${API}/notifications/mark-read`,
    withAuth(
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
      token,
    ),
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`markRead failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { updated: string[] };
}

export async function markOneRead(id: string, token?: string) {
  const res = await fetch(
    `${API}/notifications/${id}/mark-read`,
    withAuth({ method: 'PATCH' }, token),
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`markOneRead failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { updated: string[] };
}

export async function markAllRead(token?: string) {
  const res = await fetch(
    `${API}/notifications/mark-all-read`,
    withAuth({ method: 'PATCH' }, token),
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`markAllRead failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { updated: number };
}

export async function archiveMany(ids: string[], token?: string) {
  const res = await fetch(
    `${API}/notifications/archive`,
    withAuth(
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
      token,
    ),
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`archiveMany failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { updated: string[] };
}

export async function archiveOne(id: string, token?: string) {
  const res = await fetch(
    `${API}/notifications/${id}/archive`,
    withAuth({ method: 'PATCH' }, token),
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`archiveOne failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { updated: string[] };
}

export async function unreadByClaim(claimId: string, token?: string) {
  const qs = toQuery({ page: 1, limit: 1, unreadOnly: true, claimId });
  const res = await fetch(`${API}/notifications/me?${qs}`, withAuth({}, token));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`unreadByClaim failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as import('@/lib/notifications').PagedNotifications;
  return data.pagination.total;
}
