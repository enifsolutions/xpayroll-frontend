export interface PayrollRun {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  status: "Draft" | "Processing" | "Completed" | "Approved" | "Cancelled";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  processedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  payeTax: number;
  attendanceSnapshot?: {
    working_days: number;
    present_days: number;
    absent_days: number;
    late_minutes: number;
    absent_deduction: number;
    late_deduction: number;
  };
  status: string;
  generatedAt: string;
}

export interface PayslipLineItem {
  id: string;
  payslipId: string;
  category: "Earning" | "Benefit" | "Statutory" | "Deduction" | "Loan";
  code: string;
  label: string;
  amount: number;
  isTaxable: boolean;
  isPensionable: boolean;
  sortOrder: number;
}
