'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { ApitMonthlyRow } from '@/types/apit-reports.types';

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });

export default function MonthlySummaryPage() {
  usePermission('Tax.Reports.View');
  const { assessmentYear } = useParams<{ assessmentYear: string }>();
  const year = assessmentYear.replace(/-/g, '/');
  const router = useRouter();
  const initialized = useRef(false);

  const [rows,       setRows]       = useState<ApitMonthlyRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setLoading(true);
    api.get(`tax-reports/${year.replace(/\//g, '-')}/monthly-summary`).then(r => setRows(r.data)).catch(() => showError('Failed to load.')).finally(() => setLoading(false));
  }, []);

  async function dl(type: 'pdf'|'excel', setF: (v:boolean)=>void, ext: string, mime: string) {
    setF(true);
    try {
      const res = await api.get(`tax-reports/${year.replace(/\//g, '-')}/monthly-summary/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a'); a.href = url; a.download = `APIT_Monthly_${year}.${ext}`; a.click(); URL.revokeObjectURL(url);
      showSuccess('Downloaded.');
    } catch { showError('Download failed.'); } finally { setF(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}><ArrowLeft size={18} /></button>
          <div>
            <h3 className="text-lg font-semibold">Monthly APIT Payment Summary</h3>
            <p className="text-sm text-gray-500">Assessment Year: {year} — {rows.length} months</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-default btn-sm flex items-center gap-2" onClick={() => dl('excel', setXlsLoading, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')} disabled={xlsLoading || rows.length === 0}>
            {xlsLoading ? <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" /> : <FileSpreadsheet size={15} />} Excel
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => dl('pdf', setPdfLoading, 'pdf', 'application/pdf')} disabled={pdfLoading || rows.length === 0}>
            {pdfLoading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Download size={15} />} PDF
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="card"><div className="card-body py-3"><p className="text-xs text-gray-500">Total Gross</p><p className="text-base font-semibold">{fmt(rows.reduce((a,r)=>a+r.totalGross,0))}</p></div></div>
          <div className="card bg-emerald-50 border-emerald-100"><div className="card-body py-3"><p className="text-xs text-gray-500">Total APIT</p><p className="text-base font-semibold text-emerald-700">{fmt(rows.reduce((a,r)=>a+r.totalApit,0))}</p></div></div>
          <div className="card"><div className="card-body py-3"><p className="text-xs text-gray-500">Months Processed</p><p className="text-base font-semibold">{rows.length}</p></div></div>
        </div>
      )}

      <div className="card"><div className="card-body p-0">
        {loading ? <div className="flex justify-center py-12"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
        : rows.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No payroll data found for this assessment year.</div>
        : <div className="overflow-x-auto">
          <table className="table-default table-hover w-full text-sm">
            <thead><tr>
              <th>Month</th><th>Period Start</th><th>Period End</th>
              <th className="text-right">Total Gross</th><th className="text-right">APIT Deducted</th>
              <th className="text-right">Employees</th><th>IRD Due Date</th>
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}>
                <td className="font-medium">{r.monthLabel.trim()}</td>
                <td className="text-xs">{fmtDate(r.periodStart)}</td>
                <td className="text-xs">{fmtDate(r.periodEnd)}</td>
                <td className="text-right">{fmt(r.totalGross)}</td>
                <td className="text-right font-semibold text-emerald-700">{fmt(r.totalApit)}</td>
                <td className="text-right">{r.employeeCount}</td>
                <td className="text-xs">{fmtDate(r.dueDate)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="font-semibold bg-gray-50 text-sm">
              <td colSpan={3} className="text-right text-gray-500 pr-3">Totals</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.totalGross,0))}</td>
              <td className="text-right text-emerald-700">{fmt(rows.reduce((a,r)=>a+r.totalApit,0))}</td>
              <td colSpan={2} />
            </tr></tfoot>
          </table>
        </div>}
      </div></div>
    </div>
  );
}
