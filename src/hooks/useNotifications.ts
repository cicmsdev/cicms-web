

// src/hooks/useNotifications.ts
import { useAuth } from '../../context/AuthContext'; // you already use this elsewhere
import {
  listMine,
  unreadCount as apiUnreadCount,
  markRead as apiMarkRead,
  markOneRead as apiMarkOneRead,
  markAllRead as apiMarkAllRead,
  archiveMany as apiArchiveMany,
  archiveOne as apiArchiveOne,
  unreadByClaim as apiUnreadByClaim,
} from '../../services/notifications/notifications.api';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { PagedNotifications } from '@/lib/notifications';

export type MineFilters = {
  unreadOnly?: boolean;
  includeArchived?: boolean;
  claimId?: string;
  types?: string[];
};

//NEW: simple paged query (keeps previous page data for smoothness)
export function useMyNotificationsPaged(opts: {
  page: number;
  pageSize?: number;
  filters?: MineFilters;
}) {
  const { token, isLoading } = useAuth();
  const { page, pageSize = 3, filters = {} } = opts;

  return useQuery<PagedNotifications>({
    enabled: !!token && !isLoading,
    queryKey: ['notifications', 'mine', 'paged', page, pageSize, filters, !!token],
    queryFn: () =>
      listMine(
        {
          page,
          limit: pageSize,
          unreadOnly: filters.unreadOnly,
          includeArchived: filters.includeArchived,
          claimId: filters.claimId,
          types: filters.types,
        },
        token!,
      ),
    // v5 replacement for keepPreviousData
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}


export function useMyNotificationsInfinite(opts: { pageSize?: number; filters?: {
  unreadOnly?: boolean; includeArchived?: boolean; claimId?: string; types?: string[];
}} = {}) {
  const { token, isLoading } = useAuth();
  const { pageSize = 20, filters = {} } = opts;

  return useInfiniteQuery({
    enabled: !!token && !isLoading,
    queryKey: ['notifications', 'mine', pageSize, filters, !!token],
    queryFn: ({ pageParam = 1 }) =>
      listMine({
        page: pageParam,
        limit: pageSize,
        unreadOnly: filters.unreadOnly,
        includeArchived: filters.includeArchived,
        claimId: filters.claimId,
        types: filters.types,
      }, token!),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, pages } = last.pagination;
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 10_000,
    retry: (count, err: any) => {
      // don't hammer the server if unauthenticated
      return !(String(err?.message || '').includes('401')) && count < 2;
    },
  });
}

export function useUnreadCount() {
  const { token, isLoading } = useAuth();
  return useQuery({
    enabled: !!token && !isLoading,
    queryKey: ['notifications', 'unread-count', !!token],
    queryFn: () => apiUnreadCount(token!),
    staleTime: 10_000,
    retry: (count, err: any) => !(String(err?.message || '').includes('401')) && count < 2,
  });
}

export function useUnreadByClaim(claimId?: string) {
  const { token, isLoading } = useAuth();
  return useQuery({
    enabled: !!token && !!claimId && !isLoading,
    queryKey: ['notifications', 'unread-by-claim', claimId ?? 'none', !!token],
    queryFn: () => apiUnreadByClaim(claimId!, token!),
    staleTime: 10_000,
    retry: (count, err: any) => !(String(err?.message || '').includes('401')) && count < 2,
  });
}

export function useMarkRead() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiMarkRead(ids, token!),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-by-claim'] }),
      ]);
    },
  });
}

export function useMarkOneRead() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiMarkOneRead(id, token!),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-by-claim'] }),
      ]);
    },
  });
}

export function useMarkAllRead() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiMarkAllRead(token!),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-by-claim'] }),
      ]);
    },
  });
}

export function useArchive() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiArchiveMany(ids, token!),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-by-claim'] }),
      ]);
    },
  });
}

export function useArchiveOne() {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiArchiveOne(id, token!),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-by-claim'] }),
      ]);
    },
  });
}
