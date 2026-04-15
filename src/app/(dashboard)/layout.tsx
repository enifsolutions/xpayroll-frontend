import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="pl-[var(--sidebar-width)]">
        <Topbar title="XpayRoll" />
        <main className="pt-14 p-6">{children}</main>
      </div>
    </div>
  );
}