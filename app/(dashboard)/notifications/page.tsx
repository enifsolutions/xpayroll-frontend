"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  UserPlus,
  FileText,
  CalendarOff,
  ClipboardList,
  Clock,
  Cake,
  CalendarDays,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

// ── Types ─────────────────────────────────────────────────────────────────────
type BadgeType = "success" | "warning" | "danger" | "info" | "neutral";
type NotificationType =
  | "new_employee"
  | "payroll_run"
  | "leave_today"
  | "attendance_today"
  | "leave_pending"
  | "birthday"
  | "leave_upcoming";

interface NotificationItem {
  notificationType: NotificationType;
  refId: string;
  title: string;
  subtitle: string;
  badge: BadgeType;
  iconKey: string;
  occurredAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  UserPlus,
  FileText,
  CalendarOff,
  ClipboardList,
  Clock,
  Cake,
  CalendarDays,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  new_employee: "New Onboards",
  payroll_run: "Payroll",
  leave_today: "Leave Today",
  attendance_today: "Attendance",
  leave_pending: "Pending Leaves",
  birthday: "Birthdays",
  leave_upcoming: "Upcoming Leaves",
};

const FILTER_TABS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "leave_pending", label: "Pending Leaves" },
  { key: "birthday", label: "Birthdays" },
  { key: "attendance_today", label: "Attendance" },
  { key: "leave_today", label: "Leave Today" },
  { key: "leave_upcoming", label: "Upcoming Leaves" },
  { key: "new_employee", label: "New Onboards" },
  { key: "payroll_run", label: "Payroll" },
];

const BADGE_CLASS: Record<BadgeType, string> = {
  success: "xp-badge xp-badge-success",
  warning: "xp-badge xp-badge-warning",
  danger: "xp-badge xp-badge-danger",
  info: "xp-badge xp-badge-info",
  neutral: "xp-badge xp-badge-neutral",
};

const BADGE_LABEL: Record<NotificationType, string> = {
  new_employee: "New",
  payroll_run: "Payroll",
  leave_today: "On Leave",
  attendance_today: "Today",
  leave_pending: "Pending",
  birthday: "Birthday",
  leave_upcoming: "Upcoming",
};

const ICON_COLORS: Record<BadgeType, { bg: string; color: string }> = {
  success: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
  warning: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  danger: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  info: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  neutral: { bg: "rgba(107,114,128,0.12)", color: "#6b7280" },
};

const NAV_MAP: Partial<
  Record<NotificationType, (item: NotificationItem) => string>
> = {
  payroll_run: (item) => `/transactions/payroll-runs/${item.refId}`,
  leave_pending: () => "/transactions/leave-requests",
  leave_upcoming: () => "/transactions/leave-requests",
  leave_today: () => "/transactions/leave-requests",
  attendance_today: () => "/transactions/attendance-logs",
};

// ── Time formatter ────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Notification row ──────────────────────────────────────────────────────────
function NotifCard({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: (item: NotificationItem) => void;
}) {
  const Icon = ICONS[item.iconKey] ?? Bell;
  const iconColors = ICON_COLORS[item.badge];
  const badgeLabel = BADGE_LABEL[item.notificationType];
  const isClickable = !!NAV_MAP[item.notificationType];

  return (
    <div
      onClick={() => onClick(item)}
      className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${isClickable ? "cursor-pointer" : "cursor-default"}`}
      style={{
        border: "1px solid var(--xp-border)",
        background: "var(--xp-surface)",
      }}
      onMouseEnter={(e) => {
        if (isClickable)
          e.currentTarget.style.background = "var(--xp-surface-hi)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--xp-surface)";
      }}
    >
      {/* Icon */}
      <span
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: iconColors.bg, color: iconColors.color }}
      >
        <Icon size={18} />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: "var(--xp-text-1)" }}
          >
            {item.title}
          </p>
          <span
            className="text-xs flex-shrink-0 mt-0.5"
            style={{ color: "var(--xp-text-3)" }}
          >
            {formatTime(item.occurredAt)}
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--xp-text-2)" }}>
          {item.subtitle}
        </p>
        <div className="mt-2">
          <span className={BADGE_CLASS[item.badge]}>{badgeLabel}</span>
          <span className="ml-2 text-xs" style={{ color: "var(--xp-text-3)" }}>
            {TYPE_LABELS[item.notificationType]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<NotificationItem[]>("notifications");
      setItems(res.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleClick(item: NotificationItem) {
    const nav = NAV_MAP[item.notificationType];
    if (nav) router.push(nav(item));
  }

  const filtered =
    filter === "all"
      ? items
      : items.filter((i) => i.notificationType === filter);

  // Only show tabs that have data
  const activeTabs = FILTER_TABS.filter(
    (t) => t.key === "all" || items.some((i) => i.notificationType === t.key),
  );

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* <h3
            className="text-lg font-semibold"
            style={{ color: "var(--xp-text-1)" }}
          >
            Notifications
          </h3> */}
          <h3 className="h3">Notifications</h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--xp-text-2)" }}>
            Your latest HR alerts, payroll updates, and attendance summaries.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--xp-surface)",
            border: "1px solid var(--xp-border)",
            color: "var(--xp-text-2)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--xp-surface-hi)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--xp-surface)")
          }
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {activeTabs.map((tab) => {
          const count =
            tab.key === "all"
              ? items.length
              : items.filter((i) => i.notificationType === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                filter === tab.key
                  ? { background: "var(--primary)", color: "#fff" }
                  : {
                      background: "var(--xp-surface)",
                      border: "1px solid var(--xp-border)",
                      color: "var(--xp-text-2)",
                    }
              }
            >
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={
                  filter === tab.key
                    ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                    : {
                        background: "var(--xp-surface-hi)",
                        color: "var(--xp-text-2)",
                      }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--primary)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl"
          style={{
            border: "1px solid var(--xp-border)",
            background: "var(--xp-surface)",
          }}
        >
          <Bell
            size={40}
            className="mb-3 opacity-20"
            style={{ color: "var(--xp-text-3)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--xp-text-2)" }}
          >
            No notifications
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--xp-text-3)" }}>
            {filter === "all"
              ? "You're all caught up."
              : "No items in this category."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item, idx) => (
            <NotifCard
              key={`${item.notificationType}-${item.refId}-${idx}`}
              item={item}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p
          className="text-xs text-center mt-4"
          style={{ color: "var(--xp-text-3)" }}
        >
          Showing {filtered.length} notification
          {filtered.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
