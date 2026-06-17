'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { ApitSchedule01Row } from '@/types/apit-reports.types';

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Schedule01Page() {
  usePermission('Tax.Reports.View');
  const { assessmentYear } = useParams<{ assessmentYear: string }>();
  const year    = decodeURIComponent(assessmentYear);
  const router  = useRouter();
  const initialized = useRef(false);

  const [rows,       setRows]       = useState<ApitSchedule01Row[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`tax-reports/${year.replace(/\//g, '-')}/schedule01`);
      setRows(res.data);
    } catch { showError('Failed to load Schedule 01 data.'); }
    finally { setLoading(false); }
  }

  async function download(type: 'pdf' | 'excel', setF: (v: boolean) => void, ext: string, mime: string) {
    setF(true);
    try {
      const res = await api.get(`tax-reports/${year.replace(/\//g, '-')}/schedule01/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a'); a.href = url;
      a.download = `APIT_Schedule01_${year}.${ext}`; a.click();
      URL.revokeObjectURL(url); showSuccess(`${ext.toUpperCase()} downloaded.`);
    } catch { showError('Download failed.'); }
    finally { setF(false); }
  }

  const totals = {
    gross:   rows.reduce((a, r) => a + r.grossRemuneration,   0),
    exempt:  rows.reduce((a, r) => a + r.exemptRemuneration,  0),
    taxable: rows.reduce((a, r) => a + r.taxableRemuneration, 0),
    pri:     rows.reduce((a, r) => a + r.apitPrimary,         0),
    sec:     rows.reduce((a, r) => a + r.apitSecondary,       0),
    remit:   rows.reduce((a, r) => a + r.taxRemitted,         0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-lg font-semibold">Schedule 01 — Regular Employment Income</h3>
            <p className="text-sm text-gray-500">Assessment Year: {year} — {rows.length} employees with APIT deducted</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-default btn-sm flex items-center gap-2"
            onClick={() => download('excel', setXlsLoading, 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            disabled={xlsLoading || rows.length === 0}>
            {xlsLoading ? <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" /> : <FileSpreadsheet size={15} />}
            Excel
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2"
            onClick={() => download('pdf', setPdfLoading, 'pdf', 'application/pdf')}
            disabled={pdfLoading || rows.length === 0}>
            {pdfLoading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Download size={15} />}
            PDF
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Gross Remuneration',   value: totals.gross,   hi: false },
            { label: 'Total Exempt Remuneration',  value: totals.exempt,  hi: false },
            { label: 'Total APIT Deducted',        value: totals.pri + totals.sec, hi: true },
            { label: 'Total Tax Remitted',         value: totals.remit,   hi: false },
          ].map((s) => (
            <div key={s.label} className={`card ${s.hi ? 'bg-indigo-50 border-indigo-100' : ''}`}>
              <div className="card-body py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-base font-semibold mt-0.5 ${s.hi ? 'text-indigo-700' : ''}`}>{fmt(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12"><span className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No data found. Generate the tax summary first from the hub page.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th><th>Code</th><th>Employee Name</th><th>NIC</th><th>TIN</th>
                    <th>Emp Type</th><th>Designation</th><th>Joined</th><th>Left</th>
                    <th className="text-right">Gross</th><th className="text-right">Exempt</th>
                    <th className="text-right">APIT (Pri)</th><th className="text-right">APIT (Sec)</th>
                    <th className="text-right">Taxable</th><th className="text-right">Remitted</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNum}>
                      <td className="text-gray-400 text-xs">{r.rowNum}</td>
                      <td className="font-mono text-xs">{r.employeeCode}</td>
                      <td className="font-medium">{r.employeeName}</td>
                      <td className="font-mono text-xs">{r.nicNumber || '—'}</td>
                      <td className="font-mono text-xs">{r.tinNumber || '—'}</td>
                      <td className="text-xs text-gray-500">{r.employmentType}</td>
                      <td className="text-xs text-gray-500">{r.designation}</td>
                      <td className="text-xs">{fmtDate(r.joinDate)}</td>
                      <td className="text-xs">{fmtDate(r.terminationDate)}</td>
                      <td className="text-right">{fmt(r.grossRemuneration)}</td>
                      <td className="text-right">{fmt(r.exemptRemuneration)}</td>
                      <td className="text-right">{fmt(r.apitPrimary)}</td>
                      <td className="text-right">{fmt(r.apitSecondary)}</td>
                      <td className="text-right">{fmt(r.taxableRemuneration)}</td>
                      <td className="text-right font-semibold text-indigo-700">{fmt(r.taxRemitted)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50 text-sm">
                    <td colSpan={9} className="text-right text-gray-500 pr-3">Totals</td>
                    <td className="text-right">{fmt(totals.gross)}</td>
                    <td className="text-right">{fmt(totals.exempt)}</td>
                    <td className="text-right">{fmt(totals.pri)}</td>
                    <td className="text-right">{fmt(totals.sec)}</td>
                    <td className="text-right">{fmt(totals.taxable)}</td>
                    <td className="text-right text-indigo-700">{fmt(totals.remit)}</td>
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
