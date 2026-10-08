import type { ShortLeaveStatus } from '@/types/shortLeaveRequest.types';

export function statusBadgeClass(status: ShortLeaveStatus): string {
  switch (status) {
    case 'Approved':           return 'xp-badge xp-badge-success';
    case 'SupervisorApproved': return 'xp-badge xp-badge-info';
    case 'Pending':            return 'xp-badge xp-badge-warning';
    case 'Rejected':           return 'xp-badge xp-badge-danger';
    case 'Cancelled':          return 'xp-badge xp-badge-neutral';
    default:                   return 'xp-badge xp-badge-neutral';
  }
}

export function statusLabel(status: ShortLeaveStatus): string {
  switch (status) {
    case 'SupervisorApproved': return 'Supervisor Approved';
    default:                   return status;
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatTimeRange(fromTime: string, toTime: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };
  return `${fmt(fromTime)} \u2013 ${fmt(toTime)}`;
}
