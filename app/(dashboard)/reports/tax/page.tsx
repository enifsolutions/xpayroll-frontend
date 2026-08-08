'use client';

// app/(dashboard)/reports/tax/page.tsx — APIT Tax Reports Hub

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { useAuthStore } from '@/store/authStore';

function getYearOptions(): string[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear  = now.getFullYear();
  // If before April, the current tax year started last year
  const latestStart  = currentMonth >= 4 ? currentYear : currentYear - 1;
  return [0, 1, 2].map((i) => `${latestStart - i}/${latestStart - i + 1}`);
}

const REPORTS = [
  {
    key: 'schedule01',
    title: 'Schedule 01',
    description: 'Regular employment income — employees with APIT deducted.',
    color: 'text-indigo-600',
    bg:    'bg-indigo-50',
  },
  {
    key: 'schedule02',
    title: 'Schedule 02',
    description: 'Once-and-for-all payments — terminal benefits and gratuity.',
    color: 'text-rose-600',
    bg:    'bg-rose-50',
  },
  {
    key: 'schedule03',
    title: 'Schedule 03',
    description: 'Employees below APIT threshold — no deduction made.',
    color: 'text-amber-600',
    bg:    'bg-amber-50',
  },
  {
    key: 'monthly-summary',
    title: 'Monthly APIT Summary',
    description: 'Month-by-month APIT deduction and IRD remittance schedule.',
    color: 'text-emerald-600',
    bg:    'bg-emerald-50',
  },
  {
    key: 't10',
    title: 'T10 Certificates',
    description: 'Individual APIT deduction certificates issued to employees.',
    color: 'text-purple-600',
    bg:    'bg-purple-50',
  },
];

export default function TaxReportsHubPage() {
  useRequirePermission("Tax.Reports.View");

  const router     = useRouter();
  const userId = useAuthStore((s) => s.user?.userId);
  const yearOptions = getYearOptions();

  const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
  const [generating,   setGenerating]   = useState(false);

  async function generate() {
    if (!userId) return; // guard — user not loaded yet
    setGenerating(true);
    try {
      const startYear = parseInt(selectedYear.split("/")[0]);
      await api.post("tax-reports/generate", {
        year: startYear,
        userId: parseInt(userId),
      });
      showSuccess(`Tax summary generated for ${selectedYear}.`);
    } catch (err:any) {
      showError(
        "Generate failed",
        err?.response?.data?.error ?? "Failed to generate tax summary.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function open(reportKey: string) {
    router.push(`/reports/tax/${selectedYear.replace(/\//g, '-')}/${reportKey}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">APIT Tax Reports</h3>
        <p className="text-sm text-gray-500">
          Annual Statement of Employer — IRD Sri Lanka
        </p>
      </div>

      {/* Year selector + Generate */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="form-label mb-0 whitespace-nowrap">Assessment Year</label>
            <select
              className="input w-48"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm flex items-center gap-2"
              onClick={generate}
              disabled={generating}
            >
              {generating
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <RefreshCw size={15} />}
              Generate / Refresh Summary
            </button>
            <p className="text-xs text-gray-400">
              Run this once per year (or after new payroll runs are approved) to aggregate data.
            </p>
          </div>
        </div>
      </div>

      {/* Report cards */}
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
