"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, X } from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { payrollService } from "@/components/payroll/payrollService";
import { Payslip, PayslipLineItem, PayrollRun } from "@/types/payroll.types";
import { showError } from "@/lib/toast";
import Button from "@/components/ui/Button";

function fmt(n: number) {
  return n.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  Earning: "text-green-600",
  Benefit: "text-blue-600",
  Statutory: "text-orange-600",
  Deduction: "text-red-500",
  Loan: "text-purple-600",
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Draft: "xp-badge xp-badge-neutral",
    Processing: "xp-badge xp-badge-warning",
    Completed: "xp-badge xp-badge-info",
    Approved: "xp-badge xp-badge-success",
    Cancelled: "xp-badge xp-badge-danger",
  };
  return map[status] ?? "xp-badge xp-badge-neutral";
};

export default function PayslipListPage() {
  useRequirePermission("Payroll.Payslip.ViewAll");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const initialized = useRef(false);

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<Payslip | null>(null);
  const [lineItems, setLineItems] = useState<PayslipLineItem[]>([]);
  const [liLoading, setLiLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setLoading(true);
    Promise.all([payrollService.getById(id), payrollService.getPayslips(id)])
      .then(([r, ps]) => {
        setRun(r);
        setPayslips(ps);
      })
      .catch(() => showError("Error", "Failed to load payroll run"))
      .finally(() => setLoading(false));
  }, [id]);

  const openDrawer = async (ps: Payslip) => {
    setSelected(ps);
    setLineItems([]);
    setLiLoading(true);
    try {
      setLineItems(await payrollService.getLineItems(ps.id));
    } catch {
      showError("Error", "Failed to load line items");
    } finally {
      setLiLoading(false);
    }
  };

  const earnings = lineItems.filter(
    (li) => li.category === "Earning" || li.category === "Benefit",
  );
  const deductions = lineItems.filter(
    (li) => li.category !== "Earning" && li.category !== "Benefit",
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            onClick={() => router.push("/transactions/payroll-runs")}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {run?.periodLabel ?? "Payslips"}
              {run && (
                <span className={statusBadge(run.status)}>{run.status}</span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {run?.periodStart} to {run?.periodEnd} &middot; {payslips.length}{" "}
              employees
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Gross",
            value: run?.totalGross ?? 0,
            cls: "text-gray-800 dark:text-gray-100",
          },
          {
            label: "Total Deductions",
            value: run?.totalDeductions ?? 0,
            cls: "text-red-500",
          },
          {
            label: "Net Payable",
            value: run?.totalNet ?? 0,
            cls: "text-green-600",
          },
        ].map((c) => (
          <div key={c.label} className="card">
            <div className="card-body">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-xl font-bold font-mono ${c.cls}`}>
                LKR {fmt(c.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Payslips Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">Allowances</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">EPF (Ee)</th>
                  <th className="text-right">PAYE</th>
                  <th className="text-right">Net</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      No payslips generated yet.
                    </td>
                  </tr>
                ) : (
                  payslips.map((ps) => (
                    <tr
                      key={ps.id}
                      className="cursor-pointer"
                      onClick={() => openDrawer(ps)}
                    >
                      <td>
                        <div className="font-medium">{ps.fullName}</div>
                        <div className="text-xs text-gray-400">
                          {ps.employeeCode}
                        </div>
                      </td>
                      <td className="text-right font-mono text-sm">
                        {fmt(ps.basicSalary)}
                      </td>
                      <td className="text-right font-mono text-sm">
                        {fmt(ps.totalAllowances)}
                      </td>
                      <td className="text-right font-mono text-sm font-medium">
                        {fmt(ps.grossSalary)}
                      </td>
                      <td className="text-right font-mono text-sm text-orange-600">
                        {fmt(ps.epfEmployee)}
                      </td>
                      <td className="text-right font-mono text-sm text-orange-600">
                        {fmt(ps.payeTax)}
                      </td>
                      <td className="text-right font-mono text-sm font-semibold text-green-600">
                        {fmt(ps.netSalary)}
                      </td>
                      <td className="text-xs text-primary font-medium">
                        View →
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payslip Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setSelected(null)}
          />
          <div className="w-[480px] bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-semibold">{selected.fullName}</p>
                <p className="text-xs text-gray-400">
                  {selected.employeeCode} &middot; {run?.periodLabel}
                </p>
              </div>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {liLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Stat grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Gross Salary",
                        value: selected.grossSalary,
                        cls: "text-gray-800 dark:text-gray-100",
                      },
                      {
                        label: "Net Salary",
                        value: selected.netSalary,
                        cls: "text-green-600",
                      },
                      {
                        label: "EPF (Employer)",
                        value: selected.epfEmployer,
                        cls: "text-gray-600 dark:text-gray-300",
                      },
                      {
                        label: "ETF (Employer)",
                        value: selected.etfEmployer,
                        cls: "text-gray-600 dark:text-gray-300",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                      >
                        <p className="text-xs text-gray-400 mb-0.5">
                          {s.label}
                        </p>
                        <p
                          className={`font-semibold font-mono text-sm ${s.cls}`}
                        >
                          LKR {fmt(s.value)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Earnings */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Earnings
                      </span>
                    </div>
                    <div className="space-y-1">
                      {earnings.map((li) => (
                        <div
                          key={String(li.id)}
                          className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800"
                        >
                          <span
                            className={`text-sm ${CATEGORY_COLORS[li.category]}`}
                          >
                            {li.label}
                          </span>
                          <span className="text-sm font-mono">
                            LKR {fmt(li.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown size={14} className="text-red-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Deductions
                      </span>
                    </div>
                    <div className="space-y-1">
                      {deductions.map((li) => (
                        <div
                          key={String(li.id)}
                          className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800"
                        >
                          <span
                            className={`text-sm ${CATEGORY_COLORS[li.category]}`}
                          >
                            {li.label}
                          </span>
                          <span className="text-sm font-mono text-red-500">
                            - LKR {fmt(li.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Snapshot */}
                  {selected.attendanceSnapshot && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                        Attendance Summary
                      </p>
                      <div className="space-y-1.5 text-sm">
                        {[
                          {
                            label: "Working Days",
                            value: selected.attendanceSnapshot.working_days,
                          },
                          {
                            label: "Present",
                            value: selected.attendanceSnapshot.present_days,
                          },
                          {
                            label: "Absent",
                            value: selected.attendanceSnapshot.absent_days,
                          },
                          {
                            label: "Late (mins)",
                            value: selected.attendanceSnapshot.late_minutes,
                          },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between">
                            <span className="text-gray-500">{r.label}</span>
                            <span>{r.value}</span>
                          </div>
                        ))}
                        {selected.attendanceSnapshot.absent_deduction > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Absent Deduction</span>
                            <span>
                              - LKR{" "}
                              {fmt(
                                selected.attendanceSnapshot.absent_deduction,
                              )}
                            </span>
                          </div>
                        )}
                        {selected.attendanceSnapshot.late_deduction > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Late Deduction</span>
                            <span>
                              - LKR{" "}
                              {fmt(selected.attendanceSnapshot.late_deduction)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Net total */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      Net Salary
                    </span>
                    <span className="text-lg font-bold font-mono text-green-600">
                      LKR {fmt(selected.netSalary)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="plain"
                className="w-full"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
