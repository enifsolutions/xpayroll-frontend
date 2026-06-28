"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  LogIn,
  LogOut,
  UserCog,
  UserPlus,
  UserMinus,
  KeyRound,
  Briefcase,
  Calendar,
  Clock3,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import axios from "@/lib/axios";
import type { UserDto, UserActivityDto } from "@/types/users.types";

// ─── Module config ────────────────────────────────────────────────────────────

interface ModuleConfig {
  color: string;
  bg: string;
  darkBg: string;
  label: string;
}

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  Auth: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100",
    darkBg: "dark:bg-blue-900/30",
    label: "Auth",
  },
  Employee: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100",
    darkBg: "dark:bg-emerald-900/30",
    label: "Employee",
  },
  Payroll: {
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100",
    darkBg: "dark:bg-violet-900/30",
    label: "Payroll",
  },
  Leave: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100",
    darkBg: "dark:bg-amber-900/30",
    label: "Leave",
  },
  Attendance: {
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100",
    darkBg: "dark:bg-cyan-900/30",
    label: "Attendance",
  },
  UserManagement: {
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100",
    darkBg: "dark:bg-rose-900/30",
    label: "User Mgmt",
  },
};

const DEFAULT_MODULE: ModuleConfig = {
  color: "text-gray-600 dark:text-gray-400",
  bg: "bg-gray-100",
  darkBg: "dark:bg-gray-700",
  label: "System",
};

// ─── Action icon ──────────────────────────────────────────────────────────────

function ActionIcon({ module, action }: { module: string; action: string }) {
  const cfg = MODULE_CONFIG[module] ?? DEFAULT_MODULE;
  const cls = `w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.darkBg}`;
  const iconCls = `${cfg.color}`;

  const key = `${module}:${action}`;
  switch (key) {
    case "Auth:LOGIN":
      return (
        <div className={cls}>
          <LogIn size={14} className={iconCls} />
        </div>
      );
    case "Auth:LOGOUT":
      return (
        <div className={cls}>
          <LogOut size={14} className={iconCls} />
        </div>
      );
    case "UserManagement:CREATE":
      return (
        <div className={cls}>
          <UserPlus size={14} className={iconCls} />
        </div>
      );
    case "UserManagement:UPDATE":
      return (
        <div className={cls}>
          <UserCog size={14} className={iconCls} />
        </div>
      );
    case "UserManagement:DELETE":
      return (
        <div className={cls}>
          <UserMinus size={14} className={iconCls} />
        </div>
      );
    case "UserManagement:RESET_PASSWORD":
    case "UserManagement:CHANGE_PASSWORD":
      return (
        <div className={cls}>
          <KeyRound size={14} className={iconCls} />
        </div>
      );
    case "Employee:CREATE":
    case "Employee:UPDATE":
    case "Employee:DELETE":
      return (
        <div className={cls}>
          <Briefcase size={14} className={iconCls} />
        </div>
      );
    case "Leave:APPLY":
    case "Leave:APPROVE":
    case "Leave:REJECT":
    case "Leave:CANCEL":
    case "Leave:REVOKE":
    case "Leave:SUPERVISOR_APPROVE":
      return (
        <div className={cls}>
          <Calendar size={14} className={iconCls} />
        </div>
      );
    case "Payroll:CREATE":
    case "Payroll:APPROVE":
    case "Payroll:CANCEL":
    case "Payroll:VOID":
      return (
        <div className={cls}>
          <Briefcase size={14} className={iconCls} />
        </div>
      );
    case "Attendance:CREATE":
    case "Attendance:UPDATE":
    case "Attendance:DELETE":
      return (
        <div className={cls}>
          <Clock3 size={14} className={iconCls} />
        </div>
      );
    default:
      return (
        <div className={cls}>
          <RefreshCw size={14} className={iconCls} />
        </div>
      );
  }
}

// ─── Action label ─────────────────────────────────────────────────────────────

