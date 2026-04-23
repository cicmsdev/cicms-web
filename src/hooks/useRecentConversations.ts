// src/hooks/useRecentConversations.ts
"use client";
import { useQuery } from "@tanstack/react-query";

export type RecentItem = {
  conversationKey: string;
  type: 'claim' | 'dm';
  latest: {
    messageId: string;
    content: string;
    createdDate: string;
    sender: { id: string; name: string | null; email: string | null };
  } | null;
  unread: number;
  label: string;
  meta?: { claimId?: string; otherUserId?: string };
};

export function useRecentConversations(limit = 20) {
  return useQuery<RecentItem[]>({
    queryKey: ['recentConversations', { limit }],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/recent?limit=${limit}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Recent failed: ${res.status}`);
      const json = await res.json();
      return json.data as RecentItem[];
    },
    staleTime: 30_000,
  });
}
