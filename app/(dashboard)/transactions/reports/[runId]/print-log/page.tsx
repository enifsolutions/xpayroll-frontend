'use client';

// app/(dashboard)/transactions/reports/[runId]/print-log/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { PayrollPrintLogRow } from '@/types/payroll-reports.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);

export default function PrintLogPage() {
  useRequirePermission('Payroll.Reports.View');

  const { runId }   = useParams<{ runId: string }>();
  const router      = useRouter();
  const initialized = useRef(false);

  const [rows,       setRows]       = useState<PayrollPrintLogRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`payroll-reports/${runId}/print-log`);
      setRows(res.data);
    } catch (err:any){
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load print log.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await api.get(`payroll-reports/${runId}/print-log/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `PayrollPrintLog_${runId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('PDF downloaded.');
    } catch (err:any){
      showError(
        "Generate failed",
        err?.response?.data?.error ?? "Failed to generate PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  }

  const totals = {
    basic:      rows.reduce((a, r) => a + r.basicSalary,     0),
    allowances: rows.reduce((a, r) => a + r.totalAllowances, 0),
    gross:      rows.reduce((a, r) => a + r.grossSalary,     0),
    epf:        rows.reduce((a, r) => a + r.epfEmployee,     0),
    paye:       rows.reduce((a, r) => a + r.payeTax,         0),
    deductions: rows.reduce((a, r) => a + r.totalDeductions, 0),
    net:        rows.reduce((a, r) => a + r.netSalary,       0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-lg font-semibold">Payroll Print Log</h3>
            <p className="text-sm text-gray-500">Run ID: {runId} &mdash; {rows.length} employees</p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm flex items-center gap-2"
          onClick={downloadPdf}
          disabled={pdfLoading || rows.length === 0}
        >
          {pdfLoading
            ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            : <Download size={15} />}
          Download PDF
        </button>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Gross',      value: totals.gross },
            { label: 'Total Deductions', value: totals.deductions },
            { label: 'Total Net Pay',    value: totals.net,  highlight: true },
            { label: 'Total PAYE Tax',   value: totals.paye },
          ].map((s) => (
            <div key={s.label} className={`card ${s.highlight ? 'bg-indigo-50 border-indigo-100' : ''}`}>
              <div className="card-body py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-base font-semibold mt-0.5 ${s.highlight ? 'text-indigo-700' : ''}`}>{fmt(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No payslips found for this run.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full text-sm">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Code</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th className="text-right">Basic</th>
                    <th className="text-right">Allowances</th>
                    <th className="text-right">Gross</th>
                    <th className="text-right">EPF (Emp)</th>
                    <th className="text-right">PAYE Tax</th>
                    <th className="text-right">Deductions</th>
                    <th className="text-right">Net Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.payslipId}>
                      <td className="text-gray-400 text-xs">{i + 1}</td>
                      <td className="font-mono text-xs">{row.employeeCode}</td>
                      <td className="font-medium">{row.employeeName}</td>
                      <td className="text-gray-500 text-xs">{row.department}</td>
                      <td className="text-gray-500 text-xs">{row.designation}</td>
                      <td className="text-right">{fmt(row.basicSalary)}</td>
                      <td className="text-right">{fmt(row.totalAllowances)}</td>
                      <td className="text-right">{fmt(row.grossSalary)}</td>
                      <td className="text-right">{fmt(row.epfEmployee)}</td>
                      <td className="text-right">{fmt(row.payeTax)}</td>
                      <td className="text-right">{fmt(row.totalDeductions)}</td>
                      <td className="text-right font-semibold text-indigo-700">{fmt(row.netSalary)}</td>
                      <td>
                        <span className={`xp-badge ${row.status === 'Generated' ? 'xp-badge-success' : 'xp-badge-info'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50 text-sm">
                    <td colSpan={5} className="text-right text-gray-500 pr-3">Totals</td>
                    <td className="text-right">{fmt(totals.basic)}</td>
                    <td className="text-right">{fmt(totals.allowances)}</td>
                    <td className="text-right">{fmt(totals.gross)}</td>
                    <td className="text-right">{fmt(totals.epf)}</td>
                    <td className="text-right">{fmt(totals.paye)}</td>
                    <td className="text-right">{fmt(totals.deductions)}</td>
                    <td className="text-right text-indigo-700">{fmt(totals.net)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
