'use client';

// app/(dashboard)/transactions/reports/[runId]/etf-return/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { StatutoryContributionRow } from '@/types/payroll-reports.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);

export default function EtfReturnPage() {
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
    } catch {
      showError('Failed to load ETF data.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await api.get(`payroll-reports/${runId}/etf-return/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `ETF_Return_${runId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('ETF Return PDF downloaded.');
    } catch {
      showError('Failed to generate PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  const totals = {
    gross: rows.reduce((a, r) => a + r.grossSalary, 0),
    etf:   rows.reduce((a, r) => a + r.etfEmployer, 0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-lg font-semibold">ETF Employer Contribution Return</h3>
            <p className="text-sm text-gray-500">Run ID: {runId} &mdash; {rows.length} employees &mdash; 3% employer contribution</p>
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
          Download ETF Return
        </button>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Gross Wages',      value: totals.gross,    isCount: false },
            { label: 'Total Employees',        value: rows.length,     isCount: true  },
            { label: 'Total ETF Payable (3%)', value: totals.etf,      isCount: false, highlight: true },
          ].map((s) => (
            <div key={s.label} className={`card ${s.highlight ? 'bg-amber-50 border-amber-100' : ''}`}>
              <div className="card-body py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-base font-semibold mt-0.5 ${s.highlight ? 'text-amber-700' : ''}`}>
                  {s.isCount ? s.value : fmt(s.value as number)}
                </p>
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
                    <th className="text-right">ETF 3% (LKR)</th>
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
                      <td className="text-right font-semibold text-amber-700">{fmt(row.etfEmployer)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50 text-sm">
                    <td colSpan={5} className="text-right text-gray-500 pr-3">Totals</td>
                    <td className="text-right">{fmt(totals.gross)}</td>
                    <td className="text-right text-amber-700">{fmt(totals.etf)}</td>
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
