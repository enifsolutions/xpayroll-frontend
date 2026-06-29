// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/axios";

export type NotificationType =
  | "new_employee"
  | "payroll_run"
  | "leave_today"
  | "attendance_today"
  | "leave_pending"
  | "birthday"
  | "leave_upcoming";

export type BadgeType = "success" | "warning" | "danger" | "info" | "neutral";

export interface NotificationItem {
  notificationType: NotificationType;
  refId: string;
  title: string;
  subtitle: string;
  badge: BadgeType;
  iconKey: string;
  occurredAt: string;
}

const POLL_INTERVAL = 60_000; // 60 seconds

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnread] = useState(0);
  const lastSeenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<NotificationItem[]>("notifications");
      setItems(res.data);

      // Compute unread: items newer than last time the dropdown was opened
      if (lastSeenRef.current) {
        const newCount = res.data.filter(
          (n) => new Date(n.occurredAt) > new Date(lastSeenRef.current!),
        ).length;
        setUnread(newCount);
      } else {
        // First load — treat all as unread so badge is meaningful
        setUnread(res.data.length);
      }
    } catch {
      // silently ignore — header bell should not crash the app
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch]);

  const markRead = useCallback(() => {
    lastSeenRef.current = new Date().toISOString();
    setUnread(0);
  }, []);

  // Group items by notification type
  const grouped = items.reduce<Record<string, NotificationItem[]>>(
    (acc, item) => {
      if (!acc[item.notificationType]) acc[item.notificationType] = [];
      acc[item.notificationType].push(item);
      return acc;
    },
    {},
  );

  return { items, grouped, loading, unreadCount, markRead, refresh: fetch };
}
