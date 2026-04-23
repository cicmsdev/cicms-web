// src/hooks/useAdminNotifications.ts
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import type { PagedNotifications } from '@/lib/notifications';
import { adminListNotifications, type AdminListParams } from '../../services/notifications/notifications.admin.api';

export function useAdminNotificationsPaged(opts: {
  page: number;
  pageSize?: number;
  filters?: Omit<AdminListParams, 'page' | 'limit'>;
}) {
  const { token, isLoading } = useAuth();
  const { page, pageSize = 20, filters = {} } = opts;

  return useQuery<PagedNotifications>({
    enabled: !!token && !isLoading,
    queryKey: ['notifications', 'admin', 'paged', page, pageSize, JSON.stringify(filters), !!token],
    queryFn: () => adminListNotifications({ page, limit: pageSize, ...filters }, token!),
    placeholderData: (prev) => prev as PagedNotifications | undefined,
    staleTime: 10_000,
  });
}
