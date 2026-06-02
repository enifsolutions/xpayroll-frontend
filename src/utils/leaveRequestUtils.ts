import type { LeaveRequestStatus } from '@/types/leaveRequest.types';

export function statusBadgeClass(status: LeaveRequestStatus): string {
  switch (status) {
    case 'Approved':           return 'xp-badge xp-badge-success';
    case 'SupervisorApproved': return 'xp-badge xp-badge-info';
    case 'Pending':            return 'xp-badge xp-badge-warning';
    case 'Rejected':           return 'xp-badge xp-badge-danger';
    case 'Cancelled':          return 'xp-badge xp-badge-neutral';
    default:                   return 'xp-badge xp-badge-neutral';
  }
}

export function statusLabel(status: LeaveRequestStatus): string {
  switch (status) {
    case 'SupervisorApproved': return 'Supervisor Approved';
    default:                   return status;
  }
}
