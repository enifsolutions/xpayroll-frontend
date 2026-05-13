export interface EmployeeDeduction {
  id: string
  employeeId: string
  deductionDefinitionId: string
  deductionName: string
  deductionCode: string
  deductionType: string
  calculationType: string
  defaultAmount: number
  defaultPercentage: number
  overrideAmount: number | null
  overridePercentage: number | null
  effectiveAmount: number
  effectivePercentage: number
  isStatutory: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
}

export interface DeductionTypeOption {
  id: string
  name: string
  code: string
  type: string
  calculationType: string
  defaultAmount: number
  defaultPercentage: number
  isStatutory: boolean
}

export interface DeductionForm {
  deductionDefinitionId: string
  overrideAmount: string
  overridePercentage: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

export const defaultForm = (): DeductionForm => ({
  deductionDefinitionId: '',
  overrideAmount:        '',
  overridePercentage:    '',
  effectiveFrom:         '',
  effectiveTo:           '',
  isActive:              true,
})
