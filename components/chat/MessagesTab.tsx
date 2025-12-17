// src/components/chat/MessagesTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { UiClaim } from "@/lib/uiClaims";
import ChatWindow from "./ChatWindow";
import { useClaimChat, useDmChat } from "@/hooks/useClaimChat";
import { Search } from "lucide-react";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useAuth } from "../../context/AuthContext";

// ------------------------- types & helpers -------------------------
type Peer = {
  id: string;
  name: string;
  email: string;
  role?: string;
  online?: boolean;
};

type Props = {
  claims: UiClaim[];
  dmPeers: Peer[];
  /** Toggle the small search inside the left panel. Defaults to false (hidden). */
  showSideSearch?: boolean;

  /** Called whenever total unread message count changes */
  onUnreadChange?: (count: number) => void;
    
};

const prettyRole = (r?: string) =>
  (r ?? "User")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const initials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
};

// Conversation key helpers
const keyForClaim = (c: UiClaim) => `claim:${c.id}`;
const dmKey = (a: string, b: string) => `dm:${[a, b].sort().join(":")}`;

export default function MessagesTab({
  claims = [],
  dmPeers = [],
  showSideSearch = false,
  onUnreadChange,
}: Props) {
  type Mode = "claim" | "dm";

  const { token, user } = useAuth();
  const myId = user?.sub ?? "";

  // Choose an initial tab once; don't auto-flip later
  const [mode, setMode] = useState<Mode>(claims.length ? "claim" : "dm");

  // selections
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(
    claims[0]?.id ?? null
  );
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(
    dmPeers[0]?.id ?? null
  );

  // local search (client-side filter)
  const [query, setQuery] = useState("");

  // keep selections in sync when lists change (async load)
  useEffect(() => {
    if (!claims.length) {
      setSelectedClaimId(null);
      return;
    }
    if (!selectedClaimId || !claims.some((c) => c.id === selectedClaimId)) {
      setSelectedClaimId(claims[0].id);
    }
  }, [claims, selectedClaimId]);

  useEffect(() => {
    if (!dmPeers.length) {
      setSelectedPeerId(null);
      return;
    }
    if (!selectedPeerId || !dmPeers.some((p) => p.id === selectedPeerId)) {
      setSelectedPeerId(dmPeers[0].id);
    }
  }, [dmPeers, selectedPeerId]);

  // hooks (pass undefined to idle when nothing selected)
  const claimChat = useClaimChat(selectedClaimId ?? undefined);
  const dmChat = useDmChat(selectedPeerId ?? undefined);
  const active = mode === "claim" ? claimChat : dmChat;

  const title = useMemo(() => {
    if (mode === "claim") {
      return (
        claims.find((c) => c.id === selectedClaimId)?.projectName ?? "Claim"
      );
    }
    const p = dmPeers.find((p) => p.id === selectedPeerId);
    return p ? `${p.name} · ${prettyRole(p.role)}` : "Direct Message";
  }, [mode, claims, dmPeers, selectedClaimId, selectedPeerId]);

  const formatDate = (d: string | Date) =>
    new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(d));

  const effectiveQuery = showSideSearch ? query.trim().toLowerCase() : "";

  const filteredClaims = useMemo(() => {
    if (!effectiveQuery) return claims;
    return claims.filter(
      (c) =>
        c.projectName?.toLowerCase().includes(effectiveQuery) ||
        c.status?.toLowerCase().includes(effectiveQuery)
    );
  }, [claims, effectiveQuery]);

  const filteredPeers = useMemo(() => {
    if (!effectiveQuery) return dmPeers;
    return dmPeers.filter(
      (p) =>
        p.name?.toLowerCase().includes(effectiveQuery) ||
        p.email?.toLowerCase().includes(effectiveQuery) ||
        prettyRole(p.role).toLowerCase().includes(effectiveQuery)
    );
  }, [dmPeers, effectiveQuery]);

  // ---------- Unread counts ----------
 
  const claimKeys = useMemo(() => claims.map(keyForClaim), [claims]);

const dmKeys = useMemo(() => {
  if (!myId) return [] as string[];
  return dmPeers.map((p) => dmKey(myId, p.id));
}, [dmPeers, myId]);

const allKeys = useMemo(() => [...claimKeys, ...dmKeys], [claimKeys, dmKeys]);

// pass the token so the hook sends Authorization
const { get: unreadFor, markRead } = useUnreadCounts(allKeys, { token });

// NEW: total unread across all message threads (claims + DMs)
const totalUnreadMessages = useMemo(() => {
  let sum = 0;
  for (const k of allKeys) sum += unreadFor(k);
  return sum;
  // If your unreadFor identity is stable, this is fine.
  // If not, you can trigger recalculation via a cheap “tick” such as active.messages?.length, etc.
}, [allKeys, unreadFor]);