function actionLabel(module: string, action: string): string {
  const map: Record<string, string> = {
    "Auth:LOGIN": "Logged in",
    "Auth:LOGOUT": "Logged out",
    "UserManagement:CREATE": "Created user",
    "UserManagement:UPDATE": "Updated user",
    "UserManagement:DELETE": "Deleted user",
    "UserManagement:RESET_PASSWORD": "Reset password",
    "UserManagement:CHANGE_PASSWORD": "Changed password",
    "UserManagement:FORGOT_PASSWORD": "Forgot password reset",
    "Employee:CREATE": "Created employee",
    "Employee:UPDATE": "Updated employee",
    "Employee:DELETE": "Deleted employee",
    "Leave:APPLY": "Applied for leave",
    "Leave:APPROVE": "Approved leave",
    "Leave:SUPERVISOR_APPROVE": "Supervisor approved leave",
    "Leave:REJECT": "Rejected leave",
    "Leave:CANCEL": "Cancelled leave",
    "Leave:REVOKE": "Revoked leave",
    "Payroll:CREATE": "Created payroll run",
    "Payroll:APPROVE": "Approved payroll run",
    "Payroll:CANCEL": "Cancelled payroll run",
    "Payroll:VOID": "Voided payroll run",
    "Attendance:CREATE": "Added attendance record",
    "Attendance:UPDATE": "Updated attendance record",
    "Attendance:DELETE": "Deleted attendance record",
  };
  return map[`${module}:${action}`] ?? `${module} — ${action}`;
}

// ─── Date grouping ────────────────────────────────────────────────────────────

function groupByDate(
  items: UserActivityDto[],
): Record<string, UserActivityDto[]> {
  const groups: Record<string, UserActivityDto[]> = {};
  items.forEach((item) => {
    const d = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let key: string;
    if (d.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Module badge ─────────────────────────────────────────────────────────────

function ModuleBadge({ module }: { module: string }) {
  const cfg = MODULE_CONFIG[module] ?? DEFAULT_MODULE;
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.darkBg} ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserActivityDrawerProps {
  user: UserDto | null;
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 20;

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function UserActivityDrawer({
  user,
  open,
  onClose,
}: UserActivityDrawerProps) {
  const [activities, setActivities] = useState<UserActivityDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialized = useRef(false);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!user) return;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await axios.get(
          `/users/${user.id}/activity?page=${pageNum}&limit=${PAGE_SIZE}`,
        );
        const data: UserActivityDto[] = res.data ?? [];
        if (append) {
          setActivities((prev) => [...prev, ...data]);
        } else {
          setActivities(data);
        }
        if (data.length > 0) setTotalCount(data[0].totalCount);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (open && user) {
      initialized.current = false;
      setActivities([]);
      setPage(1);
      setTotalCount(0);
      load(1, false);
    }
  }, [open, user]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, true);
  };

  const hasMore = activities.length < totalCount;
  const grouped = groupByDate(activities);
  const avatarColor = user
    ? (() => {
        const COLORS = [
          "bg-blue-500",
          "bg-violet-500",
          "bg-emerald-500",
          "bg-amber-500",
          "bg-rose-500",
          "bg-cyan-500",
          "bg-fuchsia-500",
          "bg-orange-500",
        ];
        let hash = 0;
        const name = `${user.firstName}${user.lastName}`;
        for (let i = 0; i < name.length; i++)
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return COLORS[Math.abs(hash) % COLORS.length];
      })()
    : "bg-gray-400";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {user && (
              <div
                className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white text-sm font-semibold">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                {user ? `${user.firstName} ${user.lastName}` : "Activity Log"}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {user?.email} • {totalCount} events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Clock3 size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No activity recorded yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Actions will appear here as this user works in the system.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      {date}
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  </div>

                  {/* Events */}
                  <div className="space-y-3">
                    {items.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 group"
                      >
                        <ActionIcon
                          module={activity.module}
                          action={activity.action}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {actionLabel(activity.module, activity.action)}
                            </p>
                            <ModuleBadge module={activity.module} />
                          </div>
                          {activity.entityLabel && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {activity.entityLabel}
                            </p>
                          )}
                          {activity.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {formatTime(activity.createdAt)}
                            </span>
                            {activity.ipAddress && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">
                                  •
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  {activity.ipAddress}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    {loadingMore
                      ? "Loading..."
                      : `Load more (${totalCount - activities.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
