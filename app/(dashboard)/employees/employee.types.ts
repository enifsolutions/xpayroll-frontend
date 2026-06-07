export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  personalEmail: string | null;
  phoneNumber: string | null;
  nationalIdNumber: string | null;
  tinNumber?: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName?: string | null;
  bankAccountType?: string | null;
  bankBranchId?: string | null;
  bankBranchBankName?: string | null;
  bankBranchName?: string | null;
  bankBranchCode?: string | null;
  crewId?: string | null;
  crewName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  address: string | null;
  profilePictureUrl: string | null;
  branchId: string | null;
  departmentId: string | null;
  designationId: string | null;
  managerId: string | null;
  joinDate: string;
  terminationDate: string | null;
  employmentType: string;
  status: string;
  basicSalary: number;
  notes: string | null;
  branchName: string | null;
  departmentName: string | null;
  designationName: string | null;
  managerName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface EmployeeContract {
  id: string
  employeeId: string
  designationId: string | null
  contractType: string
  payrollBasis: string
  basicSalary: number
  hourlyRate: number | null
  dailyRate: number | null
  allowances: number
  currency: string
  absentDeductionAfterDays: number
  lateDeductionPerMinute: number
  overtimeRateMultiplier: number
  startDate: string
  endDate: string | null
  isActive: boolean
  notes: string | null
  designationName: string | null
}

// ── Lookup types ──────────────────────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  code: string
  isActive: boolean
}

export interface Department {
  id: string
  name: string
  code: string
  branchId: string | null
  isActive: boolean
}

export interface Designation {
  id: string
  title: string
  level: string | null
  grade: string | null
  isActive: boolean
}

export interface CrewOption {
  id: string;
  name: string;
  code: string;
  departmentName?: string | null;
  leadName?: string | null;
  isActive: boolean;
}

export interface GroupOption {
  id: string;
  name: string;
  code: string;
  departmentName?: string | null;
  leadName?: string | null;
  isActive: boolean;
}

export interface BankBranchOption {
  id: string;
  bankName: string;
  branchName: string;
  branchCode?: string | null;
  city?: string | null;
  swiftCode?: string | null;
  isActive: boolean;
}

// ── Form types ────────────────────────────────────────────────────────────────
export interface EmployeeForm {
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  personalEmail: string;
  phoneNumber: string;
  nationalIdNumber: string;
  tinNumber: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankAccountType: string;
  bankBranchId: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  branchId: string;
  departmentId: string;
  designationId: string;
  managerId: string;
  joinDate: string;
  terminationDate: string;
  employmentType: string;
  status: string;
  notes: string;
  crewId: string;
  groupId: string;
}

export interface ContractForm {
  contractType: string
  payrollBasis: string
  basicSalary: string
  hourlyRate: string
  dailyRate: string
  allowances: string        // total fixed allowance amount on top of basic salary
  currency: string
  absentDeductionAfterDays: string
  lateDeductionPerMinute: string
  overtimeRateMultiplier: string
  startDate: string
  endDate: string
  notes: string
}

export const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Intern', 'Freelance']
export const EMPLOYEE_STATUSES = ['Active', 'Probation', 'OnLeave', 'Suspended', 'Resigned', 'Terminated']
export const GENDERS = ['Male', 'Female', 'Other', 'PreferNotToSay']
export const PAYROLL_BASES = ['Fixed', 'Hourly', 'Daily']
export const CONTRACT_TYPES = ['Permanent', 'Fixed-Term', 'Probation', 'Part-Time', 'Internship']
export const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP']

export const EMPTY_EMPLOYEE: EmployeeForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  personalEmail: "",
  phoneNumber: "",
  nationalIdNumber: "",
  tinNumber: "",
  bankAccountNumber: "",
  bankAccountHolderName: "",
  bankAccountType: "",
  bankBranchId: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  address: "",
  branchId: "",
  departmentId: "",
  designationId: "",
  managerId: "",
  joinDate: new Date().toISOString().split("T")[0],
  terminationDate: "",
  employmentType: "FullTime",
  status: "Active",
  notes: "",
  crewId: "",
  groupId: "",
};

export const EMPTY_CONTRACT: ContractForm = {
  contractType: 'Permanent', payrollBasis: 'Fixed',
  basicSalary: '', hourlyRate: '', dailyRate: '',
  allowances: '0', currency: 'LKR',
  absentDeductionAfterDays: '0', lateDeductionPerMinute: '0',
  overtimeRateMultiplier: '1.5',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '', notes: '',
}

export const STATUS_COLORS: Record<string, string> = {
  Active:     'xp-badge-success',
  Probation:  'xp-badge-info',
  OnLeave:    'xp-badge-warning',
  Suspended:  'xp-badge-warning',
  Resigned:   'xp-badge-neutral',
  Terminated: 'xp-badge-danger',
}
