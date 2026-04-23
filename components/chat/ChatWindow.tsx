// src/components/chat/ChatWindow.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Send, Search, X } from "lucide-react";

type Sender = { id: string; name: string; email: string };
type Msg = { messageId: string; content: string; createdDate: string; sender: Sender };

type Props = {
  title: string;
  myId: string;
  connected: boolean;
  error?: string | null;
  messages: Msg[];
  typingUsers: Record<string, boolean>;
  onSend: (text: string) => void;
  onInputChange?: (text: string) => void; // used to emit typing
  disabled?: boolean;

  heightClassName?: string; // e.g. "h-[70vh]" | "h-full" | "h-[600px]"
  /** Show the message search bar in the header. Defaults to true. */
  enableMessageSearch?: boolean;
};

const initials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
};

function dayLabel(date: Date) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ChatWindow({
  title,
  myId,
  connected,
  error,
  messages,
  typingUsers,
  onSend,
  onInputChange,
  disabled,
  heightClassName = "h-[70vh]",
  enableMessageSearch = true,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const firstRenderRef = useRef(true);
  const prevLenRef = useRef(0);

  // --- NEW: message search state ---
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search with "/" like Slack/Discord
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isTypingInInput =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            (target as any).isContentEditable);
        if (!isTypingInInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Smooth autoscroll after initial mount; instant on first render
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    // if searching, don't autoscroll (user is reviewing older matches)
    if (search.trim().length) return;

    const behavior = firstRenderRef.current ? "auto" : "smooth";
    firstRenderRef.current = false;

    // only scroll if new messages were appended or we are near the bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (messages.length > prevLenRef.current || nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
    prevLenRef.current = messages.length;
  }, [messages, search]);

  // Keep bottom-on-resize (useful when container height changes)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // don't yank scroll while user is searching
      if (!search.trim().length) {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [search]);

  const typingLine = useMemo(() => {
    const ids = Object.keys(typingUsers || {}).filter((id) => typingUsers[id]);
    if (!ids.length) return "";
    return ids.length === 1 ? "Someone is typing…" : "Several people are typing…";
  }, [typingUsers]);

  //  derive filtered list based on search ---
  const normalizedQuery = search.trim().toLowerCase();
  const visibleMessages = useMemo(() => {
    if (!normalizedQuery) return messages;
    return messages.filter((m) => {
      const hay = `${m.content} ${m.sender.name} ${m.sender.email}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [messages, normalizedQuery]);

  // --- simple highlighter for matches ---
  const highlight = (text: string) => {
    if (!normalizedQuery) return <>{text}</>;
    const q = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${q})`, "ig");
    const parts = text.split(re);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === normalizedQuery ? (
            <mark key={i} className="rounded px-0.5 bg-yellow-200">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  const groupedByDay = useMemo(() => {
    const groups: { key: string; label: string; items: Msg[] }[] = [];
    let currentKey = "";
    for (const m of visibleMessages) {
      const d = new Date(m.createdDate);
      const k = d.toDateString();
      if (k !== currentKey) {
        currentKey = k;
        groups.push({ key: k, label: dayLabel(d), items: [m] });
      } else {
        groups[groups.length - 1].items.push(m);
      }
    }
    return groups;
  }, [visibleMessages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  };

  const matchesCount = normalizedQuery ? visibleMessages.length : 0;

  return (
    <section
      className={[
        "bg-white rounded-2xl shadow-sm border border-slate-200",
        "flex flex-col overflow-hidden",
        "min-h-0",
        heightClassName,
      ].join(" ")}
    >
      {/* header (fixed) */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <div className="text-sm font-semibold text-slate-900 truncate">{title}</div>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {connected ? "Connected" : "Connecting…"}
            {error ? " · Error" : ""}
            {normalizedQuery && (
              <span className="ml-2 text-slate-600">
                · {matchesCount} match{matchesCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>

        {/* NEW: message search */}
        {enableMessageSearch && (
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-900" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in conversation…"
              className="w-full pl-9 pr-9 py-2 text-sm text-slate-700 rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5a6bff]/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-slate-900" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-rose-50 text-rose-700 text-sm border-b border-rose-200 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* messages (scrollable) */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto min-h-0 p-8 space-y-6 bg-white overscroll-contain [scrollbar-gutter:stable]"
      >
        {groupedByDay.length ? (
          groupedByDay.map((g) => (
            <div key={g.key} className="space-y-5">
              {/* day chip */}
              <div className="sticky top-2 z-10 flex justify-center">
                <span className="px-3 py-1 text-[11px] rounded-full bg-slate-50 border border-slate-200 shadow-sm text-slate-600">
                  {g.label}
                </span>
              </div>

              {g.items.map((m) => {
                const mine = m.sender.id === myId;
                return (
                  <div key={m.messageId} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {/* avatar for incoming */}
                    {!mine && (
                      <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-bold select-none">
                        {initials(m.sender.name)}
                      </div>
                    )}

                    {/* bubble */}
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-[20px] text-sm shadow-sm ${
                        mine ? "bg-[#5a6bff] text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words leading-6">
                        {highlight(m.content)}
                      </div>
                    </div>

                    {/* avatar placeholder for mine */}
                    {mine && (
                      <div className="h-9 w-9 rounded-full bg-[#5a6bff]/10 text-[#5a6bff] flex items-center justify-center text-[11px] font-bold select-none">
                        {initials("Me")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">
            {normalizedQuery ? "No messages match your search." : "No messages yet."}
          </div>
        )}
      </div>

      {/* typing line (fixed) */}
      {typingLine && <div className="px-6 pb-2 text-xs text-slate-500 shrink-0">{typingLine}</div>}

      {/* composer (fixed) */}
      <form onSubmit={submit} className="p-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
            <input
              className="flex-1 text-sm outline-none placeholder:text-slate-700 text-gray-900"
              placeholder="write your message here"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onInputChange?.(e.target.value);
              }}
              disabled={disabled}
            />
          </div>

          <button
            type="submit"
            aria-label="Send message"
            disabled={disabled || !text.trim().length}
            className={`inline-flex items-center justify-center h-11 w-11 rounded-full text-white text-sm transition shadow ${
              disabled || !text.trim().length ? "bg-slate-300 cursor-not-allowed" : "bg-[#5a6bff] hover:opacity-90"
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </section>
  );
}
 