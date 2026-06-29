"use client";
import { useRef, useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import {
  useNotifications,
  NotificationItem,
  NotificationType,
  BadgeType,
} from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";

const ICONS: Record<string, React.ElementType> = {
  UserPlus,
  FileText,
  CalendarOff,
  ClipboardList,
  Clock,
  Cake,
  CalendarDays,
};

const SECTION_LABELS: Record<NotificationType, string> = {
  new_employee: "New Onboards",
  payroll_run: "Payroll Runs",
  leave_today: "Leave Today",
  attendance_today: "Attendance Today",
  leave_pending: "Pending Leave Requests",
  birthday: "Birthdays Today 🎂",
  leave_upcoming: "Upcoming Leaves (3 days)",
};

const SECTION_ORDER: NotificationType[] = [
  "birthday",
  "leave_pending",
  "attendance_today",
  "leave_today",
  "new_employee",
  "leave_upcoming",
  "payroll_run",
];

// Human-readable label per notification type
const BADGE_LABELS: Record<NotificationType, string> = {
  new_employee: "New",
  payroll_run: "Payroll",
  leave_today: "On Leave",
  attendance_today: "Today",
  leave_pending: "Pending",
  birthday: "Birthday",
  leave_upcoming: "Upcoming",
};

// Map badge type → existing xp-badge-* class from globals.css
const BADGE_CLASS: Record<BadgeType, string> = {
  success: "xp-badge xp-badge-success",
  warning: "xp-badge xp-badge-warning",
  danger: "xp-badge xp-badge-danger",
  info: "xp-badge xp-badge-info",
  neutral: "xp-badge xp-badge-neutral",
};

// Icon circle bg — inline style so CSS vars apply in both modes
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
  new_employee: (item) => `/employees/${item.refId}`,
  payroll_run: (item) => `/payroll-runs/${item.refId}`,
  leave_pending: (item) => `/transactions/leave-requests`,
  birthday: (item) => `/employees/${item.refId}`,
  leave_upcoming: (item) => `/transactions/leave-requests`,
  attendance_today: () => "/attendance",
  leave_today: () => "/transactions/leave-requests",
};

function NotifRow({
  item,
  notifType,
  onClick,
}: {
  item: NotificationItem;
  notifType: NotificationType;
  onClick: (item: NotificationItem) => void;
}) {
  const Icon = ICONS[item.iconKey] ?? Bell;
  const iconColors = ICON_COLORS[item.badge];
  const badgeLabel = BADGE_LABELS[notifType] ?? item.badge;

  return (
    <button
      onClick={() => onClick(item)}
      style={{ width: "100%" }}
      className="flex items-start gap-3 px-4 py-3 text-left transition-colors"
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--xp-surface-hi)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Icon circle */}
      <span
        className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: iconColors.bg, color: iconColors.color }}
      >
        <Icon size={15} />
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate leading-snug"
          style={{ color: "var(--xp-text-1)" }}
        >
          {item.title}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--xp-text-2)" }}
        >
          {item.subtitle}
        </p>
      </div>

      {/* Badge */}
      <span
        className={`flex-shrink-0 self-start mt-0.5 ${BADGE_CLASS[item.badge]}`}
      >
        {badgeLabel}
      </span>
    </button>
  );
}

export default function NotificationDropdown() {
  const { grouped, loading, unreadCount, markRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    setOpen((prev) => !prev);
    if (!open) markRead();
  }

  function handleRowClick(item: NotificationItem) {
    const nav = NAV_MAP[item.notificationType];
    if (nav) router.push(nav(item));
    setOpen(false);
  }

  const visibleSections = SECTION_ORDER.filter((type) => {
    if (filter !== "all" && filter !== type) return false;
    return (grouped[type]?.length ?? 0) > 0;
  });

  const totalCount = SECTION_ORDER.reduce(
    (sum, t) => sum + (grouped[t]?.length ?? 0),
    0,
  );

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "var(--xp-text-2)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--xp-surface-hi)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[420px] z-50 flex flex-col rounded-xl shadow-xl"
          style={{
            maxHeight: "600px",
            background: "var(--xp-surface)",
            border: "1px solid var(--xp-border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--xp-border)" }}
          >
            <div className="flex items-center gap-2">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--xp-text-1)" }}
              >
                Notifications
              </h3>
              {totalCount > 0 && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--xp-surface-hi)",
                    color: "var(--xp-text-2)",
                  }}
                >
                  {totalCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refresh}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--xp-text-3)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--xp-surface-hi)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                title="Refresh"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--xp-text-3)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--xp-surface-hi)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          {totalCount > 0 && (
            <div
              className="flex items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0"
              style={{ borderBottom: "1px solid var(--xp-border)" }}
            >
              <button
                onClick={() => setFilter("all")}
                className="flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors"
                style={
                  filter === "all"
                    ? { background: "var(--primary)", color: "#fff" }
                    : {
                        background: "var(--xp-surface-hi)",
                        color: "var(--xp-text-2)",
                      }
                }
              >
                All
              </button>
              {SECTION_ORDER.filter((t) => (grouped[t]?.length ?? 0) > 0).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className="flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap"
                    style={
                      filter === type
                        ? { background: "var(--primary)", color: "#fff" }
                        : {
                            background: "var(--xp-surface-hi)",
                            color: "var(--xp-text-2)",
                          }
                    }
                  >
                    {SECTION_LABELS[type]}
                    <span className="ml-1 opacity-60">
                      {grouped[type]?.length}
                    </span>
                  </button>
                ),
              )}
            </div>
          )}

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading && totalCount === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "var(--primary)",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            ) : totalCount === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                style={{ color: "var(--xp-text-3)" }}
              >
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : visibleSections.length === 0 ? (
              <div
                className="flex items-center justify-center py-10"
                style={{ color: "var(--xp-text-3)" }}
              >
                <p className="text-sm">No items in this category</p>
              </div>
            ) : (
              visibleSections.map((type) => (
                <div key={type}>
                  {/* Section header */}
                  <div
                    className="sticky top-0 px-4 py-2 flex items-center justify-between z-10"
                    style={{
                      background: "var(--xp-surface-hi)",
                      borderBottom: "1px solid var(--xp-border)",
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--xp-text-3)" }}
                    >
                      {SECTION_LABELS[type]}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--xp-text-3)" }}
                    >
                      {grouped[type]?.length}
                    </span>
                  </div>
                  {grouped[type]?.map((item, idx) => (
                    <NotifRow
                      key={`${item.notificationType}-${item.refId}-${idx}`}
                      item={item}
                      notifType={type}
                      onClick={handleRowClick}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div
              className="px-4 py-2.5 text-center flex-shrink-0"
              style={{ borderTop: "1px solid var(--xp-border)" }}
            >
              <button
                onClick={() => {
                  router.push("/notifications");
                  setOpen(false);
                }}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--xp-primary-fg)" }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
