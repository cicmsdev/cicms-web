export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        ...init,
    });
    if (!res.ok) {
        let info: any = undefined;
        try { info = await res.json(); } catch { }
        throw new Error(info?.message || `Request failed: ${res.status}`);
    }
    return res.json();
}