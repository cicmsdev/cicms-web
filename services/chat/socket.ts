// src/services/chat/socket.ts
"use client";
import { io, Socket } from "socket.io-client";

export type ChatSocket = Socket;

type CreateOpts = {
  getToken: () => string | null;   // read from AuthContext/localStorage
  url?: string;                    // optional: override base URL if needed
};

export function createChatSocket({ getToken, url }: CreateOpts): ChatSocket {
  const token = getToken();
  if (!token) throw new Error("Missing JWT token for chat");

  const socket = io(url ?? "http://localhost:5000/chat", { // 👈 default to Nest
    auth: { token },
    // remove transports override to allow polling → websocket upgrade (more robust in dev):
    // transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    withCredentials: true,
  });

  socket.on("connect_error", (err: any) => {
    console.error("chat connect_error:", err?.message || err);
  });

  return socket;
}

