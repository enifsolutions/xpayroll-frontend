"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown, Minus, AlignJustify } from "lucide-react";
import { logout as clearTokens } from "@/lib/auth";
import {
  SIDE_NAV_WIDTH,
  SIDE_NAV_COLLAPSED_WIDTH,
  HEADER_HEIGHT,
} from "@/constants/theme.constant";
import { useState, useEffect, useRef } from "react";
import { useFilteredNavigation } from "@/hooks/useFilteredNavigation";
import { useAuthStore } from "@/store/authStore";

const PIN_KEY = "xp_sidebar_pinned";

export function Sidebar() {
  const path = usePathname();
  const navItems = useFilteredNavigation();
  const { clearAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);

  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [openSubGroups, setOpenSubGroups] = useState<string[]>([]);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sidebar is expanded if pinned OR hovered
  const expanded = pinned || hovered;

  // Notify layout whenever expanded state changes
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("xp:sidebar", { detail: { expanded } }),
    );
  }, [expanded]);

  // Restore pin state
  useEffect(() => {
    if (localStorage.getItem(PIN_KEY) === "true") setPinned(true);
  }, []);

  // Auto-open the group that contains the current path
  useEffect(() => {
    if (!expanded) return;

    const activeGroup = navItems.find((item) =>
      item.children?.some(
        (c) =>
          (c.path !== "#" && path.startsWith(c.path)) ||
          c.children?.some((sc) => path.startsWith(sc.path)),
      ),
    );
    if (activeGroup) {
      setOpenGroups([activeGroup.label]);
    }

    const activeSubGroups: string[] = [];
    navItems.forEach((item) => {
      item.children?.forEach((child) => {
        if (child.children?.some((sc) => path.startsWith(sc.path))) {
          activeSubGroups.push(child.label);
        }
      });
    });
    if (activeSubGroups.length > 0) {
      setOpenSubGroups(activeSubGroups);
    }
  }, [path, expanded, navItems]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem(PIN_KEY, String(next));
    if (!next) {
      setOpenGroups([]);
      setOpenSubGroups([]);
      setHovered(false);
    }
  };

  const handleMouseEnter = () => {
    if (pinned) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(true), 120);
  };

  const handleMouseLeave = () => {
    if (pinned) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHovered(false);
      setOpenGroups([]);
      setOpenSubGroups([]);
    }, 200);
  };

  const toggleGroup = (label: string) => {
    if (!expanded) return;
    setOpenGroups((prev) => (prev.includes(label) ? [] : [label]));
  };

  const toggleSubGroup = (label: string) => {
    setOpenSubGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const handleSignOut = () => {
    clearTokens();
    clearAuth();
    window.location.href = "/login";
  };

  const initials = (n?: string) =>
    (n ?? "AP")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const width = expanded ? SIDE_NAV_WIDTH : SIDE_NAV_COLLAPSED_WIDTH;

  const navCls = (active: boolean) =>
    `flex items-center rounded-md text-sm font-medium transition-all duration-150 border-l-2 ${
      active
        ? "bg-[var(--xp-primary-bg)] text-[var(--xp-primary-fg)] border-blue-500"
        : "text-[var(--xp-text-2)] hover:bg-[var(--xp-surface-hi)] hover:text-[var(--xp-text-1)] border-transparent"
    }`;

  const childCls = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
      active
        ? "text-[var(--xp-primary-fg)] bg-[var(--xp-primary-bg)]"
        : "text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)]"
    }`;

  const subChildCls = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
      active
        ? "text-[var(--xp-primary-fg)] bg-[var(--xp-primary-bg)]"
        : "text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)]"
    }`;

  return (
    <div
      className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-[var(--xp-surface)] border-r border-[var(--xp-border)]"
      style={{ width, minWidth: width, transition: "width 0.2s ease" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand */}
      <div
        className="flex items-center flex-shrink-0 border-b border-[var(--xp-border)] overflow-hidden"
        style={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          padding: expanded ? "0 12px 0 20px" : "0 0 0 22px",
          justifyContent: expanded ? "space-between" : "flex-start",
          transition: "padding 0.2s ease",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}
          >
            X
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-[var(--xp-text-1)] whitespace-nowrap">
                XpayRoll
              </div>
              <div className="text-[10px] text-[var(--xp-text-2)] whitespace-nowrap mt-px">
                Enterprise Suite
              </div>
            </div>
          )}
        </div>
        {expanded && (
          <button
            onClick={togglePin}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0 ${
              pinned
                ? "text-blue-500 bg-[var(--xp-primary-bg)] hover:bg-[var(--xp-primary-bg)]"
                : "text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)]"
            }`}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            <AlignJustify size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div
        className="flex-1 overflow-y-auto py-3 px-2"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;

            // ── Group with children ───────────────────────────────
            if (item.children && item.children.length > 0) {
              const isOpen = openGroups.includes(item.label);
              const isActive = item.children.some(
                (c) =>
                  (c.path !== "#" && path.startsWith(c.path)) ||
                  c.children?.some((sc) => path.startsWith(sc.path)),
              );

              return (
                <div key={item.key}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    title={!expanded ? item.label : undefined}
                    className={navCls(isActive)}
                    style={{
                      width: "100%",
                      gap: expanded ? 10 : 0,
                      padding: expanded ? "9px 10px" : "9px 0",
                      justifyContent: expanded ? "flex-start" : "center",
                    }}
                  >
                    <span className="flex items-center justify-center flex-shrink-0 w-[18px]">
                      <Icon size={16} />
                    </span>
                    {expanded && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                          {item.label}
                        </span>
                        <ChevronDown
                          size={13}
                          className={`text-[var(--xp-text-3)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>

                  {/* Children list */}
                  {isOpen && expanded && (
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;

                        // ── Sub-group ─────────────────────────────
                        if (child.children && child.children.length > 0) {
                          const subOpen = openSubGroups.includes(child.label);
                          const subActive = child.children.some((sc) =>
                            path.startsWith(sc.path),
                          );

                          return (
                            <div key={child.key}>
                              <button
                                onClick={() => toggleSubGroup(child.label)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                                  subActive
                                    ? "text-[var(--xp-primary-fg)] bg-[var(--xp-primary-bg)]"
                                    : "text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)]"
                                }`}
                              >
                                <ChildIcon
                                  size={12}
                                  className="flex-shrink-0"
                                />
                                <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                                  {child.label}
                                </span>
                                <ChevronDown
                                  size={11}
                                  className={`text-[var(--xp-text-3)] transition-transform duration-200 ${subOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {subOpen && (
                                <div className="pl-4 mt-0.5 space-y-0.5">
                                  {child.children.map((sub) => {
                                    const subActive = path.startsWith(sub.path);
                                    return (
                                      <Link
                                        key={sub.key}
                                        href={sub.path}
                                        className={subChildCls(subActive)}
                                      >
                                        <Minus
                                          size={8}
                                          className="text-[var(--xp-border-dim)] flex-shrink-0"
                                        />
                                        <span className="whitespace-nowrap overflow-hidden">
                                          {sub.label}
                                        </span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // ── Regular child link ────────────────────
                        const ca =
                          child.path !== "#" && path.startsWith(child.path);
                        return (
                          <Link
                            key={child.key}
                            href={child.path}
                            className={childCls(ca)}
                          >
                            <Minus
                              size={10}
                              className="text-[var(--xp-border-dim)] flex-shrink-0"
                            />
                            <span className="whitespace-nowrap overflow-hidden">
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Top-level link ────────────────────────────────────
            const isActive =
              path === item.path ||
              (item.path !== "/" && path.startsWith(item.path));
            return (
              <Link
                key={item.key}
                href={item.path}
                title={!expanded ? item.label : undefined}
                className={navCls(isActive)}
                style={{
                  gap: expanded ? 10 : 0,
                  padding: expanded ? "9px 10px" : "9px 0",
                  justifyContent: expanded ? "flex-start" : "center",
                }}
              >
                <span className="flex items-center justify-center flex-shrink-0 w-[18px]">
                  <Icon size={16} />
                </span>
                {expanded && (
                  <span className="flex-1 whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User */}
      <div className="border-t border-[var(--xp-border)] p-2">
        <div
          className="flex items-center rounded-md hover:bg-[var(--xp-surface-hi)] transition-colors cursor-pointer"
          style={{
            gap: expanded ? 10 : 0,
            padding: expanded ? "8px 10px" : "8px 0",
            justifyContent: expanded ? "flex-start" : "center",
          }}
          title={!expanded ? (user?.fullName ?? "Admin Portal") : undefined}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}
          >
            {initials(user?.fullName)}
          </div>
          {expanded && (
            <>
              <div className="flex-1 leading-tight overflow-hidden">
                <div className="text-xs font-medium text-[var(--xp-text-1)] whitespace-nowrap overflow-hidden">
                  {user?.fullName ?? "Admin Portal"}
                </div>
                <div className="text-[10px] text-[var(--xp-text-2)]">
                  {user?.systemRole ?? "Administrator"}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-[var(--xp-text-2)] hover:text-red-400 hover:bg-red-500/10 p-1 rounded-md transition-colors flex-shrink-0"
                aria-label="Sign out"
              >
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}