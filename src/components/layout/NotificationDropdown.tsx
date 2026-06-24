'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, AlertTriangle, Clock, Shield, X } from 'lucide-react'

const NOTIFICATIONS = [
  {
    id: 1, unread: false,
    icon: <Check size={16} className="text-emerald-500" />,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    title: 'Payroll Approved',
    body: 'Batch #402 for Engineering department has been processed successfully.',
    time: '2 minutes ago',
    actions: null,
  },
  {
    id: 2, unread: true,
    icon: <span className="text-blue-500 font-bold text-sm">!</span>,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    title: 'New Leave Request (Sarah Mitchell)',
    body: 'Annual Leave: June 15 - June 22 (5 working days)',
    time: '1 hour ago',
    actions: ['Approve', 'Deny'],
  },
  {
    id: 3, unread: false,
    icon: <Clock size={16} className="text-orange-500" />,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    title: 'System Upgrade Scheduled',
    body: 'HRMS Portal will be offline for maintenance on Sunday, 2:00 AM EST.',
    time: '3 hours ago',
    actions: null,
  },
  {
    id: 4, unread: false,
    icon: <Shield size={16} className="text-red-500" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    title: 'New Login Detected',
    body: 'A login to your account from a new Chrome browser on MacOS (San Francisco, CA).',
    time: '5 hours ago',
    actions: null,
    titleCls: 'text-red-500',
  },
]

export function NotificationDropdown() {
  const [open, setOpen]       = useState(false)
  const [notes, setNotes]     = useState(NOTIFICATIONS)
  const ref                   = useRef<HTMLDivElement>(null)
  const unreadCount           = notes.filter(n => n.unread).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = () => setNotes(prev => prev.map(n => ({ ...n, unread: false })))
  const dismiss     = (id: number) => setNotes(prev => prev.filter(n => n.id !== id))

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-md
                   text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)]
                   hover:bg-[var(--xp-surface-hi)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500
                           border-2 border-[var(--xp-surface)]
                           flex items-center justify-center text-white text-[9px] font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-[380px] z-50 rounded-xl
                     bg-[var(--xp-surface)] border border-[var(--xp-border)]
                     shadow-2xl shadow-black/20 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--xp-border)]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--xp-text-1)]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notes.map((n, i) => (
              <div
                key={n.id}
                className={`relative px-4 py-3.5 transition-colors group
                  ${n.unread ? 'bg-blue-500/5 dark:bg-blue-500/8' : 'hover:bg-[var(--xp-surface-hi)]'}
                  ${i < notes.length - 1 ? 'border-b border-[var(--xp-border)]' : ''}`}
              >
                {n.unread && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.iconBg}`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold leading-snug ${(n as any).titleCls ?? 'text-[var(--xp-text-1)]'}`}>
                      {n.title}
                    </div>
                    <div className="text-xs text-[var(--xp-text-2)] mt-0.5 leading-relaxed">{n.body}</div>
                    {n.actions && (
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors">
                          {n.actions[0]}
                        </button>
                        <button className="px-3 py-1 text-xs font-medium border border-[var(--xp-border)] text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)] rounded-md transition-colors">
                          {n.actions[1]}
                        </button>
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--xp-text-3)] mt-1.5">{n.time}</div>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[var(--xp-text-3)] hover:text-[var(--xp-text-1)] hover:bg-[var(--xp-surface-hi)] transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="py-12 text-center text-[var(--xp-text-2)] text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[var(--xp-border)] text-center">
            <button className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors">
              View All Activity
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
