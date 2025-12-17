// src/lib/notifications.ts

export type NotificationType =
  | "DM_MESSAGE"
  | "CLAIM_MESSAGE"
  | "CLAIM_STATUS_CHANGED"
  | "EVALUATOR_ASSIGNED"
  | "DOCUMENT_ADDED"
  | "SYSTEM";

export type ActorRef = { id: string; name: string | null; email: string | null };
export type ClaimRef = { claimId: string; ClaimTitle: string | null };
export type MessageRef = { messageId: string; content: string | null };
export type PersonRef = { id: string; name: string | null; email: string | null };

export type NotificationDto = {
  id: string;
  userId: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  data?: any;
  actor?: ActorRef | null;
  claim?: ClaimRef | null;
  user?: PersonRef | null;
  message?: MessageRef | null;
  seenAt?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type PagedNotifications = {
  notifications: NotificationDto[];
  pagination: Pagination;
};

// --- Nice-to-have helpers ---
export const readableType = (t: NotificationType): string => {
  switch (t) {
    case "DM_MESSAGE": return "New message";
    case "CLAIM_MESSAGE": return "New claim message";
    case "CLAIM_STATUS_CHANGED": return "Claim status changed";
    case "EVALUATOR_ASSIGNED": return "Assigned to claim";
    case "DOCUMENT_ADDED": return "Document added";
    default: return "Notification";
  }
};

export const isUnread = (n: Pick<NotificationDto, "readAt">) => !n.readAt;

export const timeago = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

