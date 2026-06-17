'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronDown } from "lucide-react";
import { logout as clearTokens } from '@/lib/auth';
import { SIDE_NAV_WIDTH, HEADER_HEIGHT } from '@/constants/theme.constant';
import { useState, useEffect } from "react";
import { useFilteredNavigation } from "@/hooks/useFilteredNavigation";
import { useAuthStore } from "@/store/authStore";

export function Sidebar() {
  const path = usePathname();
  const navItems = useFilteredNavigation();
  const { clearAuth } = useAuthStore();

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [openSubGroups, setOpenSubGroups] = useState<string[]>([]);

  useEffect(() => {
    const active = navItems.find((item) =>
      item.children?.some(
        (c) =>
          path.startsWith(c.path) ||
          c.children?.some((sc) => path.startsWith(sc.path)),
      ),
    );
    if (active) setOpenGroups([active.label]);

    // Auto-open sub-group containing active path
    navItems.forEach((item) => {
      item.children?.forEach((child) => {
        if (child.children?.some((sc) => path.startsWith(sc.path))) {
          setOpenSubGroups((prev) =>
            prev.includes(child.label) ? prev : [...prev, child.label],
          );
        }
      });
    });
  }, [path]);

  const toggleGroup = (label: string) => {
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

  return (
    <div
      className="side-nav side-nav-bg side-nav-expand hidden lg:flex flex-col fixed inset-y-0 left-0 z-40"
      style={{ width: SIDE_NAV_WIDTH, minWidth: SIDE_NAV_WIDTH }}
    >
      {/* Logo */}
      <div
        className="side-nav-header flex items-center px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
        style={{ height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT }}
      >
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Xpay<span className="text-primary">Roll</span>
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto side-nav-content py-4 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            // ── Top-level link (no children) ──────────────────
            if (!item.children || item.children.length === 0) {
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    path.startsWith(item.path)
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            }

            // ── Group with children ───────────────────────────
            const isOpen = openGroups.includes(item.label);
            const isActive = item.children.some(
              (c) =>
                path.startsWith(c.path) ||
                c.children?.some((sc) => path.startsWith(sc.path)),
            );

            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary dark:text-primary"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                    {item.children.map((child) => {
                      // ── Sub-group (has its own children) ─────
                      if (child.children && child.children.length > 0) {
                        const subOpen = openSubGroups.includes(child.label);
                        const subActive = child.children.some((sc) =>
                          path.startsWith(sc.path),
                        );

                        return (
                          <div key={child.key}>
                            <button
                              onClick={() => toggleSubGroup(child.label)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                subActive
                                  ? "text-primary dark:text-primary"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              <child.icon size={15} />
                              <span className="flex-1 text-left">
                                {child.label}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${subOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            <div
                              className={`overflow-hidden transition-all duration-200 ${
                                subOpen
                                  ? "max-h-[1000px] opacity-100"
                                  : "max-h-0 opacity-0"
                              }`}
                            >
                              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                                {child.children.map((sub) => (
                                  <Link
                                    key={sub.key}
                                    href={sub.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      path.startsWith(sub.path)
                                        ? "bg-primary text-white"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <sub.icon size={14} />
                                    <span>{sub.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // ── Regular child link ────────────────────
                      return (
                        <Link
                          key={child.key}
                          href={child.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            path.startsWith(child.path)
                              ? "bg-primary text-white"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <child.icon size={15} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}