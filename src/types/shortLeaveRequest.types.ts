export type ShortLeaveStatus =
  | 'Pending' | 'SupervisorApproved' | 'Approved' | 'Rejected' | 'Cancelled';

export interface ShortLeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  profilePictureUrl: string | null;
  leaveDate: string;
  fromTime: string;
  toTime: string;
  minutes: number;
  reason: string | null;
  status: ShortLeaveStatus;
  rejectionReason: string | null;
  cancellationReason: string | null;
  appliedBy: string | null;
  appliedByName: string | null;
  supervisorApprovedBy: string | null;
  supervisorApprovedByName: string | null;
  supervisorApprovedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  convertedLeaveRequestId: string | null;
  createdAt: string;
}

export interface ShortLeavePolicy {
  id: string;
  moduleEnabled: boolean;
  monthlyQuota: number;
  maxDurationMinutes: number;
  minDurationMinutes: number;
  allowedWindows: 'Anytime' | 'StartOrEndOfShift';
  overquotaBehavior: 'Block' | 'ConvertHalfDay' | 'ConvertNoPay';
  overdurationBehavior: 'Block' | 'ConvertHalfDay' | 'ConvertNoPay';
  halfdayLeaveTypeId: string | null;
  halfdayLeaveTypeName: string | null;
  advanceNoticeDays: number;
  allowBackdated: boolean;
  countTowardLateSuppression: boolean;
  midmonthJoinQuotaBehavior: 'Full' | 'Prorated';
  midmonthProrateBasis: 'CalendarDays' | 'WorkingDays' | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
}
