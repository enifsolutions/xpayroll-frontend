export interface ShiftAssignment {
  id: string
  employeeId: string
  shiftId: string
  shiftName: string
  shiftCode: string
  attendancePolicyId: string
  attendancePolicyName: string
  effectiveFrom: string   // ISO date string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
}

export interface ShiftOption {
  id: string
  name: string
  code: string
}

export interface PolicyOption {
  id: string
  name: string
}

export interface ShiftAssignmentForm {
  shiftId: string
  attendancePolicyId: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

export const defaultForm = (): ShiftAssignmentForm => ({
  shiftId: '',
  attendancePolicyId: '',
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true,
})
