export type LeaveRequestStatus =
  | 'Pending'
  | 'SupervisorApproved'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  supervisorApprovedBy: string | null;
  supervisorApprovedByName: string | null;
  supervisorApprovedAt: string | null;
  createdAt: string;
}

export interface LeaveRequestForm {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: string;
  reason: string;
}
