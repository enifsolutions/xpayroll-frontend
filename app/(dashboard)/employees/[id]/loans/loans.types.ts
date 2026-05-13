export interface LoanRecord {
  id: string
  employeeId: string
  principalAmount: number
  monthlyInstallment: number
  totalInstallments: number
  paidInstallments: number
  outstandingBalance: number
  startDate: string
  status: 'Active' | 'Completed' | 'Cancelled'
  notes: string | null
  progressPct: number
  createdAt: string
  updatedAt: string | null
}

export interface ExternalLiability {
  id: string
  employeeId: string
  liabilityType: string
  lenderName: string
  monthlyCommitment: number
  outstandingBalance: number
  startDate: string
  endDate: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
}

export interface DsrData {
  grossSalary: number
  internalMonthly: number
  externalMonthly: number
  totalMonthlyCommitment: number
  dsrPercentage: number
  dsrStatus: 'Safe' | 'Warning' | 'Critical'
}

export interface LoanForm {
  principalAmount: string
  monthlyInstallment: string
  totalInstallments: string
  paidInstallments: string
  startDate: string
  status: string
  notes: string
}

export interface LiabilityForm {
  liabilityType: string
  lenderName: string
  monthlyCommitment: string
  outstandingBalance: string
  startDate: string
  endDate: string
  isActive: boolean
  notes: string
}

export const LOAN_STATUSES    = ['Active', 'Completed', 'Cancelled']
export const LIABILITY_TYPES  = ['BankLoan', 'Leasing', 'CreditCard', 'Mortgage', 'PersonalLoan', 'Other']

export const defaultLoanForm = (): LoanForm => ({
  principalAmount: '', monthlyInstallment: '', totalInstallments: '',
  paidInstallments: '0', startDate: '', status: 'Active', notes: '',
})

export const defaultLiabilityForm = (): LiabilityForm => ({
  liabilityType: 'BankLoan', lenderName: '', monthlyCommitment: '',
  outstandingBalance: '0', startDate: '', endDate: '', isActive: true, notes: '',
})
