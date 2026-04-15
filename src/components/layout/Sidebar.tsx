'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, Clock,
  Calendar, Gift, FileText, Settings, LogOut,
  Database, GitBranch, ChevronDown,
} from 'lucide-react';
import { clearTokens } from '@/lib/auth';
import { SIDE_NAV_WIDTH, HEADER_HEIGHT } from '@/constants/theme.constant';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  group?: never;
};

type NavGroup = {
  label: string;
  icon: any;
  group: true;
  children: { href: string; label: string; icon: any }[];
};

const NAV: (NavItem | NavGroup)[] = [
  { href: '/dashboard',       label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/employees',       label: 'Employees',    icon: Users },
  { href: '/payroll',         label: 'Payroll Runs', icon: CreditCard },
  { href: '/attendance',      label: 'Attendance',   icon: Clock },
  { href: '/leave',           label: 'Leave',        icon: Calendar },
  { href: '/benefits',        label: 'Benefits',     icon: Gift },
  { href: '/reports',         label: 'Reports',      icon: FileText },
  {
    label: 'Master Data',
    icon: Database,
    group: true,
    children: [
      { href: '/master/branches', label: 'Branches', icon: GitBranch },
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const path = usePathname();

  const isMasterActive = path.startsWith('/master');
  const [openGroups, setOpenGroups] = useState<string[]>(
    isMasterActive ? ['Master Data'] : []
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
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
          {NAV.map((item) => {
            if ('group' in item && item.group) {
              const isOpen = openGroups.includes(item.label);
              const isActive = item.children.some((c) => path.startsWith(c.href));

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary dark:text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Children */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                      {item.children.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            path.startsWith(href)
                              ? 'bg-primary text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon size={15} />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            const navItem = item as NavItem;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  path.startsWith(navItem.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <navItem.icon size={18} />
                <span>{navItem.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => { clearTokens(); window.location.href = '/login'; }}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}