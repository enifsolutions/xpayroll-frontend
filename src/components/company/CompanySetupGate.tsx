'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Rocket, HelpCircle, UserCircle } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';
import { showSuccess, showError } from '@/lib/toast';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

// ── Module-level cache ───────────────────────────────────────────────────────
let cachedStatus: 'ready' | 'needs-setup' | null = null;

type CreateCompanyForm = {
  name: string;
  legalName: string;
  registrationNumber: string;
  taxIdentificationNumber: string;
  currency: string;
  countryCode: string;
  timezone: string;
  payrollCycleType: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  financialYearStart: string;
};

const EMPTY_FORM: CreateCompanyForm = {
  name: '',
  legalName: '',
  registrationNumber: '',
  taxIdentificationNumber: '',
  currency: 'LKR',
  countryCode: 'LK',
  timezone: 'Asia/Colombo',
  payrollCycleType: 'Monthly',
  address: '',
  phone: '',
  email: '',
  website: '',
  financialYearStart: '01-01',
};

const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD', 'INR', 'AED'];
const TIMEZONES = [
  'Asia/Colombo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];
const CYCLES = ['Monthly', 'BiMonthly', 'Weekly'];

// ── Local styled primitives — deliberately bypass the shared <Input>/<select>
// styling so this one-time setup screen can have its own softer, editorial
// look without touching global .input / .select classes used everywhere else.
function StyledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldClass =
  'w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-0 px-4 py-3 text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40 transition-shadow';

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldClass} />;
}

function StyledSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── Minimal chrome for the gate screens (the real Topbar/Sidebar don't render
// until setup is complete, so this stands in as a lightweight header/footer)
function GateHeader() {
  return (
    <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <span className="font-serif text-xl font-bold text-blue-700 dark:text-blue-400">
        XpayRoll Pro
      </span>
      <div className="flex items-center gap-3 text-slate-400">
        <HelpCircle size={20} />
        <UserCircle size={20} />
      </div>
    </div>
  );
}

function GateFooter() {
  return (
    <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
      © {new Date().getFullYear()} Miracle IT Solutions (Pvt) Ltd. All rights reserved.
    </div>
  );
}

export default function CompanySetupGate({ children }: { children: React.ReactNode }) {
  const canCreate = usePermission(Permissions.Settings.Company.Create);
  const userId = useAuthStore((s) => s.user?.userId);

  const [status, setStatus] = useState<'loading' | 'ready' | 'needs-setup'>(
    cachedStatus ?? 'loading',
  );
  const [form, setForm] = useState<CreateCompanyForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (cachedStatus) {
      setStatus(cachedStatus);
      return;
    }
    checkCompany();
  }, []);

  async function checkCompany() {
    try {
      const res = await axios.get('/company');
      const ok = !!res.data?.id;
      cachedStatus = ok ? 'ready' : 'needs-setup';
      setStatus(cachedStatus);
    } catch {
      cachedStatus = 'ready';
      setStatus('ready');
    }
  }

  function setField<K extends keyof CreateCompanyForm>(key: K, value: CreateCompanyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      showError('Missing information', 'Company name is required.');
      return;
    }
    setCreating(true);
    try {
      await axios.post('/company/create', {
        name: form.name.trim(),
        legalName: form.legalName.trim() || null,
        registrationNumber: form.registrationNumber.trim() || null,
        taxIdentificationNumber: form.taxIdentificationNumber.trim() || null,
        currency: form.currency,
        countryCode: form.countryCode,
        timezone: form.timezone,
        payrollCycleType: form.payrollCycleType,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        financialYearStart: form.financialYearStart,
        userId: userId,
      });
      showSuccess('Company created', 'Welcome to XpayRoll Pro.');
      cachedStatus = 'ready';
      setStatus('ready');
    } catch (err: any) {
      showError('Failed to create company', err?.response?.data?.error ?? 'Please try again.');
    } finally {
      setCreating(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Blocked — no permission to fix it ──────────────────────────────────
  if (status === 'needs-setup' && !canCreate) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <GateHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={28} className="text-amber-600" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Company Not Set Up Yet
            </h1>
            <p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed">
              This XpayRoll Pro instance hasn't been initialised yet. Please contact your service
              provider to complete the initial company setup before continuing.
            </p>
          </div>
        </div>
        <GateFooter />
      </div>
    );
  }

  // ── Blocking setup form — service provider only ────────────────────────
  if (status === 'needs-setup' && canCreate) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <GateHeader />

        <div className="flex-1 px-6 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <Rocket size={26} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-slate-50">
                  Set Up Your Company
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Complete your organisation's core profile to unlock the full potential of
                  XpayRoll Pro. This runs once to configure your workspace environment.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-8 space-y-7">
              <div className="grid grid-cols-2 gap-6">
                <StyledField label="Company Display Name">
                  <StyledInput
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Miracle IT Solutions"
                  />
                </StyledField>
                <StyledField label="Legal Entity Name">
                  <StyledInput
                    value={form.legalName}
                    onChange={(e) => setField('legalName', e.target.value)}
                    placeholder="Registered legal name"
                  />
                </StyledField>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <StyledField label="Registration Number">
                  <StyledInput
                    value={form.registrationNumber}
                    onChange={(e) => setField('registrationNumber', e.target.value)}
                    placeholder="e.g. PV00231556"
                  />
                </StyledField>
                <StyledField label="Tax ID (TIN)">
                  <StyledInput
                    value={form.taxIdentificationNumber}
                    onChange={(e) => setField('taxIdentificationNumber', e.target.value)}
                    placeholder="Tax identification number"
                  />
                </StyledField>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <StyledField label="Operating Currency">
                  <StyledSelect
                    value={form.currency}
                    onChange={(v) => setField('currency', v)}
                    options={CURRENCIES}
                  />
                </StyledField>
                <StyledField label="Country Code">
                  <StyledInput
                    value={form.countryCode}
                    onChange={(e) => setField('countryCode', e.target.value.toUpperCase())}
                    maxLength={5}
                    placeholder="e.g. LK"
                  />
                </StyledField>
                <StyledField label="Timezone">
                  <StyledSelect
                    value={form.timezone}
                    onChange={(v) => setField('timezone', v)}
                    options={TIMEZONES}
                  />
                </StyledField>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <StyledField label="Payroll Cycle">
                  <StyledSelect
                    value={form.payrollCycleType}
                    onChange={(v) => setField('payrollCycleType', v)}
                    options={CYCLES}
                  />
                </StyledField>
                <StyledField label="Financial Year Start (MM-DD)">
                  <StyledInput
                    value={form.financialYearStart}
                    onChange={(e) => setField('financialYearStart', e.target.value)}
                    placeholder="01-01"
                    maxLength={5}
                  />
                </StyledField>
              </div>

              <StyledField label="Headquarters Address">
                <textarea
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  rows={3}
                  placeholder="Full address"
                  className={`${fieldClass} resize-none`}
                />
              </StyledField>

              <div className="grid grid-cols-2 gap-6">
                <StyledField label="Contact Phone">
                  <StyledInput
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+94 11 000 0000"
                  />
                </StyledField>
                <StyledField label="Corporate Email">
                  <StyledInput
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="info@company.lk"
                  />
                </StyledField>
              </div>

              <StyledField label="Website URL">
                <StyledInput
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                  placeholder="https://company.lk"
                />
              </StyledField>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400">
                  All settings can be modified later in Company Settings.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3 transition-colors"
                >
                  {creating ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
                  ) : (
                    <Rocket size={15} />
                  )}
                  Create Company & Continue
                </button>
              </div>
            </div>
          </div>
        </div>

        <GateFooter />
      </div>
    );
  }

  // ── Ready — render the actual app ──────────────────────────────────────
  return <>{children}</>;
}
