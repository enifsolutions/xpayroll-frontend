'use client'

import { Sidebar }   from '@/components/layout/Sidebar'
import { Topbar }    from '@/components/layout/Topbar'
import { AppFooter } from '@/components/layout/AppFooter'
import CompanySetupGate from '@/components/company/CompanySetupGate'
import { useState, useEffect } from 'react'

const PIN_KEY = "xp_sidebar_pinned";
const EXPANDED_W = 290;
const COLLAPSED_W = 80;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sideW, setSideW] = useState(COLLAPSED_W);

  useEffect(() => {
    // Set initial width from stored pin state
    const pinned = localStorage.getItem(PIN_KEY) === "true";
    setSideW(pinned ? EXPANDED_W : COLLAPSED_W);

    // Listen for sidebar expand/collapse events dispatched by Sidebar
    const onSidebarChange = (e: Event) => {
      const { expanded } = (e as CustomEvent<{ expanded: boolean }>).detail;
      setSideW(expanded ? EXPANDED_W : COLLAPSED_W);
    };

    window.addEventListener("xp:sidebar", onSidebarChange);
    return () => window.removeEventListener("xp:sidebar", onSidebarChange);
  }, []);

  return (
    <CompanySetupGate>
      <div className="flex flex-auto flex-col min-h-screen bg-[var(--xp-bg)]">
        <div className="flex flex-auto min-w-0">
          <Sidebar />
          <div
            className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full bg-[var(--xp-bg)]"
            style={{ paddingLeft: sideW, transition: "padding-left 0.2s ease" }}
          >
            <Topbar title="XpayRoll" sidebarWidth={sideW} />
            <div
              className="flex flex-auto flex-col px-6 py-6"
              style={{ paddingTop: "calc(64px + 1.5rem)", paddingBottom: 50 }}
            >
              {children}
            </div>
            <AppFooter sidebarWidth={sideW} />
          </div>
        </div>
      </div>
    </CompanySetupGate>
  );
}
