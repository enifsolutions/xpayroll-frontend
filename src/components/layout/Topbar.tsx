'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Bell } from 'lucide-react';
import { HEADER_HEIGHT, SIDE_NAV_WIDTH } from '@/constants/theme.constant';

export function Topbar({ title }: { title: string }) {
  return (
    <header
      className="header shadow-sm dark:shadow-2xl flex items-center justify-between px-6 fixed top-0 right-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      style={{
        height: HEADER_HEIGHT,
        left: SIDE_NAV_WIDTH,
      }}
    >
      <h1 className="text-sm font-semibold heading-text">{title}</h1>
      <div className="flex items-center gap-2">
        <button className="header-action-item header-action-item-hoverable p-2 rounded-lg">
          <Bell size={18} />
        </button>
        <ThemeToggle />
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-white ml-1 cursor-pointer">
          A
        </div>
      </div>
    </header>
  );
}