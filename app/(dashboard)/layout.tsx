import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-auto flex-col min-h-screen">
      <div className="flex flex-auto min-w-0">
        <Sidebar />
        <div className="flex flex-col flex-auto min-h-screen min-w-0 relative w-full" style={{ paddingLeft: 290 }}>
          <Topbar title="XpayRoll" />
          <div className="flex flex-auto flex-col px-4 sm:px-6 md:px-8 py-4 sm:py-6" style={{ paddingTop: `calc(64px + 1.5rem)` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}