// NEW: notify parent when count changes
useEffect(() => {
  if (typeof onUnreadChange === "function") {
    onUnreadChange(totalUnreadMessages);
  }
}, [onUnreadChange, totalUnreadMessages]);

 

  const activeKey = useMemo(() => {
    if (mode === "claim" && selectedClaimId) {
      const c = claims.find((x) => x.id === selectedClaimId);
      return c ? keyForClaim(c) : undefined;
    }
    if (mode === "dm" && selectedPeerId && myId) {
      return dmKey(myId, selectedPeerId);
    }
    return undefined;
  }, [mode, selectedClaimId, selectedPeerId, claims, myId]);

  // Mark read when switching threads
  useEffect(() => {
    if (activeKey) markRead(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Mark read when new messages land in the open thread
  useEffect(() => {
    if (activeKey && active.messages) markRead(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.messages?.length, activeKey]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: side list + sub-tabs */}
      <aside className="col-span-12 md:col-span-4 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Segmented control */}
        <div className="p-3">
          <div className="bg-slate-100 rounded-full p-1 flex items-center gap-1">
            <button
              type="button"
              className={`flex-1 py-2 px-3 text-sm rounded-full transition-all ${
                mode === "claim"
                  ? "bg-[#5a6bff] text-white shadow font-semibold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
              onClick={() => setMode("claim")}
            >
              Claim Chat
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 text-sm rounded-full transition-all ${
                mode === "dm"
                  ? "bg-[#5a6bff] text-white shadow font-semibold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
              onClick={() => setMode("dm")}
            >
              Direct Messages
            </button>
          </div>

          {/* Side search (hidden by default) */}
          {showSideSearch && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5a6bff]/30 bg-slate-50 text-gray-950"
                placeholder={
                  mode === "claim" ? "Search claims…" : "Search contacts…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Lists */}
        <div className="max-h-[72vh] overflow-auto">
          {mode === "claim" ? (
            filteredClaims.length ? (
              filteredClaims.map((c) => {
                const isActive = selectedClaimId === c.id;
                const unread = unreadFor(keyForClaim(c));
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setSelectedClaimId(c.id);
                      markRead(keyForClaim(c)); // clear immediately on click
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition relative ${
                      isActive ? "bg-[#5a6bff] text-white" : "hover:bg-slate-50"
                    }`}
                  >
                    {/* avatar */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? "bg-white/20" : "bg-[#5a6bff]/10 text-[#5a6bff]"
                      }`}
                    >
                      {initials(c.projectName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isActive ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {c.projectName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-white/20 text-white border-white/30"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {c.status}
                        </span>
                        <span
                          className={`${
                            isActive ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          {formatDate(c.incidentDate)}
                        </span>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span
                        className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-green-300 text-black"
                        }`}
                      >
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-sm text-slate-500">No claims found.</div>
            )
          ) : filteredPeers.length ? (
            filteredPeers.map((p) => {
              const isActive = selectedPeerId === p.id;
              const unread =
                myId ? unreadFor(dmKey(myId, p.id)) : 0;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setSelectedPeerId(p.id);
                    if (myId) markRead(dmKey(myId, p.id)); // clear immediately on click
                  }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition relative ${
                    isActive ? "bg-[#5a6bff] text-white" : "hover:bg-slate-50"
                  }`}
                >
                  {/* avatar */}
                  <div className="relative">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? "bg-white/20" : "bg-[#5a6bff]/10 text-[#5a6bff]"
                      }`}
                    >
                      {initials(p.name)}
                    </div>
                    {p.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-semibold truncate ${
                        isActive ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {p.name}
                    </div>
                    <div
                      className={`${
                        isActive ? "text-white/80" : "text-slate-600"
                      } text-xs truncate`}
                    >
                      {prettyRole(p.role)}
                    </div>
                    <div
                      className={`${
                        isActive ? "text-white/70" : "text-slate-500"
                      } text-xs truncate`}
                    >
                      {p.email}
                    </div>
                  </div>

                  {unread > 0 && (
                    <span
                      className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-green-300 text-black"
                      }`}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-6 text-sm text-slate-500">No contacts found.</div>
          )}
        </div>
      </aside>

      {/* Right: chat window (shared) */}
      <div className="col-span-12 md:col-span-8 lg:col-span-9">
        <ChatWindow
          title={title}
          myId={active.myId}
          connected={active.connected}
          error={active.error}
          messages={active.messages}
          typingUsers={active.typingUsers}
          onSend={active.send}
          onInputChange={active.onInputChange}
          disabled={mode === "claim" ? !selectedClaimId : !selectedPeerId}
        />
      </div>
    </div>
  );
}
