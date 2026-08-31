"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { HelpCircle, ChevronDown } from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import { UserDropdown } from "@/components/layout/UserDropdown";
import GlobalSearch from "@/components/GlobalSearch";
import { HEADER_HEIGHT } from "@/constants/theme.constant";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export function Topbar({
  title,
  sidebarWidth = 290,
}: {
  title: string;
  sidebarWidth?: number;
}) {
  const user = useAuthStore((s) => s.user);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center px-5 gap-3 bg-[var(--xp-surface)] border-b border-[var(--xp-border)]"
      style={{
        height: HEADER_HEIGHT,
        left: sidebarWidth,
        transition: "left 0.2s ease",
      }}
    >
      <GlobalSearch />

      <div className="flex items-center gap-1 ml-auto">
        {/* data-tour wrapper: NotificationDropdown's own bell button isn't in
            this file, so the tour spotlight anchors to this wrapper instead
            of the button itself. */}
        <div data-tour="notifications-bell">
          <NotificationDropdown />
        </div>
        {/* <button
          className="w-9 h-9 flex items-center justify-center rounded-md text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)] transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={17} />
        </button> */}
        <Link
          href="/system/help-center"
          data-tour="help-center"
          className="w-9 h-9 flex items-center justify-center rounded-md text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)] transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={17} />
        </Link>
        <div data-tour="theme-selector">
          <ThemeToggle />
        </div>
        <div className="w-px h-5 bg-[var(--xp-border)] mx-1.5" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer border border-[var(--xp-border)] hover:bg-[var(--xp-surface-hi)] transition-colors">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}
          >
            M
          </div>
          <span className="text-xs font-medium text-[var(--xp-text-1)]">
            HRMS Portal
          </span>
          <ChevronDown size={12} className="text-[var(--xp-text-2)]" />
        </div>
        <UserDropdown />
      </div>
    </header>
  );
}