// hooks/useNotifSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

type Options = {
  token?: string | null;
  onNew?: (payload: any) => void;
  onPong?: (data: any) => void;
};

export function useNotifSocket({ token, onNew, onPong }: Options) {
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    // don't even try without a token
    if (!token) return;

    // close any previous connection before opening a new one (token changed)
    if (sockRef.current?.connected || sockRef.current?.connect) {
      try { sockRef.current.disconnect(); } catch {}
      sockRef.current = null;
    }

    const socket = io(`${API}/ws/notifications`, {
      auth: { token },            // Guard reads this
      withCredentials: true,
      transports: ['websocket'],
      // If you added the query fallback in the guard, you could also do:
      // query: { token },
    });
    sockRef.current = socket;

    socket.on('connect', () => {
      // optional health check
      socket.emit('ping', { t: Date.now() });
    });

    socket.on('pong', (data) => onPong?.(data));
    socket.on('notification:new', (payload) => onNew?.(payload));

    socket.on('connect_error', (err: any) => {
      console.error('WS connect_error:', err?.message ?? err);
    });

    return () => {
      try { socket.close(); } catch {}
      sockRef.current = null;
    };
  }, [token, onNew, onPong]);

  return sockRef;
}
