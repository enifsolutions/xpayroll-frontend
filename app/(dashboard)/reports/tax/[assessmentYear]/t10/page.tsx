'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from "@/hooks/usePermission";
import type { T10Row } from '@/types/apit-reports.types';

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function T10Page() {
  usePermission('Tax.Reports.View');
  const { assessmentYear } = useParams<{ assessmentYear: string }>();
  const year = assessmentYear.replace(/-/g, '/');
  const router = useRouter();
  const initialized = useRef(false);

  const [rows,          setRows]          = useState<T10Row[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [downloading,   setDownloading]   = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setLoading(true);
    api.get(`tax-reports/${year.replace(/\//g, '-')}/t10`).then(r => setRows(r.data)).catch(() => showError('Failed to load.')).finally(() => setLoading(false));
  }, []);

  async function downloadT10(employeeId: string, employeeCode: string) {
    setDownloading(employeeId);
    try {
      const res = await api.get(`tax-reports/${year.replace(/\//g, '-')}/t10/${employeeId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `T10_${employeeCode}_${year}.pdf`; a.click();
      URL.revokeObjectURL(url); showSuccess(`T10 for ${employeeCode} downloaded.`);
    } catch { showError('Download failed.'); } finally { setDownloading(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}><ArrowLeft size={18} /></button>
          <div>
            <h3 className="text-lg font-semibold">T10 Certificates</h3>
            <p className="text-sm text-gray-500">Assessment Year: {year} — {rows.length} employees</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">Download individual T10 per employee using the button on each row.</p>
      </div>

      <div className="card"><div className="card-body p-0">
        {loading ? <div className="flex justify-center py-12"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
        : rows.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No T10 data found. Generate the tax summary first.</div>
        : <div className="overflow-x-auto">
          <table className="table-default table-hover w-full text-sm">
            <thead><tr>
              <th>Code</th><th>Employee Name</th><th>NIC</th><th>Designation</th>
              <th className="text-right">Gross</th><th className="text-right">Exempt</th>
              <th className="text-right">Taxable</th><th className="text-right">APIT</th>
              <th className="text-right">Remitted</th><th>T10</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.employeeId}>
                <td className="font-mono text-xs">{r.employeeCode}</td>
                <td className="font-medium">{r.employeeName}</td>
                <td className="font-mono text-xs">{r.nicNumber || '—'}</td>
                <td className="text-xs text-gray-500">{r.designation || '—'}</td>
                <td className="text-right">{fmt(r.grossRemuneration)}</td>
                <td className="text-right">{fmt(r.exemptRemuneration)}</td>
                <td className="text-right">{fmt(r.taxableRemuneration)}</td>
                <td className="text-right font-semibold text-purple-700">{fmt(r.apitDeducted)}</td>
                <td className="text-right">{fmt(r.taxRemitted)}</td>
                <td>
                  <button
                    className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600"
                    title={`Download T10 for ${r.employeeName}`}
                    onClick={() => downloadT10(r.employeeId, r.employeeCode)}
                    disabled={downloading === r.employeeId}
                  >
                    {downloading === r.employeeId
                      ? <span className="animate-spin inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                      : <FileText size={15} />}
                  </button>
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="font-semibold bg-gray-50 text-sm">
              <td colSpan={4} className="text-right text-gray-500 pr-3">Totals</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.grossRemuneration,0))}</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.exemptRemuneration,0))}</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.taxableRemuneration,0))}</td>
              <td className="text-right text-purple-700">{fmt(rows.reduce((a,r)=>a+r.apitDeducted,0))}</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.taxRemitted,0))}</td>
              <td />
            </tr></tfoot>
          </table>
        </div>}
      </div></div>
    </div>
  );
}
