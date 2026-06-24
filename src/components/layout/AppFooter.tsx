'use client'

export function AppFooter({ sidebarWidth = 290 }: { sidebarWidth?: number }) {
  return (
    <footer
      className="fixed bottom-0 right-0 z-30 flex items-center justify-between px-6 bg-[var(--xp-surface)] border-t border-[var(--xp-border)]"
      style={{ left: sidebarWidth, height: 42, transition: 'left 0.2s ease' }}
    >
      <div className="flex items-center gap-5">
        <span className="text-xs font-semibold text-[var(--xp-text-1)] tracking-tight">
          <span className="text-blue-500">X</span>payRoll
        </span>
        <span className="font-mono text-[10px] text-[var(--xp-text-2)] bg-[var(--xp-bg)] border border-[var(--xp-border)] px-2 py-0.5 rounded">v2.1.0</span>
        {['Privacy Policy', 'Terms', 'Support', 'Documentation'].map(l => (
          <span key={l} className="text-[10px] text-[var(--xp-text-2)] cursor-pointer hover:text-[var(--xp-text-1)] transition-colors">{l}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[var(--xp-text-2)]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          All systems operational
        </span>
        <span className="text-[var(--xp-border-dim)]">·</span>
        <span className="font-mono">© {new Date().getFullYear()} Miracle IT Solutions (Pvt) Ltd</span>
      </div>
    </footer>
  )
}
