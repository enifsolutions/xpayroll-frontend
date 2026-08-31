'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Settings, Shield, KeyRound,
  LogOut, ChevronRight, Moon, Sun, Monitor
} from 'lucide-react'
import { logout as clearTokens } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);

  const initials = (n?: string) =>
    (n ?? "AP")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = () => {
    clearTokens();
    clearAuth();
    router.replace("/login");
  };

  const menuItems = [
    {
      group: "Account",
      items: [
        {
          icon: User,
          label: "My Profile",
          sub: "View and edit profile",
          action: () => router.push("/my-profile"),
        },
        // {
        //   icon: Settings,
        //   label: "Preferences",
        //   sub: "App settings & display",
        //   action: () => router.push("/settings"),
        // },
        {
          icon: KeyRound,
          label: "Change Password",
          sub: "Update your credentials",
          action: () => router.push("/my-profile?tab=security"),
        },
      ],
    },
    {
      group: "Admin",
      items: [
        {
          icon: Shield,
          label: "Roles & Permissions",
          sub: "Manage access control",
          action: () => router.push("/settings/roles"),
        },
      ],
    },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ml-1 cursor-pointer flex-shrink-0 ring-2 ring-transparent hover:ring-blue-500/50 transition-all"
        style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}
        aria-label="User menu"
        data-tour="user-menu"
      >
        {initials(user?.fullName)}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-[280px] z-50 rounded-xl
                        bg-[var(--xp-surface)] border border-[var(--xp-border)]
                        shadow-2xl shadow-black/20 overflow-hidden"
        >
          {/* Profile header */}
          <div
            className="px-4 py-4 border-b border-[var(--xp-border)]"
            style={{
              background:
                "linear-gradient(135deg, rgba(29,78,216,0.08) 0%, rgba(109,40,217,0.08) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm"
                style={{
                  background: "linear-gradient(135deg,#1d4ed8,#6d28d9)",
                }}
              >
                {initials(user?.fullName)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--xp-text-1)] truncate">
                  {user?.fullName ?? "Admin Portal"}
                </div>
                <div className="text-xs text-[var(--xp-text-2)] truncate">
                  {user?.email ?? "admin@xpayroll.com"}
                </div>
                <span
                  className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium
                                 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full"
                >
                  <Shield size={9} />
                  {user?.systemRole ?? "SuperAdmin"}
                </span>
              </div>
            </div>
          </div>

          {/* Menu groups */}
          {menuItems.map((group, gi) => (
            <div
              key={group.group}
              className={gi > 0 ? "border-t border-[var(--xp-border)]" : ""}
            >
              <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-[var(--xp-text-3)] uppercase tracking-wider">
                {group.group}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 group
                               hover:bg-[var(--xp-surface-hi)] transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                    bg-[var(--xp-bg)] group-hover:bg-[var(--xp-primary-bg)]
                                    text-[var(--xp-text-2)] group-hover:text-[var(--xp-primary-fg)]
                                    transition-colors"
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--xp-text-1)]">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-[var(--xp-text-2)]">
                        {item.sub}
                      </div>
                    </div>
                    <ChevronRight
                      size={13}
                      className="text-[var(--xp-text-3)] group-hover:text-[var(--xp-text-2)] transition-colors"
                    />
                  </button>
                );
              })}
            </div>
          ))}

          {/* Sign out */}
          <div className="border-t border-[var(--xp-border)] p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg group
                         hover:bg-red-500/10 transition-colors text-left"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                              bg-[var(--xp-bg)] group-hover:bg-red-500/10
                              text-[var(--xp-text-2)] group-hover:text-red-400 transition-colors"
              >
                <LogOut size={14} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-[var(--xp-text-1)] group-hover:text-red-400 transition-colors">
                  Sign Out
                </div>
                <div className="text-[10px] text-[var(--xp-text-2)]">
                  End your session
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}