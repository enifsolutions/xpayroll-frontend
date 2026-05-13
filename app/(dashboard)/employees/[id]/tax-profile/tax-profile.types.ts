export interface EmployeeTaxProfile {
  id: string
  employeeId: string
  taxConfigId: string
  taxConfigName: string
  taxYear: number
  regime: string
  residencyStatus: string
  cumulativeTaxPaid: number
  cumulativeTaxableIncome: number
  year: number
  updatedAt: string
}

export interface EmployeeTaxExemption {
  id: string
  employeeId: string
  exemptionType: string
  description: string | null
  annualAmount: number
  year: number
  isApproved: boolean
  createdAt: string
}

export interface TaxConfigOption {
  id: string
  name: string
  taxYear: number
  regime: string
}

export interface TaxProfileForm {
  taxConfigId: string
  residencyStatus: string
  cumulativeTaxPaid: string
  cumulativeTaxableIncome: string
  year: string
}

export interface ExemptionForm {
  exemptionType: string
  description: string
  annualAmount: string
  year: string
  isApproved: boolean
}

export const RESIDENCY_STATUSES = ['Resident', 'NonResident', 'Expatriate']

export const defaultProfileForm = (year: number): TaxProfileForm => ({
  taxConfigId:              '',
  residencyStatus:          'Resident',
  cumulativeTaxPaid:        '0',
  cumulativeTaxableIncome:  '0',
  year:                     year.toString(),
})

export const defaultExemptionForm = (year: number): ExemptionForm => ({
  exemptionType: '',
  description:   '',
  annualAmount:  '',
  year:          year.toString(),
  isApproved:    false,
})
