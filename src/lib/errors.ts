// src/lib/errors.ts
export function getErrorMessage(e: unknown, fallback = "Unexpected error") {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  try {
    return JSON.stringify(e);
  } catch {
    return fallback;
  }
}
