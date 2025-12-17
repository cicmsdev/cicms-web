import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

type Counts = Record<string, number>;

type Options = {
  intervalMs?: number;
  enabled?: boolean;
  baseUrl?: string;
  unreadPath?: string;
  markReadPath?: string;
  token?: string | null;          
};

export function useUnreadCounts(keys: string[], opts: Options = {}) {
  const {
    intervalMs = 15_000,
    enabled = true,
    baseUrl = API_BASE_URL,
    unreadPath = "/chat/unread",
    markReadPath = "/chat/mark-read",
    token = null,                 
  } = opts;

  // stable, deduped list so effects don't thrash
  const stableKeys = useMemo(
    () => Array.from(new Set(keys)).sort(),
    [keys.join("|")]              // simpler + stable
  );

  const [counts, setCounts] = useState<Counts>({});

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  async function fetchAll(signal?: AbortSignal) {
    if (!enabled || !stableKeys.length) return;
    const results = await Promise.allSettled(
      stableKeys.map(async (k) => {
        const res = await fetch(
          `${baseUrl}${unreadPath}?key=${encodeURIComponent(k)}`,
          {
            signal,
            credentials: "include",
            headers: authHeaders, 
          }
        );
        if (!res.ok) throw new Error("unread failed");
        const data = await res.json();
        return [k, Number(data?.count ?? 0)] as const;
      })
    );
    const next: Counts = {};
    for (const r of results) {
      if (r.status === "fulfilled") {
        const [k, v] = r.value;
        next[k] = v;
      }
    }
    setCounts((prev) => ({ ...prev, ...next }));
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAll(ctrl.signal);
    if (!enabled) return () => ctrl.abort();
    const id = window.setInterval(() => fetchAll(ctrl.signal), intervalMs);
    return () => {
      ctrl.abort();
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKeys.join("|"), intervalMs, enabled, baseUrl, unreadPath, token]); // <-- include token

  async function markRead(key: string) {
    try {
      await fetch(`${baseUrl}${markReadPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders ?? {}), // <-- send bearer
        },
        credentials: "include",
        body: JSON.stringify({ key }),
      });
    } catch {
      // ignore network errors; we still clear locally
    } finally {
      setCounts((prev) => ({ ...prev, [key]: 0 }));
    }
  }

  const get = (key: string) => counts[key] ?? 0;

  return { counts, get, refresh: () => fetchAll(), markRead };
}
