import api from "@/lib/axios";
import { PayrollRun, Payslip, PayslipLineItem } from "@/types/payroll.types";

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
    api.post(`/payroll-runs/${id}/process`, null, { params: { actionBy } }),

  action: (id: string, action: string, actionBy: string) =>
    api.post(`/payroll-runs/${id}/action`, { id, action, actionBy }),

  getPayslips: (runId: string) =>
    api.get<Payslip[]>(`/payroll-runs/${runId}/payslips`).then((r) => r.data),

  getLineItems: (payslipId: string) =>
    api
      .get<PayslipLineItem[]>(`/payroll-runs/payslips/${payslipId}/line-items`)
      .then((r) => r.data),
};
