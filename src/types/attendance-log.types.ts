export interface AttendanceLog {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  shiftId: string | null
  shiftName: string | null
  workDate: string
  checkIn: string | null
  checkOut: string | null
  source: string
  hoursWorked: number
  overtimeHours: number
  breakMinutes: number
  isLate: boolean
  lateMinutes: number
  preOtMinutes: number
  postOtMinutes: number
  earlyLeaveMinutes: number
  status: string
  isAdjusted: boolean
  adjustedBy: string | null
  adjustmentReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string | null
}

export interface AttendanceLogForm {
  employeeId: string
  shiftId: string
  workDate: string
  checkIn: string
  checkOut: string
  source: string
  hoursWorked: string
  overtimeHours: string
  breakMinutes: string
  isLate: boolean
  lateMinutes: string
  preOtMinutes: string
  postOtMinutes: string
  earlyLeaveMinutes: string
  status: string
  adjustmentReason: string
  notes: string
  manualOverride: boolean
}

export interface AttendanceLogFilters {
  employeeId: string
  dateFrom: string
  dateTo: string
  status: string
}

export interface AttendanceGenerationLog {
  id: string
  runDate: string
  runType: string
  status: string
  totalEmployees: number
  recordsCreated: number
  recordsSkipped: number
  errorMessage: string | null
  runBy: string | null
  startedAt: string
  completedAt: string | null
}

export interface AttendanceAdjustmentRequest {
  id: string
  attendanceLogId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  workDate: string
  reason: string
  oldCheckIn: string | null
  oldCheckOut: string | null
  oldStatus: string
  oldHoursWorked: number
  oldBreakMinutes: number
  newCheckIn: string | null
  newCheckOut: string | null
  newStatus: string
  newHoursWorked: number
  newBreakMinutes: number
  status: string
  requestedBy: string
  requestedByName: string
  requestedAt: string
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}
