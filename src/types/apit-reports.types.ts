// src/types/apit-reports.types.ts

export interface ApitSchedule01Row {
  rowNum: number;
  employeeCode: string;
  employeeName: string;
  nicNumber: string;
  tinNumber: string;
  employmentType: string;
  designation: string;
  joinDate: string | null;
  terminationDate: string | null;
  grossRemuneration: number;
  exemptRemuneration: number;
  apitPrimary: number;
  apitSecondary: number;
  taxableRemuneration: number;
  taxRemitted: number;
}

export interface ApitSchedule02Row {
  rowNum: number;
  employeeCode: string;
  employeeName: string;
  nicNumber: string;
  tinNumber: string;
  terminationDate: string | null;
  terminalBenefitAmount: number;
  terminalBenefitTax: number;
  taxRemitted: number;
}

export interface ApitSchedule03Row {
  rowNum: number;
  employeeCode: string;
  employeeName: string;
  nicNumber: string;
  tinNumber: string;
  employmentType: string;
  joinDate: string | null;
  terminationDate: string | null;
  grossRemuneration: number;
  noApitReason: string;
}

export interface ApitMonthlyRow {
  monthLabel: string;
  periodStart: string;
  periodEnd: string;
  totalGross: number;
  totalApit: number;
  employeeCount: number;
  dueDate: string;
}

export interface T10Row {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  nicNumber: string;
  tinNumber: string;
  designation: string;
  joinDate: string | null;
  terminationDate: string | null;
  grossRemuneration: number;
  exemptRemuneration: number;
  taxableRemuneration: number;
  apitDeducted: number;
  taxRemitted: number;
}
