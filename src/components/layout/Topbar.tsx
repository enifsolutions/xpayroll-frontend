'use client'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Search, HelpCircle, ChevronDown } from 'lucide-react'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { HEADER_HEIGHT } from '@/constants/theme.constant'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export function Topbar({ title, sidebarWidth = 290 }: { title: string; sidebarWidth?: number }) {
  const [search, setSearch] = useState('')
  const user = useAuthStore(s => s.user)
  const initials = (n?: string) => (n ?? 'AP').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center px-5 gap-3 bg-[var(--xp-surface)] border-b border-[var(--xp-border)]"
      style={{ height: HEADER_HEIGHT, left: sidebarWidth, transition: 'left 0.2s ease' }}
    >
      <div className="relative flex-1 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--xp-text-2)] pointer-events-none" />
        <input type="text" placeholder="Search employees, payroll, records, or reports…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-md bg-[var(--xp-bg)] border border-[var(--xp-border)] text-[var(--xp-text-1)] placeholder-[var(--xp-text-2)] outline-none focus:border-blue-500 transition-colors font-mono" />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <NotificationDropdown />
        <button className="w-9 h-9 flex items-center justify-center rounded-md text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)] transition-colors" aria-label="Help">
          <HelpCircle size={17} />
        </button>
        <ThemeToggle />
        <div className="w-px h-5 bg-[var(--xp-border)] mx-1.5" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer border border-[var(--xp-border)] hover:bg-[var(--xp-surface-hi)] transition-colors">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)' }}>M</div>
          <span className="text-xs font-medium text-[var(--xp-text-1)]">HRMS Portal</span>
          <ChevronDown size={12} className="text-[var(--xp-text-2)]" />
        </div>
        <UserDropdown />
      </div>
    </header>
  )
}
