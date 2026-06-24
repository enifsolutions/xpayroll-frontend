'use client'

import { Sidebar }   from '@/components/layout/Sidebar'
import { Topbar }    from '@/components/layout/Topbar'
import { AppFooter } from '@/components/layout/AppFooter'
import { useState, useEffect } from 'react'

const COLLAPSE_KEY = 'xp_sidebar_collapsed'
const EW = 290, CW = 80

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sideW, setSideW] = useState(EW)

  useEffect(() => {
    const sync = () => setSideW(localStorage.getItem(COLLAPSE_KEY) === 'true' ? CW : EW)
    sync()
    window.addEventListener('storage', sync)
    const t = setInterval(sync, 100)
    return () => { window.removeEventListener('storage', sync); clearInterval(t) }
  }, [])

  return (
    <div className="flex flex-auto flex-col min-h-screen bg-[var(--xp-bg)]">
      <div className="flex flex-auto min-w-0">
        <Sidebar />
        <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-[var(--xp-bg)]"
             style={{ paddingLeft: sideW, transition: 'padding-left 0.2s ease' }}>
          <Topbar title="XpayRoll" sidebarWidth={sideW} />
          <div className="flex flex-auto flex-col px-6 py-6"
               style={{ paddingTop: 'calc(64px + 1.5rem)', paddingBottom: 50 }}>
            {children}
          </div>
          <AppFooter sidebarWidth={sideW} />
        </div>
      </div>
    </div>
  )
}
