// src/hooks/useClaimChat.ts
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { createChatSocket, ChatSocket } from "../../services/chat/socket";

export type ChatSender = { id: string; name: string; email: string };
export type ChatMessage = {
  messageId: string;
  content: string;
  createdDate: string;
  sender: ChatSender;
};

function useSocketFromAuth() {
  const { token } = useAuth();
  const sockRef = useRef<ChatSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const s = createChatSocket({ getToken: () => token });
    sockRef.current = s;

    const onConnect = () => { setConnected(true); setError(null); };
    const onConnectError = (e: any) => setError(e?.message || "connection error");

    s.on("connect", onConnect);
    s.on("connect_error", onConnectError);

    return () => {
      s.off("connect", onConnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
      sockRef.current = null;
    };
  }, [token]);

  return { socket: sockRef, connected, error };
}

// ---- CLAIM CHAT -------------------------------------------------------------
export function useClaimChat(claimId?: string) {
  const { user } = useAuth();
  const myId = user?.sub ?? "";
  const { socket, connected, error } = useSocketFromAuth();

  const [conversationKey, setKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({}); // userId -> typing?

  // join on claimId
  useEffect(() => {
    if (!claimId || !socket.current || !connected) return;
    socket.current.emit("joinClaim", { claimId });
  }, [claimId, connected, socket]);

  // core listeners
  useEffect(() => {
    if (!socket.current) return;
    const s = socket.current;

    const onRecent = (p: { conversationKey: string; messages: ChatMessage[] }) => {
      setKey(p.conversationKey);
      setMessages(p.messages || []);
      setTypingUsers({});
    };
    const onNew = (p: { conversationKey: string; message: ChatMessage }) => {
      setKey((k) => k ?? p.conversationKey);
      setMessages((prev) => [...prev, p.message]);
    };
    const onTyping = (p: { conversationKey: string; user: { id: string; name?: string }, isTyping: boolean }) => {
      if (!conversationKey || p.conversationKey !== conversationKey) return;
      if (p.user.id === myId) return; // ignore myself
      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (p.isTyping) copy[p.user.id] = true; else delete copy[p.user.id];
        return copy;
      });
    };

    s.on("recent", onRecent);
    s.on("newMessage", onNew);
    s.on("userTyping", onTyping);
    return () => {
      s.off("recent", onRecent);
      s.off("newMessage", onNew);
      s.off("userTyping", onTyping);
    };
  }, [socket, conversationKey, myId]);

  // send message
  const send = useCallback((text: string) => {
    const s = socket.current;
    if (!s || !claimId) return;
    const content = text.trim();
    if (!content) return;
    s.emit("sendMessage", { claimId, content });
  }, [socket, claimId]);

  // mark read
  const markRead = useCallback(() => {
    const s = socket.current;
    if (!s || !conversationKey) return;
    s.emit("markRead", { conversationKey });
  }, [socket, conversationKey]);

  // typing: debounced begin/end
  const typingTimer = useRef<number | null>(null);
  const notifyTyping = useCallback((isTyping: boolean) => {
    const s = socket.current;
    if (!s || !conversationKey) return;
    s.emit("typing", { conversationKey, isTyping });
  }, [socket, conversationKey]);

  const onInputChange = useCallback((value: string) => {
    if (!conversationKey || !socket.current) return;
    // start typing
    notifyTyping(true);
    // stop after 1.2s idle
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => notifyTyping(false), 1200);
  }, [conversationKey, notifyTyping]);

  return {
    myId,
    connected,
    error,
    conversationKey,
    messages,
    typingUsers,
    send,
    markRead,
    onInputChange,
  };
}

// ---- DM CHAT (same API, different join/send) --------------------------------
export function useDmChat(otherUserId?: string) {
  const { user } = useAuth();
  const myId = user?.sub ?? "";
  const { socket, connected, error } = useSocketFromAuth();

  const [conversationKey, setKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!otherUserId || !socket.current || !connected) return;
    socket.current.emit("joinDm", { otherUserId });
  }, [otherUserId, connected, socket]);

  useEffect(() => {
    if (!socket.current) return;
    const s = socket.current;

    const onRecent = (p: { conversationKey: string; messages: ChatMessage[] }) => {
      setKey(p.conversationKey);
      setMessages(p.messages || []);
      setTypingUsers({});
    };
    const onNew = (p: { conversationKey: string; message: ChatMessage }) => {
      setKey((k) => k ?? p.conversationKey);
      setMessages((prev) => [...prev, p.message]);
    };
    const onTyping = (p: { conversationKey: string; user: { id: string }, isTyping: boolean }) => {
      if (!conversationKey || p.conversationKey !== conversationKey) return;
      if (p.user.id === myId) return;
      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (p.isTyping) copy[p.user.id] = true; else delete copy[p.user.id];
        return copy;
      });
    };

    s.on("recent", onRecent);
    s.on("newMessage", onNew);
    s.on("userTyping", onTyping);
    return () => {
      s.off("recent", onRecent);
      s.off("newMessage", onNew);
      s.off("userTyping", onTyping);
    };
  }, [socket, conversationKey, myId]);

  const send = useCallback((text: string) => {
    const s = socket.current;
    if (!s || !otherUserId) return;
    const content = text.trim();
    if (!content) return;
    s.emit("sendMessage", { otherUserId, content });
  }, [socket, otherUserId]);

  const markRead = useCallback(() => {
    const s = socket.current;
    if (!s || !conversationKey) return;
    s.emit("markRead", { conversationKey });
  }, [socket, conversationKey]);

  const typingTimer = useRef<number | null>(null);
  const notifyTyping = useCallback((isTyping: boolean) => {
    const s = socket.current;
    if (!s || !conversationKey) return;
    s.emit("typing", { conversationKey, isTyping });
  }, [socket, conversationKey]);

  const onInputChange = useCallback((value: string) => {
    if (!conversationKey || !socket.current) return;
    notifyTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => notifyTyping(false), 1200);
  }, [conversationKey, notifyTyping]);

  return {
    myId,
    connected,
    error,
    conversationKey,
    messages,
    typingUsers,
    send,
    markRead,
    onInputChange,
  };
}
