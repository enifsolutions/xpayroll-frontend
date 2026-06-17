'use client';

// app/(dashboard)/transactions/reports/page.tsx

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight } from 'lucide-react';
import api from '@/lib/axios';
import { showError } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import type { PayrollRunOption } from '@/types/payroll-reports.types';

const REPORTS = [
  {
    key: 'print-log',
    title: 'Payroll Print Log',
    description: 'Full payslip summary — basic, allowances, gross, deductions, net pay per employee.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    key: 'epf-cform',
    title: 'EPF C-Form',
    description: "Employees' Provident Fund contribution schedule — employee 8%, employer 12%.",
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    key: 'etf-return',
    title: 'ETF Return',
    description: "Employees' Trust Fund employer contribution return — 3% per employee.",
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

export default function ReportsHubPage() {
  useRequirePermission('Payroll.Reports.View');

  const router      = useRouter();
  const initialized = useRef(false);

  const [runs,     setRuns]     = useState<PayrollRunOption[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    try {
      const res = await api.get('payroll-runs');
      const approved = (res.data as PayrollRunOption[]).filter(
        (r) => r.status === 'Approved' || r.status === 'Processed'
      );
      setRuns(approved);
      if (approved.length > 0) setSelected(approved[0].id);
    } catch {
      showError('Failed to load payroll runs.');
    } finally {
      setLoading(false);
    }
  }

  const selectedRun = runs.find((r) => r.id === selected);

  function open(reportKey: string) {
    if (!selected) return;
    router.push(`/transactions/reports/${selected}/${reportKey}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Payroll Reports</h3>
        <p className="text-sm text-gray-500">Select a payroll run then open any report.</p>
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="form-label mb-0 whitespace-nowrap">Payroll Run</label>
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full inline-block" />
            ) : (
              <select
                className="input w-full max-w-sm"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {runs.length === 0 && (
                  <option value="">No approved runs available</option>
                )}
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.periodLabel} — {r.status}
                  </option>
                ))}
              </select>
            )}
            {selectedRun && (
              <span className="text-sm text-gray-400">
                {new Date(selectedRun.periodStart).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' → '}
                {new Date(selectedRun.periodEnd).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div
            key={r.key}
            className="card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => open(r.key)}
          >
            <div className="card-body flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-lg ${r.bg} flex items-center justify-center`}>
                <FileText size={20} className={r.color} />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.description}</p>
              </div>
              <button
                className="btn btn-default btn-sm mt-auto flex items-center gap-1 w-fit"
                disabled={!selected}
                onClick={(e) => { e.stopPropagation(); open(r.key); }}
              >
                Open Report <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
