export interface EmployeeBenefit {
  id: string
  employeeId: string
  benefitDefinitionId: string
  benefitName: string
  benefitCode: string
  benefitType: string
  calculationType: string
  defaultAmount: number
  defaultPercentage: number
  overrideAmount: number | null
  overridePercentage: number | null
  effectiveAmount: number
  effectivePercentage: number
  isTaxable: boolean
  isPensionable: boolean
  isRecurring: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
}

export interface BenefitTypeOption {
  id: string
  name: string
  code: string
  type: string
  calculationType: string
  defaultAmount: number
  defaultPercentage: number
}

export interface BenefitForm {
  benefitDefinitionId: string
  overrideAmount: string
  overridePercentage: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

export const defaultForm = (): BenefitForm => ({
  benefitDefinitionId: '',
  overrideAmount:      '',
  overridePercentage:  '',
  effectiveFrom:       '',
  effectiveTo:         '',
  isActive:            true,
})
