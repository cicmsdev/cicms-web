// hooks/http.ts
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

// No /api prefix anymore
export const apiUrl = (path: string) => `${API}${path}`;
