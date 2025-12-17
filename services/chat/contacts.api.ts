// src/services/chat/contacts.api.ts
import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import { authHeader } from "@/lib/authHeader";

export type Peer = { id: string; name: string; email: string; role: string };

export async function listDmContacts(params?: { search?: string; limit?: number }) {
  const res = await axios.get<Peer[]>(`${API_BASE_URL}/chat/contacts`, {
    params,
    headers: authHeader(),   // <-- send Bearer token
    withCredentials: false,  // not needed unless you’re using cookies
  });
  return res.data;
}
