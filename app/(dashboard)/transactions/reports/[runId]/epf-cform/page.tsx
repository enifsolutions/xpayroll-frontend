'use client';

// app/(dashboard)/transactions/reports/[runId]/epf-cform/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { StatutoryContributionRow } from '@/types/payroll-reports.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);

export default function EpfCFormPage() {
  useRequirePermission('Payroll.Reports.View');

  const { runId }   = useParams<{ runId: string }>();
  const router      = useRouter();
  const initialized = useRef(false);

  const [rows,       setRows]       = useState<StatutoryContributionRow[]>([]);
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
      const res = await api.get(`payroll-reports/${runId}/statutory`);
      setRows(res.data);
    } catch  (err:any){
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load EPF data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await api.get(`payroll-reports/${runId}/epf-cform/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `EPF_CForm_${runId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('EPF C-Form PDF downloaded.');
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
    gross:       rows.reduce((a, r) => a + r.grossSalary,  0),
    epfEmployee: rows.reduce((a, r) => a + r.epfEmployee,  0),
    epfEmployer: rows.reduce((a, r) => a + r.epfEmployer,  0),
    epfTotal:    rows.reduce((a, r) => a + r.epfTotal,     0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-lg font-semibold">EPF Contribution Schedule — Form C</h3>
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
          Download EPF C-Form
        </button>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Gross Wages',           value: totals.gross },
            { label: 'Employee Contribution (8%)',  value: totals.epfEmployee },
            { label: 'Employer Contribution (12%)', value: totals.epfEmployer },
            { label: 'Total EPF Payable',           value: totals.epfTotal, highlight: true },
          ].map((s) => (
            <div key={s.label} className={`card ${s.highlight ? 'bg-emerald-50 border-emerald-100' : ''}`}>
              <div className="card-body py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-base font-semibold mt-0.5 ${s.highlight ? 'text-emerald-700' : ''}`}>{fmt(s.value)}</p>
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
            <div className="text-center py-12 text-gray-400 text-sm">No data found for this run.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full text-sm">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Emp No</th>
                    <th>Employee Name</th>
                    <th>NIC No</th>
                    <th>Department</th>
                    <th className="text-right">Gross Wages</th>
                    <th className="text-right">Employee 8%</th>
                    <th className="text-right">Employer 12%</th>
                    <th className="text-right">Total EPF</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.payslipId}>
                      <td className="text-gray-400 text-xs">{i + 1}</td>
                      <td className="font-mono text-xs">{row.employeeCode}</td>
                      <td className="font-medium">{row.employeeName}</td>
                      <td className="font-mono text-xs">{row.nicNumber || '—'}</td>
                      <td className="text-gray-500 text-xs">{row.department}</td>
                      <td className="text-right">{fmt(row.grossSalary)}</td>
                      <td className="text-right">{fmt(row.epfEmployee)}</td>
                      <td className="text-right">{fmt(row.epfEmployer)}</td>
                      <td className="text-right font-semibold text-emerald-700">{fmt(row.epfTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50 text-sm">
                    <td colSpan={5} className="text-right text-gray-500 pr-3">Totals</td>
                    <td className="text-right">{fmt(totals.gross)}</td>
                    <td className="text-right">{fmt(totals.epfEmployee)}</td>
                    <td className="text-right">{fmt(totals.epfEmployer)}</td>
                    <td className="text-right text-emerald-700">{fmt(totals.epfTotal)}</td>
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
