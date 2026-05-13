export interface EmployeeLeaveBalance {
  id: string
  employeeId: string
  leaveTypeId: string
  leaveTypeName: string
  leaveTypeCode: string
  isPaid: boolean
  carryForward: boolean
  year: number
  entitled: number
  used: number
  carriedForward: number
  remaining: number
  updatedAt: string
}

export interface LeaveTypeOption {
  id: string
  name: string
  code: string
  daysPerYear: number
  isPaid: boolean
  carryForward: boolean
}

export interface LeaveBalanceForm {
  leaveTypeId: string
  year: string
  entitled: string
  carriedForward: string
  used: string
}

export const defaultForm = (currentYear: number): LeaveBalanceForm => ({
  leaveTypeId:   '',
  year:          currentYear.toString(),
  entitled:      '',
  carriedForward: '0',
  used:          '0',
})
