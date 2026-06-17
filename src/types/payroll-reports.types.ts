// src/types/payroll-reports.types.ts

export interface PayrollPrintLogRow {
  payslipId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
  epfEmployee: number;
  payeTax: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
}

export interface StatutoryContributionRow {
  payslipId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  nicNumber: string;
  department: string;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  epfTotal: number;
  etfEmployer: number;
}

export interface PayrollRunOption {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}
