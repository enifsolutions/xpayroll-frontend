'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { ApitSchedule03Row } from '@/types/apit-reports.types';

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const reasonLabel = (r: string) => r === 'LT' ? 'Below Threshold' : r === 'EX' ? 'Exempt Income' : r || 'Below Threshold';

export default function Schedule03Page() {
  usePermission('Tax.Reports.View');
  const { assessmentYear } = useParams<{ assessmentYear: string }>();
  const year = assessmentYear.replace(/-/g, '/');
  const router = useRouter();
  const initialized = useRef(false);

  const [rows,       setRows]       = useState<ApitSchedule03Row[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setLoading(true);
    api.get(`tax-reports/${year.replace(/\//g, '-')}/schedule03`).then(r => setRows(r.data)).catch(() => showError('Failed to load.')).finally(() => setLoading(false));
  }, []);

  async function dl(type: 'pdf'|'excel', setF: (v:boolean)=>void, ext: string, mime: string) {
    setF(true);
    try {
      const res = await api.get(`tax-reports/${year.replace(/\//g, '-')}/schedule03/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a'); a.href = url; a.download = `APIT_Schedule03_${year}.${ext}`; a.click(); URL.revokeObjectURL(url);
      showSuccess('Downloaded.');
    } catch { showError('Download failed.'); } finally { setF(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}><ArrowLeft size={18} /></button>
          <div>
            <h3 className="text-lg font-semibold">Schedule 03 — Below APIT Threshold</h3>
            <p className="text-sm text-gray-500">Assessment Year: {year} — {rows.length} employees</p>
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

      <div className="card"><div className="card-body p-0">
        {loading ? <div className="flex justify-center py-12"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
        : rows.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No employees below threshold for this year.</div>
        : <div className="overflow-x-auto">
          <table className="table-default table-hover w-full text-sm">
            <thead><tr>
              <th>#</th><th>Code</th><th>Employee Name</th><th>NIC</th><th>TIN</th>
              <th>Emp Type</th><th>Joined</th><th>Left</th>
              <th className="text-right">Gross Remuneration</th><th>Reason</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.rowNum}>
                <td className="text-gray-400 text-xs">{r.rowNum}</td>
                <td className="font-mono text-xs">{r.employeeCode}</td>
                <td className="font-medium">{r.employeeName}</td>
                <td className="font-mono text-xs">{r.nicNumber || '—'}</td>
                <td className="font-mono text-xs">{r.tinNumber || '—'}</td>
                <td className="text-xs text-gray-500">{r.employmentType}</td>
                <td className="text-xs">{fmtDate(r.joinDate)}</td>
                <td className="text-xs">{fmtDate(r.terminationDate)}</td>
                <td className="text-right">{fmt(r.grossRemuneration)}</td>
                <td><span className="xp-badge xp-badge-warning">{reasonLabel(r.noApitReason)}</span></td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="font-semibold bg-gray-50 text-sm">
              <td colSpan={8} className="text-right text-gray-500 pr-3">Total Gross</td>
              <td className="text-right">{fmt(rows.reduce((a,r)=>a+r.grossRemuneration,0))}</td>
              <td />
            </tr></tfoot>
          </table>
        </div>}
      </div></div>
    </div>
  );
}
