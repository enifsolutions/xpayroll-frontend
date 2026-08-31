import api from "@/lib/axios";
import { PayrollRun, Payslip, PayslipLineItem } from "@/types/payroll.types";

/** Result of processing a payroll run. A run can succeed while still skipping
 *  employees that failed validation, so Success and ErrorCount are separate. */
export interface ProcessPayrollRunResult {
  success: boolean;
  errorCount: number;
  message: string;
}

export interface PayrollRunError {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  errorCode: string;
  errorMessage: string;
  errorDetail: string | null;
  createdAt: string;
}

export const payrollService = {
  getAll: (status?: string) =>
    api
      .get<PayrollRun[]>("/payroll-runs", { params: { status } })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<PayrollRun>(`/payroll-runs/${id}`).then((r) => r.data),

  create: (body: {
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    notes?: string;
    actionBy: string;
  }) => api.post<{ runId: string }>("/payroll-runs", body).then((r) => r.data),

  process: (id: string, actionBy: string) =>
    api
      .post<ProcessPayrollRunResult>(`/payroll-runs/${id}/process`, null, {
        params: { actionBy },
      })
      .then((r) => r.data),

  getErrors: (runId: string) =>
    api
      .get<PayrollRunError[]>(`/payroll-runs/${runId}/errors`)
      .then((r) => r.data),

  action: (id: string, action: string, actionBy: string) =>
    api.post(`/payroll-runs/${id}/action`, { id, action, actionBy }),

  getPayslips: (runId: string) =>
    api.get<Payslip[]>(`/payroll-runs/${runId}/payslips`).then((r) => r.data),

  getLineItems: (payslipId: string) =>
    api
      .get<PayslipLineItem[]>(`/payroll-runs/payslips/${payslipId}/line-items`)
      .then((r) => r.data),
};
