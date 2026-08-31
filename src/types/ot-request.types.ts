export interface OtRequest {
  id: string
  attendanceLogId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  workDate: string
  reason: string
  checkIn: string | null
  checkOut: string | null
  requestedPreOtMinutes: number
  requestedPostOtMinutes: number
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
