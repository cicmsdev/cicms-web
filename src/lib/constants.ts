// src/lib/constants.ts
// No env. Hardcode dev API base.
export const    API_BASE_URL = "http://localhost:5000/api";

// HTTP base for chat REST
export const CHAT_NS = `${API_BASE_URL}/chat`;

// Socket namespace (same as REST base)
export const CHAT_SOCKET_NS = CHAT_NS;
