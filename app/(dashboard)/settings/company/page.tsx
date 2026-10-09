"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Settings2,
  CalendarDays,
  Clock3,
  Bell,
  Activity,
  Save,
  Upload,
  X,
  ChevronRight,
  ShieldAlert,
  Rocket,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import Dialog from "@/components/ui/Dialog";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { showSuccess, showError } from "@/lib/toast";
import axios from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CompanySettings {
  id: string;
  // Profile
  name: string;
  legalName: string;
  registrationNumber: string;
  taxIdentificationNumber: string;
  logoUrl: string | null;
  currency: string;
  countryCode: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  isActive: boolean;
  // Payroll & HR
  payrollCycleType: string;
  approvalChainType: string;
  financialYearStart: string;
  attendanceDeductionEnabled: boolean;
  dsrLimitPercent: number;
  tempPasswordExpiryHours: number;
  retirementAge: number;
  // Deduction Rule Defaults & Hierarchy
  defaultAbsentDeductionAfterDays: number;
  defaultLateDeductionPerMinute: number;
  defaultOvertimeRateMultiplier: number;
  absentDeductionSource: string;
  lateDeductionSource: string;
  overtimeMultiplierSource: string;
  // Leave Policy
  leaveYearStartMonth: number;
  leaveCarryForwardEnabled: boolean;
  leaveCarryForwardMaxDays: number;
  leaveAdvanceNoticeDays: number;
  // Notifications
  notifyPayslipEmail: boolean;
  notifyLeaveDecision: boolean;
  notifyAttendanceAlert: boolean;
  notifyLoanApproval: boolean;
  // Recruitment
  offerApprovalEnabled: boolean;
  offerApprovalSalaryThreshold: number | null;
  // Audit
  createdAt: string;
  updatedAt: string | null;
}

interface CreateCompanyForm {
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
}

const EMPTY_CREATE_FORM: CreateCompanyForm = {
  name: "",
  legalName: "",
  registrationNumber: "",
  taxIdentificationNumber: "",
  currency: "LKR",
  countryCode: "LK",
  timezone: "Asia/Colombo",
  payrollCycleType: "Monthly",
  address: "",
  phone: "",
  email: "",
  website: "",
  financialYearStart: "01-01",
};

type TabKey =
  | "profile"
  | "payroll"
  | "leave"
  | "shortLeave"
  | "grievance"
  | "notifications"
  | "system";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Company Profile", icon: <Building2 size={16} /> },
  { key: "payroll", label: "Payroll & HR", icon: <Settings2 size={16} /> },
  { key: "leave", label: "Leave Policy", icon: <CalendarDays size={16} /> },
  {
    key: "shortLeave",
    label: "Short Leave Policy",
    icon: <Clock3 size={16} />,
  },
  {
    key: "grievance",
    label: "Grievance Settings",
    icon: <Megaphone size={16} />,
  },
  { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  { key: "system", label: "System Status", icon: <Activity size={16} /> },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TIMEZONES = [
  "Asia/Colombo",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "AUD", "SGD", "INR", "AED"];
const CYCLES = ["Monthly", "BiMonthly", "Weekly"];
const APPROVAL_CHAIN_TYPES = [
  { value: "DirectToHR", label: "Direct to HR" },
  { value: "SupervisorThenHR", label: "Supervisor, then HR" },
];
const DEDUCTION_SOURCES = ["Company", "Branch", "Department", "Designation"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompanySettingsPage() {
  useRequirePermission(Permissions.Settings.Company.View);
  const canManage = usePermission(Permissions.Settings.Company.Manage);
  const canCreate = usePermission(Permissions.Settings.Company.Create);
  const canManageShortLeave = usePermission(
    Permissions.Settings.ShortLeavePolicy.Manage,
  );
  const canManageGrievance = usePermission(
    Permissions.Settings.GrievanceConfig.Manage,
  );
  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [data, setData] = useState<CompanySettings | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // First-time setup form
  const [createForm, setCreateForm] =
    useState<CreateCompanyForm>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await axios.get("/company");
      const d = res.data;

      // No company_settings row exists yet — id will be missing/undefined
      if (!d || !d.id) {
        setNeedsSetup(true);
        setData(null);
        return;
      }

      setNeedsSetup(false);
      setData({
        id: String(d.id),
        name: d.name ?? "",
        legalName: d.legalName ?? "",
        registrationNumber: d.registrationNumber ?? "",
        taxIdentificationNumber: d.taxIdentificationNumber ?? "",
        logoUrl: d.logoUrl ?? null,
        currency: d.currency ?? "LKR",
        countryCode: d.countryCode ?? "LK",
        timezone: d.timezone ?? "Asia/Colombo",
        address: d.address ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        website: d.website ?? "",
        isActive: d.isActive ?? true,
        payrollCycleType: d.payrollCycleType ?? "Monthly",
        approvalChainType: d.approvalChainType ?? "DirectToHR",
        financialYearStart: normalizeFyStart(d.financialYearStart),
        attendanceDeductionEnabled: d.attendanceDeductionEnabled ?? true,
        dsrLimitPercent: d.dsrLimitPercent ?? 40,
        tempPasswordExpiryHours: d.tempPasswordExpiryHours ?? 24,
        retirementAge: d.retirementAge ?? 60,
        defaultAbsentDeductionAfterDays: d.defaultAbsentDeductionAfterDays ?? 0,
        defaultLateDeductionPerMinute: d.defaultLateDeductionPerMinute ?? 0,
        defaultOvertimeRateMultiplier: d.defaultOvertimeRateMultiplier ?? 1.5,
        absentDeductionSource: d.absentDeductionSource ?? "Company",
        lateDeductionSource: d.lateDeductionSource ?? "Company",
        overtimeMultiplierSource: d.overtimeMultiplierSource ?? "Company",
        leaveYearStartMonth: d.leaveYearStartMonth ?? 1,
        leaveCarryForwardEnabled: d.leaveCarryForwardEnabled ?? true,
        leaveCarryForwardMaxDays: d.leaveCarryForwardMaxDays ?? 0,
        leaveAdvanceNoticeDays: d.leaveAdvanceNoticeDays ?? 1,
        notifyPayslipEmail: d.notifyPayslipEmail ?? true,
        notifyLeaveDecision: d.notifyLeaveDecision ?? true,
        notifyAttendanceAlert: d.notifyAttendanceAlert ?? false,
        notifyLoanApproval: d.notifyLoanApproval ?? true,
        offerApprovalEnabled: d.offerApprovalEnabled ?? false,
        offerApprovalSalaryThreshold: d.offerApprovalSalaryThreshold ?? null,
        createdAt: d.createdAt ?? "",
        updatedAt: d.updatedAt ?? null,
      });
    } catch (err: any) {
      showError(
        "Load Failed",
        err?.response?.data?.error ?? "Failed to load company settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K],
  ) {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setCreateField<K extends keyof CreateCompanyForm>(
    key: K,
    value: CreateCompanyForm[K],
  ) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── First-time setup ──────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.name.trim()) {
      showError("Missing information", "Company name is required.");
      return;
    }
    setCreating(true);
    try {
      await axios.post("/company/create", {
        name: createForm.name.trim(),
        legalName: createForm.legalName.trim() || null,
        registrationNumber: createForm.registrationNumber.trim() || null,
        taxIdentificationNumber:
          createForm.taxIdentificationNumber.trim() || null,
        currency: createForm.currency,
        countryCode: createForm.countryCode,
        timezone: createForm.timezone,
        payrollCycleType: createForm.payrollCycleType,
        address: createForm.address.trim() || null,
        phone: createForm.phone.trim() || null,
        email: createForm.email.trim() || null,
        website: createForm.website.trim() || null,
        financialYearStart: createForm.financialYearStart,
        userId: userId,
      });
      showSuccess(
        "Company created",
        "You can now configure the rest of your settings.",
      );
      setLoading(true);
      await fetchSettings();
    } catch (err: any) {
      showError(
        "Failed to create company",
        err?.response?.data?.error ?? "Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Logo handling ──────────────────────────────────────────────────────────
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  // ── Save per tab ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      // If a new logo was selected, upload it first
      let logoUrl = data.logoUrl;
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const upRes = await axios.post("/company/upload-logo", fd);
        logoUrl = upRes.data.logoUrl;
        setLogoFile(null);
        setLogoPreview(null);
      }

      await axios.post("/company/save", {
        id: data.id,
        name: data.name,
        legalName: data.legalName,
        registrationNumber: data.registrationNumber,
        taxIdentificationNumber: data.taxIdentificationNumber,
        logoUrl,
        currency: data.currency,
        countryCode: data.countryCode,
        timezone: data.timezone,
        payrollCycleType: data.payrollCycleType,
        approvalChainType: data.approvalChainType,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        financialYearStart: data.financialYearStart,
        isActive: data.isActive,
        attendanceDeductionEnabled: data.attendanceDeductionEnabled,
        dsrLimitPercent: data.dsrLimitPercent,
        tempPasswordExpiryHours: data.tempPasswordExpiryHours,
        retirementAge: data.retirementAge,
        defaultAbsentDeductionAfterDays: data.defaultAbsentDeductionAfterDays,
        defaultLateDeductionPerMinute: data.defaultLateDeductionPerMinute,
        defaultOvertimeRateMultiplier: data.defaultOvertimeRateMultiplier,
        absentDeductionSource: data.absentDeductionSource,
        lateDeductionSource: data.lateDeductionSource,
        overtimeMultiplierSource: data.overtimeMultiplierSource,
        leaveYearStartMonth: data.leaveYearStartMonth,
        leaveCarryForwardEnabled: data.leaveCarryForwardEnabled,
        leaveCarryForwardMaxDays: data.leaveCarryForwardMaxDays,
        leaveAdvanceNoticeDays: data.leaveAdvanceNoticeDays,
        notifyPayslipEmail: data.notifyPayslipEmail,
        notifyLeaveDecision: data.notifyLeaveDecision,
        notifyAttendanceAlert: data.notifyAttendanceAlert,
        notifyLoanApproval: data.notifyLoanApproval,
        offerApprovalEnabled: data.offerApprovalEnabled,
        offerApprovalSalaryThreshold: data.offerApprovalSalaryThreshold,
        updatedBy: userId,
      });
      showSuccess("Settings saved successfully.");
      await fetchSettings();
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.error ?? "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex gap-6 animate-pulse">
        <div className="w-64 shrink-0 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── First-time setup screen ──────────────────────────────────────────────
  if (needsSetup) {
    if (!canCreate) {
      return (
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={26} className="text-amber-600" />
          </div>
          <h3 className="heading-text mb-2">Company Not Set Up Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This XpayRoll Pro instance hasn't been initialised yet. Please
            contact your service provider to complete the initial company setup
            before configuring settings here.
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Rocket size={22} className="text-primary" />
          </div>
          <div>
            <h3 className="heading-text">Set Up Your Company</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              This runs once. Everything else can be configured afterwards.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Display Name">
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateField("name", e.target.value)}
                  placeholder="e.g. Miracle IT Solutions"
                />
              </Field>
              <Field label="Legal Entity Name">
                <Input
                  value={createForm.legalName}
                  onChange={(e) => setCreateField("legalName", e.target.value)}
                  placeholder="Registered legal name"
                />
              </Field>
              <Field label="Registration Number">
                <Input
                  value={createForm.registrationNumber}
                  onChange={(e) =>
                    setCreateField("registrationNumber", e.target.value)
                  }
                  placeholder="e.g. PV00231556"
                />
              </Field>
              <Field label="Tax ID (TIN)">
                <Input
                  value={createForm.taxIdentificationNumber}
                  onChange={(e) =>
                    setCreateField("taxIdentificationNumber", e.target.value)
                  }
                  placeholder="Tax identification number"
                />
              </Field>
            </div>

            <SectionTitle>Regional Settings</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <SelectField
                label="Operating Currency"
                value={createForm.currency}
                onChange={(v) => setCreateField("currency", v)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
              <Field label="Country Code">
                <Input
                  value={createForm.countryCode}
                  onChange={(e) =>
                    setCreateField("countryCode", e.target.value.toUpperCase())
                  }
                  maxLength={5}
                  placeholder="e.g. LK"
                />
              </Field>
              <SelectField
                label="Timezone"
                value={createForm.timezone}
                onChange={(v) => setCreateField("timezone", v)}
                options={TIMEZONES.map((t) => ({ value: t, label: t }))}
              />
            </div>

            <SectionTitle>Payroll Configuration</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Payroll Cycle"
                value={createForm.payrollCycleType}
                onChange={(v) => setCreateField("payrollCycleType", v)}
                options={CYCLES.map((c) => ({ value: c, label: c }))}
              />
              <Field label="Financial Year Start">
                <FinancialYearStartPicker
                  value={createForm.financialYearStart}
                  onChange={(v) => setCreateField("financialYearStart", v)}
                />
              </Field>
            </div>

            <SectionTitle>Contact & Location</SectionTitle>
            <div className="space-y-4">
              <Field label="Headquarters Address">
                <textarea
                  value={createForm.address}
                  onChange={(e) => setCreateField("address", e.target.value)}
                  rows={3}
                  placeholder="Full address"
                  className="input w-full resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Phone">
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateField("phone", e.target.value)}
                    placeholder="+94 11 000 0000"
                  />
                </Field>
                <Field label="Corporate Email">
                  <Input
                    value={createForm.email}
                    onChange={(e) => setCreateField("email", e.target.value)}
                    placeholder="info@company.lk"
                  />
                </Field>
                <Field label="Website">
                  <Input
                    value={createForm.website}
                    onChange={(e) => setCreateField("website", e.target.value)}
                    placeholder="https://company.lk"
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <Button
                variant="solid"
                icon={<Rocket size={15} />}
                loading={creating}
                onClick={handleCreate}
              >
                Create Company & Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data)
    return (
      <div className="text-center py-20 text-gray-400">
        No company data found.
      </div>
    );

  const isSystem = activeTab === "system";
  const hasOwnSaveFlow =
    activeTab === "shortLeave" || activeTab === "grievance";

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="heading-text">Company Settings</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure your organisation's profile, payroll rules, and system
            preferences.
          </p>
        </div>
        {canManage && !isSystem && !hasOwnSaveFlow && (
          <Button
            variant="solid"
            icon={<Save size={15} />}
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Tab Nav ────────────────────────────────────────────────────── */}
        <div className="w-56 shrink-0 card">
          <div className="card-body !p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors text-left
                  ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.key && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content Panel ──────────────────────────────────────────────── */}
        <div className="flex-1 card">
          <div className="card-body">
            {activeTab === "profile" && (
              <ProfileTab
                data={data}
                set={set}
                logoPreview={logoPreview}
                onLogoChange={handleLogoChange}
                onClearLogo={clearLogo}
                canManage={canManage}
              />
            )}
            {activeTab === "payroll" && (
              <PayrollTab data={data} set={set} canManage={canManage} />
            )}
            {activeTab === "leave" && (
              <LeaveTab data={data} set={set} canManage={canManage} />
            )}
            {activeTab === "shortLeave" && (
              <ShortLeaveTab canManage={canManageShortLeave} />
            )}
            {activeTab === "grievance" && (
              <GrievanceSettingsTab canManage={canManageGrievance} />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab data={data} set={set} canManage={canManage} />
            )}
            {activeTab === "system" && <SystemTab data={data} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      {children}
    </h4>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="select w-full"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ── Financial year start picker ────────────────────────────────────────────────
// The database only accepts 'MM-DD' (chk_financial_year_start_format) and
// rejects 02-29, so this offers real months and only the days that exist in a
// non-leap year. It cannot produce a value the database refuses.
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Feb = 28 on purpose

function parseFyStart(v: string | null | undefined): { month: number; day: number } {
  const m = /^(\d{2})-(\d{2})$/.exec(v ?? "");
  const month = m ? Number(m[1]) : 1;
  const day = m ? Number(m[2]) : 1;
  if (month < 1 || month > 12) return { month: 1, day: 1 };
  return { month, day: Math.min(Math.max(day, 1), DAYS_IN_MONTH[month - 1]) };
}

function formatFyStart(month: number, day: number): string {
  const safeDay = Math.min(Math.max(day, 1), DAYS_IN_MONTH[month - 1]);
  return `${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

// Anything stored in an odd shape is shown (and later saved) as a valid MM-DD.
function normalizeFyStart(v: string | null | undefined): string {
  const { month, day } = parseFyStart(v);
  return formatFyStart(month, day);
}

function fyEndLabel(month: number, day: number): string {
  // The year ends the day before the next one starts.
  if (day === 1) {
    const endMonth = month === 1 ? 12 : month - 1;
    return `${DAYS_IN_MONTH[endMonth - 1]} ${MONTHS[endMonth - 1]}`;
  }
  return `${day - 1} ${MONTHS[month - 1]}`;
}

function FinancialYearStartPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { month, day } = parseFyStart(value);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={month}
          onChange={(e) => onChange(formatFyStart(Number(e.target.value), day))}
          disabled={disabled}
          className="select w-full"
          aria-label="Financial year start month"
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => onChange(formatFyStart(month, Number(e.target.value)))}
          disabled={disabled}
          className="select w-full"
          aria-label="Financial year start day"
        >
          {Array.from({ length: DAYS_IN_MONTH[month - 1] }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Financial year runs {day} {MONTHS[month - 1]} to {fyEndLabel(month, day)}. Most companies use 1 January or 1 April.
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
      <Switcher checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Tab: Company Profile ───────────────────────────────────────────────────────
function ProfileTab({
  data,
  set,
  logoPreview,
  onLogoChange,
  onClearLogo,
  canManage,
}: {
  data: CompanySettings;
  set: <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => void;
  logoPreview: string | null;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLogo: () => void;
  canManage: boolean;
}) {
  const displayLogo =
    logoPreview ??
    (data.logoUrl ? `/api/proxy/images/profile/${data.logoUrl}` : null);

  return (
    <div className="space-y-6">
      <SectionTitle>General Information</SectionTitle>

      {/* Logo */}
      <div className="flex items-center gap-5 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
          {displayLogo ? (
            <img
              src={displayLogo}
              alt="logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 size={32} className="text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            Company Logo
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Recommended 512×512px. PNG or SVG only. Used on payslips and
            reports.
          </p>
          {canManage && (
            <div className="flex items-center gap-3 mt-2">
              <label className="cursor-pointer flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Upload size={13} />
                {displayLogo ? "Replace Logo" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/png,image/svg+xml"
                  className="hidden"
                  onChange={onLogoChange}
                />
              </label>
              {logoPreview && (
                <button
                  onClick={onClearLogo}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <X size={12} /> Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company Display Name">
          <Input
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={!canManage}
            placeholder="e.g. Miracle IT Solutions"
          />
        </Field>
        <Field label="Legal Entity Name">
          <Input
            value={data.legalName}
            onChange={(e) => set("legalName", e.target.value)}
            disabled={!canManage}
            placeholder="Registered legal name"
          />
        </Field>
        <Field label="Registration Number">
          <Input
            value={data.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value)}
            disabled={!canManage}
            placeholder="e.g. PV00231556"
          />
        </Field>
        <Field label="Tax ID (TIN)">
          <Input
            value={data.taxIdentificationNumber}
            onChange={(e) => set("taxIdentificationNumber", e.target.value)}
            disabled={!canManage}
            placeholder="Tax identification number"
          />
        </Field>
      </div>

      <SectionTitle>Regional Settings</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Operating Currency"
          value={data.currency}
          onChange={(v) => set("currency", v)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          disabled={!canManage}
        />
        <Field label="Country Code">
          <Input
            value={data.countryCode}
            onChange={(e) => set("countryCode", e.target.value.toUpperCase())}
            maxLength={5}
            disabled={!canManage}
            placeholder="e.g. LK"
          />
        </Field>
        <SelectField
          label="Timezone"
          value={data.timezone}
          onChange={(v) => set("timezone", v)}
          options={TIMEZONES.map((t) => ({ value: t, label: t }))}
          disabled={!canManage}
        />
      </div>

      <SectionTitle>Contact & Location</SectionTitle>
      <div className="space-y-4">
        <Field label="Headquarters Address">
          <textarea
            value={data.address}
            onChange={(e) => set("address", e.target.value)}
            disabled={!canManage}
            rows={3}
            placeholder="Full address"
            className="input w-full resize-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Phone">
            <Input
              value={data.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={!canManage}
              placeholder="+94 11 000 0000"
            />
          </Field>
          <Field label="Corporate Email">
            <Input
              value={data.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={!canManage}
              placeholder="info@company.lk"
            />
          </Field>
          <Field label="Website">
            <Input
              value={data.website}
              onChange={(e) => set("website", e.target.value)}
              disabled={!canManage}
              placeholder="https://company.lk"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Payroll & HR ──────────────────────────────────────────────────────────
function PayrollTab({
  data,
  set,
  canManage,
}: {
  data: CompanySettings;
  set: <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => void;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle>Payroll Configuration</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Payroll Cycle"
          value={data.payrollCycleType}
          onChange={(v) => set("payrollCycleType", v)}
          options={CYCLES.map((c) => ({ value: c, label: c }))}
          disabled={!canManage}
        />
        <Field label="Financial Year Start">
          <FinancialYearStartPicker
            value={data.financialYearStart}
            onChange={(v) => set("financialYearStart", v)}
            disabled={!canManage}
          />
          {canManage && (
            <p className="text-xs text-gray-400 mt-1">
              Also decides the period that is locked for work-pattern changes
              once payroll has run. Change it only at the start of a new year.
            </p>
          )}
        </Field>
        <Field label="Retirement Age (years)">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={String(data.retirementAge)}
              onChange={(e) => set("retirementAge", Number(e.target.value))}
              disabled={!canManage}
              className="w-32"
              min={18}
              max={80}
            />
            <span className="text-sm text-gray-500">years</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used to calculate a suggested contract end date from an employee's
            date of birth during onboarding.
          </p>
        </Field>
      </div>

      <SectionTitle>Approval Workflow</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Leave & Attendance Approval Chain"
          value={data.approvalChainType}
          onChange={(v) => set("approvalChainType", v)}
          options={APPROVAL_CHAIN_TYPES}
          disabled={!canManage}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
        Governs Leave, Short Leave, Overtime, Attendance Adjustment, and Profile
        Change requests. <strong>Direct to HR</strong> sends every request
        straight to HR for final approval. <strong>Supervisor, then HR</strong>{" "}
        requires the employee's manager (or the nearest active manager up the
        chain) to approve first; requests from employees with no manager go
        straight to HR.
      </p>

      <SectionTitle>Attendance & Deductions</SectionTitle>
      <ToggleRow
        label="Attendance-Based Deductions"
        description="Automatically deduct salary for absent or late days based on attendance logs during payroll runs."
        checked={data.attendanceDeductionEnabled}
        onChange={(v) => set("attendanceDeductionEnabled", v)}
        disabled={!canManage}
      />
      <div className="mt-4">
        <Field label="DSR Limit (%)">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={data.dsrLimitPercent}
              onChange={(e) => set("dsrLimitPercent", Number(e.target.value))}
              disabled={!canManage}
              className="flex-1 accent-primary"
            />
            <span className="w-14 text-center font-semibold text-primary tabular-nums">
              {data.dsrLimitPercent}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maximum Debt Service Ratio allowed when approving new employee
            loans. Currently hardcoded references will read this value.
          </p>
        </Field>
      </div>

      <SectionTitle>Deduction Rule Defaults &amp; Hierarchy</SectionTitle>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">
        Set company-wide fallback values for the three contract deduction rules
        below, and choose which organisational level each rule should follow
        first when a new employee's contract is created. If the chosen level has
        no override configured for a given Branch, Department, or Designation,
        the rule falls back to the company-wide default here.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Default Absent Deduct After (days)">
          <Input
            type="number"
            value={String(data.defaultAbsentDeductionAfterDays)}
            onChange={(e) =>
              set("defaultAbsentDeductionAfterDays", Number(e.target.value))
            }
            disabled={!canManage}
            min={0}
          />
        </Field>
        <Field label="Default Late Deduct / Minute">
          <Input
            type="number"
            step="0.01"
            value={String(data.defaultLateDeductionPerMinute)}
            onChange={(e) =>
              set("defaultLateDeductionPerMinute", Number(e.target.value))
            }
            disabled={!canManage}
            min={0}
          />
        </Field>
        <Field label="Default OT Rate Multiplier">
          <Input
            type="number"
            step="0.1"
            value={String(data.defaultOvertimeRateMultiplier)}
            onChange={(e) =>
              set("defaultOvertimeRateMultiplier", Number(e.target.value))
            }
            disabled={!canManage}
            min={1}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <SelectField
          label="Absent Deduction Follows"
          value={data.absentDeductionSource}
          onChange={(v) => set("absentDeductionSource", v)}
          options={DEDUCTION_SOURCES.map((s) => ({ value: s, label: s }))}
          disabled={!canManage}
        />
        <SelectField
          label="Late Deduction Follows"
          value={data.lateDeductionSource}
          onChange={(v) => set("lateDeductionSource", v)}
          options={DEDUCTION_SOURCES.map((s) => ({ value: s, label: s }))}
          disabled={!canManage}
        />
        <SelectField
          label="OT Multiplier Follows"
          value={data.overtimeMultiplierSource}
          onChange={(v) => set("overtimeMultiplierSource", v)}
          options={DEDUCTION_SOURCES.map((s) => ({ value: s, label: s }))}
          disabled={!canManage}
        />
      </div>

      <SectionTitle>Security</SectionTitle>
      <Field label="Temporary Password Expiry (hours)">
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={String(data.tempPasswordExpiryHours)}
            onChange={(e) =>
              set("tempPasswordExpiryHours", Number(e.target.value))
            }
            disabled={!canManage}
            className="w-32"
            min={1}
            max={168}
          />
          <span className="text-sm text-gray-500">
            hours after user creation
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Between 1 and 168 hours (7 days). After expiry the user must request a
          password reset.
        </p>
      </Field>

      <SectionTitle>Recruitment</SectionTitle>
      <ToggleRow
        label="Require Offer Approval"
        description="Offers above the salary threshold below must be approved before they can be sent to a candidate."
        checked={data.offerApprovalEnabled}
        onChange={(v) => set("offerApprovalEnabled", v)}
        disabled={!canManage}
      />
      {data.offerApprovalEnabled && (
        <Field label="Approval Required Above Salary">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={
                data.offerApprovalSalaryThreshold === null
                  ? ""
                  : String(data.offerApprovalSalaryThreshold)
              }
              onChange={(e) =>
                set(
                  "offerApprovalSalaryThreshold",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              disabled={!canManage}
              className="w-48"
              min={0}
              placeholder="Leave blank to always require approval"
            />
            <span className="text-sm text-gray-500">{data.currency}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Offers with a salary above this amount will need approval before
            sending. Leave blank to require approval on every offer regardless
            of salary.
          </p>
        </Field>
      )}
    </div>
  );
}

// ── Tab: Leave Policy ──────────────────────────────────────────────────────────
function LeaveTab({
  data,
  set,
  canManage,
}: {
  data: CompanySettings;
  set: <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => void;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <SectionTitle>Leave Year</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Leave Year Start Month"
          value={String(data.leaveYearStartMonth)}
          onChange={(v) => set("leaveYearStartMonth", Number(v))}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          disabled={!canManage}
        />
        <Field label="Advance Notice Required (days)">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={String(data.leaveAdvanceNoticeDays)}
              onChange={(e) =>
                set("leaveAdvanceNoticeDays", Number(e.target.value))
              }
              disabled={!canManage}
              className="w-32"
              min={0}
            />
            <span className="text-sm text-gray-500">
              days before leave starts
            </span>
          </div>
        </Field>
      </div>

      <SectionTitle>Carry Forward</SectionTitle>
      <ToggleRow
        label="Allow Leave Carry Forward"
        description="Employees can carry unused leave balances into the next leave year. Per-leave-type settings override this global toggle."
        checked={data.leaveCarryForwardEnabled}
        onChange={(v) => set("leaveCarryForwardEnabled", v)}
        disabled={!canManage}
      />
      {data.leaveCarryForwardEnabled && (
        <Field label="Maximum Carry Forward Days">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={String(data.leaveCarryForwardMaxDays)}
              onChange={(e) =>
                set("leaveCarryForwardMaxDays", Number(e.target.value))
              }
              disabled={!canManage}
              className="w-32"
              min={0}
            />
            <span className="text-sm text-gray-500">days (0 = unlimited)</span>
          </div>
        </Field>
      )}
    </div>
  );
}

// ── Tab: Short Leave Policy ────────────────────────────────────────────────────
interface ShortLeavePolicyForm {
  moduleEnabled: boolean;
  monthlyQuota: number;
  maxDurationMinutes: number;
  minDurationMinutes: number;
  allowedWindows: string;
  overquotaBehavior: string;
  overdurationBehavior: string;
  halfdayLeaveTypeId: string | null;
  advanceNoticeDays: number;
  allowBackdated: boolean;
  countTowardLateSuppression: boolean;
  midmonthJoinQuotaBehavior: string;
  midmonthProrateBasis: string | null;
}

const EMPTY_SHORT_LEAVE_POLICY: ShortLeavePolicyForm = {
  moduleEnabled: true,
  monthlyQuota: 2,
  maxDurationMinutes: 90,
  minDurationMinutes: 15,
  allowedWindows: "Anytime",
  overquotaBehavior: "ConvertHalfDay",
  overdurationBehavior: "ConvertHalfDay",
  halfdayLeaveTypeId: null,
  advanceNoticeDays: 0,
  allowBackdated: true,
  countTowardLateSuppression: true,
  midmonthJoinQuotaBehavior: "Full",
  midmonthProrateBasis: null,
};

function ShortLeaveTab({ canManage }: { canManage: boolean }) {
  const initialized = useRef(false);
  const [form, setForm] = useState<ShortLeavePolicyForm>(EMPTY_SHORT_LEAVE_POLICY);
  const [original, setOriginal] = useState<ShortLeavePolicyForm>(EMPTY_SHORT_LEAVE_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>([]);
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedByName: string | null }>({
    updatedAt: null,
    updatedByName: null,
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [policyRes, ltRes] = await Promise.all([
        axios.get("/short-leave-policy"),
        axios.get("/leave-types"),
      ]);
      const p = policyRes.data;
      const loaded: ShortLeavePolicyForm = {
        moduleEnabled: p.moduleEnabled,
        monthlyQuota: p.monthlyQuota,
        maxDurationMinutes: p.maxDurationMinutes,
        minDurationMinutes: p.minDurationMinutes,
        allowedWindows: p.allowedWindows,
        overquotaBehavior: p.overquotaBehavior,
        overdurationBehavior: p.overdurationBehavior,
        halfdayLeaveTypeId: p.halfdayLeaveTypeId ? String(p.halfdayLeaveTypeId) : null,
        advanceNoticeDays: p.advanceNoticeDays,
        allowBackdated: p.allowBackdated,
        countTowardLateSuppression: p.countTowardLateSuppression,
        midmonthJoinQuotaBehavior: p.midmonthJoinQuotaBehavior,
        midmonthProrateBasis: p.midmonthProrateBasis,
      };
      setForm(loaded);
      setOriginal(loaded);
      setMeta({ updatedAt: p.updatedAt, updatedByName: p.updatedByName });
      setLeaveTypes(ltRes.data.map((x: any) => ({ id: String(x.id), name: x.name })));
    } catch (err: any) {
      showError("Load failed", err?.response?.data?.error ?? "Could not load short leave policy.");
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof ShortLeavePolicyForm>(key: K, value: ShortLeavePolicyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  async function handleSave() {
    setSaving(true);
    try {
      await axios.post("/short-leave-policy/save", {
        moduleEnabled: form.moduleEnabled,
        monthlyQuota: form.monthlyQuota,
        maxDurationMinutes: form.maxDurationMinutes,
        minDurationMinutes: form.minDurationMinutes,
        allowedWindows: form.allowedWindows,
        overquotaBehavior: form.overquotaBehavior,
        overdurationBehavior: form.overdurationBehavior,
        halfdayLeaveTypeId: form.halfdayLeaveTypeId || null,
        advanceNoticeDays: form.advanceNoticeDays,
        allowBackdated: form.allowBackdated,
        countTowardLateSuppression: form.countTowardLateSuppression,
        midmonthJoinQuotaBehavior: form.midmonthJoinQuotaBehavior,
        midmonthProrateBasis: form.midmonthJoinQuotaBehavior === "Prorated" ? form.midmonthProrateBasis : null,
        updatedBy: 0,
      });
      showSuccess("Policy saved", "Short leave policy updated successfully.");
      await load();
    } catch (err: any) {
      showError("Save failed", err?.response?.data?.error ?? "Could not save short leave policy.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  const showHalfdayType =
    form.overquotaBehavior === "ConvertHalfDay" || form.overdurationBehavior === "ConvertHalfDay";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Governs quota, duration limits, and conversion behavior for short leave requests. Applies
            company-wide and takes effect immediately for new requests.
          </p>
          {meta.updatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated {new Date(meta.updatedAt).toLocaleString()}
              {meta.updatedByName ? ` by ${meta.updatedByName}` : ""}
            </p>
          )}
        </div>
        {canManage && (
          <Button variant="solid" size="sm" loading={saving} disabled={!dirty} onClick={handleSave}>
            {dirty ? "Save Changes" : "Saved"}
          </Button>
        )}
      </div>

      <SectionTitle>Module</SectionTitle>
      <ToggleRow
        label="Short Leave Module"
        description="When off, no new short leave requests can be submitted. Existing requests remain visible."
        checked={form.moduleEnabled}
        onChange={(v) => set("moduleEnabled", v)}
        disabled={!canManage}
      />

      <SectionTitle>Quota &amp; Duration</SectionTitle>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Monthly Quota (requests)">
          <Input
            type="number"
            value={String(form.monthlyQuota)}
            onChange={(e) => set("monthlyQuota", Math.max(1, Number(e.target.value) || 1))}
            disabled={!canManage}
            min={1}
          />
        </Field>
        <Field label="Max Duration (minutes)">
          <Input
            type="number"
            value={String(form.maxDurationMinutes)}
            onChange={(e) => set("maxDurationMinutes", Math.max(1, Number(e.target.value) || 1))}
            disabled={!canManage}
            min={1}
          />
        </Field>
        <Field label="Min Duration (minutes)">
          <Input
            type="number"
            value={String(form.minDurationMinutes)}
            onChange={(e) => set("minDurationMinutes", Math.max(1, Number(e.target.value) || 1))}
            disabled={!canManage}
            min={1}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Allowed Time Windows"
          value={form.allowedWindows}
          onChange={(v) => set("allowedWindows", v)}
          options={[
            { value: "Anytime", label: "Anytime" },
            { value: "StartOrEndOfShift", label: "Start or End of Shift" },
          ]}
          disabled={!canManage}
        />
      </div>

      <SectionTitle>Over-Limit Behavior</SectionTitle>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">
        What happens when a request exceeds the monthly quota or maximum duration.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Over Monthly Quota"
          value={form.overquotaBehavior}
          onChange={(v) => set("overquotaBehavior", v)}
          options={[
            { value: "Block", label: "Block the request" },
            { value: "ConvertHalfDay", label: "Convert to half-day leave" },
            { value: "ConvertNoPay", label: "Convert to no-pay leave" },
          ]}
          disabled={!canManage}
        />
        <SelectField
          label="Over Maximum Duration"
          value={form.overdurationBehavior}
          onChange={(v) => set("overdurationBehavior", v)}
          options={[
            { value: "Block", label: "Block the request" },
            { value: "ConvertHalfDay", label: "Convert to half-day leave" },
            { value: "ConvertNoPay", label: "Convert to no-pay leave" },
          ]}
          disabled={!canManage}
        />
      </div>
      {showHalfdayType && (
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Half-Day Conversion Leave Type"
            value={form.halfdayLeaveTypeId ?? ""}
            onChange={(v) => set("halfdayLeaveTypeId", v || null)}
            options={[
              { value: "", label: "— Not set —" },
              ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name })),
            ]}
            disabled={!canManage}
          />
        </div>
      )}

      <SectionTitle>Timing &amp; Attendance</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Advance Notice (days)">
          <Input
            type="number"
            value={String(form.advanceNoticeDays)}
            onChange={(e) => set("advanceNoticeDays", Math.max(0, Number(e.target.value) || 0))}
            disabled={!canManage}
            min={0}
          />
        </Field>
      </div>
      <ToggleRow
        label="Allow Backdated Requests"
        description="Permit HR to submit a short leave for a date that has already passed."
        checked={form.allowBackdated}
        onChange={(v) => set("allowBackdated", v)}
        disabled={!canManage}
      />
      <ToggleRow
        label="Count Toward Late/Early Suppression"
        description="An approved short leave covering the start or end of a shift reduces (but does not erase) recorded late-arrival or early-departure minutes for that day."
        checked={form.countTowardLateSuppression}
        onChange={(v) => set("countTowardLateSuppression", v)}
        disabled={!canManage}
      />

      <SectionTitle>Mid-Month Joiners</SectionTitle>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">
        How the monthly quota applies to an employee who joins partway through a month.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Quota for Joining Month"
          value={form.midmonthJoinQuotaBehavior}
          onChange={(v) => {
            set("midmonthJoinQuotaBehavior", v);
            if (v === "Full") set("midmonthProrateBasis", null);
          }}
          options={[
            { value: "Full", label: "Full quota" },
            { value: "Prorated", label: "Prorated" },
          ]}
          disabled={!canManage}
        />
        {form.midmonthJoinQuotaBehavior === "Prorated" && (
          <SelectField
            label="Proration Basis"
            value={form.midmonthProrateBasis ?? ""}
            onChange={(v) => set("midmonthProrateBasis", v || null)}
            options={[
              { value: "", label: "— Select —" },
              { value: "CalendarDays", label: "Calendar days remaining" },
              { value: "WorkingDays", label: "Working days remaining" },
            ]}
            disabled={!canManage}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab: Grievance Settings ─────────────────────────────────────────────────────
interface GrievanceCategoryRow {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  defaultSeverity: string;
  defaultAssigneeUserId: string | null;
  defaultAssigneeName: string | null;
  forceConfidential: boolean;
  acknowledgeSlaHours: number | null;
  resolveSlaDays: number | null;
  escalationUserId: string | null;
  escalationUserName: string | null;
  escalationAfterDays: number | null;
  caseCount: number;
}

interface GrievancePolicyForm {
  moduleEnabled: boolean;
  allowAnonymous: boolean;
  allowEmployeeWithdraw: boolean;
  requireResolutionNotes: boolean;
  satisfactionCaptureEnabled: boolean;
  autoCloseAfterDays: number | null;
  slaWarningThresholdPct: number;
  notifyOnAssigned: boolean;
  notifyOnStatusChange: boolean;
  notifyOnSlaWarning: boolean;
  notifyOnSlaBreach: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
}

interface GrievanceUserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const GRIEVANCE_SEVERITIES = ["Low", "Medium", "High", "Critical"];

// Search-and-select picker against /users, same interaction shape as the
// employee picker in ApplyShortLeaveDialog. No shared UserPicker component
// exists in this codebase yet, so it's local to this tab.
function GrievanceUserPickerField({
  label,
  users,
  value,
  onChange,
  disabled,
  helperText,
}: {
  label: string;
  users: GrievanceUserOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  const [search, setSearch] = useState("");
  const selected = users.find((u) => u.id === value) ?? null;
  const filtered = search.trim()
    ? users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div>
      <label className="form-label">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
          <div>
            <p className="text-sm font-medium">
              {selected.firstName} {selected.lastName}
            </p>
            <p className="text-xs text-gray-400">{selected.email}</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="input pl-8 w-full"
              placeholder="Search by name or email…"
              value={search}
              disabled={disabled}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">No users found</div>
              ) : (
                filtered.slice(0, 10).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => {
                      onChange(u.id);
                      setSearch("");
                    }}
                  >
                    {u.firstName} {u.lastName} <span className="text-gray-400">({u.email})</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
    </div>
  );
}

const EMPTY_CATEGORY_FORM = {
  name: "",
  isActive: true,
  sortOrder: 0,
  defaultSeverity: "Medium",
  defaultAssigneeUserId: null as string | null,
  forceConfidential: false,
  acknowledgeSlaHours: null as number | null,
  resolveSlaDays: null as number | null,
  escalationUserId: null as string | null,
  escalationAfterDays: null as number | null,
};

function GrievanceCategoryDialog({
  isOpen,
  onClose,
  onSaved,
  category,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  category: GrievanceCategoryRow | null;
  users: GrievanceUserOption[];
}) {
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      category
        ? {
            name: category.name,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            defaultSeverity: category.defaultSeverity,
            defaultAssigneeUserId: category.defaultAssigneeUserId,
            forceConfidential: category.forceConfidential,
            acknowledgeSlaHours: category.acknowledgeSlaHours,
            resolveSlaDays: category.resolveSlaDays,
            escalationUserId: category.escalationUserId,
            escalationAfterDays: category.escalationAfterDays,
          }
        : EMPTY_CATEGORY_FORM,
    );
  }, [isOpen, category]);

  function set<K extends keyof typeof EMPTY_CATEGORY_FORM>(key: K, value: (typeof EMPTY_CATEGORY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const escalationMismatch = (form.escalationUserId === null) !== (form.escalationAfterDays === null);

  async function handleSave() {
    if (!form.name.trim()) {
      showError("Missing information", "Category name is required.");
      return;
    }
    if (escalationMismatch) {
      showError("Invalid escalation setup", "Escalation user and escalation window must be set together, or not at all.");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/grievance-config/categories/save", {
        id: category?.id ?? null,
        action: category ? "UPDATE" : "ADD",
        name: form.name.trim(),
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        defaultSeverity: form.defaultSeverity,
        defaultAssigneeUserId: form.defaultAssigneeUserId,
        defaultAssigneeRoleId: null,
        forceConfidential: form.forceConfidential,
        acknowledgeSlaHours: form.acknowledgeSlaHours,
        resolveSlaDays: form.resolveSlaDays,
        escalationUserId: form.escalationUserId,
        escalationAfterDays: form.escalationAfterDays,
      });
      showSuccess(category ? "Category updated" : "Category created", `"${form.name}" saved successfully.`);
      onSaved();
    } catch (err: any) {
      showError("Save failed", err?.response?.data?.message ?? err?.response?.data?.error ?? "Could not save this category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      <h5 className="mb-5">{category ? "Edit Grievance Category" : "New Grievance Category"}</h5>
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <div>
          <label className="form-label">Category Name <span className="text-rose-500">*</span></label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Harassment" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Default Severity</label>
            <select className="select w-full" value={form.defaultSeverity} onChange={(e) => set("defaultSeverity", e.target.value)}>
              {GRIEVANCE_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Sort Order</label>
            <Input type="number" value={String(form.sortOrder)} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
          </div>
        </div>
        <ToggleRow
          label="Force Confidential"
          description="Every case in this category is treated as confidential, regardless of the submitter's own choice. This overrides upward only."
          checked={form.forceConfidential}
          onChange={(v) => set("forceConfidential", v)}
        />
        <SectionTitle>SLA Targets</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Acknowledge SLA (hours)</label>
            <Input
              type="number"
              value={form.acknowledgeSlaHours === null ? "" : String(form.acknowledgeSlaHours)}
              onChange={(e) => set("acknowledgeSlaHours", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="e.g. 4"
              min={1}
            />
          </div>
          <div>
            <label className="form-label">Resolve SLA (days)</label>
            <Input
              type="number"
              value={form.resolveSlaDays === null ? "" : String(form.resolveSlaDays)}
              onChange={(e) => set("resolveSlaDays", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="e.g. 5"
              min={1}
            />
          </div>
        </div>
        <SectionTitle>Routing</SectionTitle>
        <GrievanceUserPickerField
          label="Default Assignee"
          users={users}
          value={form.defaultAssigneeUserId}
          onChange={(id) => set("defaultAssigneeUserId", id)}
          helperText="New cases in this category are auto-assigned to this user if no one else is assigned."
        />
        <div className="grid grid-cols-2 gap-4 items-start">
          <GrievanceUserPickerField
            label="Escalation Contact"
            users={users}
            value={form.escalationUserId}
            onChange={(id) => set("escalationUserId", id)}
          />
          <div>
            <label className="form-label">Escalate After (days past deadline)</label>
            <Input
              type="number"
              value={form.escalationAfterDays === null ? "" : String(form.escalationAfterDays)}
              onChange={(e) => set("escalationAfterDays", e.target.value === "" ? null : Number(e.target.value))}
              min={1}
              disabled={!form.escalationUserId}
              placeholder={form.escalationUserId ? "e.g. 3" : "Pick an escalation contact first"}
            />
          </div>
        </div>
        {escalationMismatch && (
          <p className="text-xs text-rose-500">Escalation contact and escalation window must be set together, or both left empty.</p>
        )}
        {category && (
          <ToggleRow
            label="Active"
            description={
              category.caseCount > 0
                ? `This category has ${category.caseCount} case(s) and cannot be deleted — deactivating hides it from new intake without affecting existing cases.`
                : "Inactive categories are hidden from new intake but existing cases are unaffected."
            }
            checked={form.isActive}
            onChange={(v) => set("isActive", v)}
          />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="plain" onClick={onClose}>Cancel</Button>
        <Button variant="solid" color="primary" loading={saving} onClick={handleSave}>
          {category ? "Save Changes" : "Create Category"}
        </Button>
      </div>
    </Dialog>
  );
}

function GrievanceSettingsTab({ canManage }: { canManage: boolean }) {
  type InnerTab = "categories" | "policy" | "notifications";
  const [inner, setInner] = useState<InnerTab>("categories");

  const [categories, setCategories] = useState<GrievanceCategoryRow[]>([]);
  const [users, setUsers] = useState<GrievanceUserOption[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GrievanceCategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrievanceCategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [policy, setPolicy] = useState<GrievancePolicyForm | null>(null);
  const [policyOriginal, setPolicyOriginal] = useState<GrievancePolicyForm | null>(null);
  const [policySaving, setPolicySaving] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadCategories();
    loadUsers();
    loadPolicy();
  }, []);

  async function loadCategories() {
    setCatLoading(true);
    try {
      const res = await axios.get("/grievance-config/categories", { params: { activeOnly: false } });
      setCategories(
        res.data.map((c: any) => ({
          ...c,
          id: String(c.id),
          defaultAssigneeUserId: c.defaultAssigneeUserId != null ? String(c.defaultAssigneeUserId) : null,
          escalationUserId: c.escalationUserId != null ? String(c.escalationUserId) : null,
        })),
      );
    } catch (err: any) {
      showError("Load failed", err?.response?.data?.error ?? "Could not load grievance categories.");
    } finally {
      setCatLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await axios.get("/users");
      setUsers(res.data.map((u: any) => ({ id: String(u.id), email: u.email, firstName: u.firstName, lastName: u.lastName })));
    } catch {
      // Non-fatal — category list still works, only the pickers degrade.
    }
  }

  async function loadPolicy() {
    try {
      const res = await axios.get("/grievance-config/policy");
      setPolicy(res.data);
      setPolicyOriginal(res.data);
    } catch (err: any) {
      showError("Load failed", err?.response?.data?.error ?? "Could not load grievance policy.");
    }
  }

  function setPolicyField<K extends keyof GrievancePolicyForm>(key: K, value: GrievancePolicyForm[K]) {
    setPolicy((f) => (f ? { ...f, [key]: value } : f));
  }

  const policyDirty = policy && policyOriginal && JSON.stringify(policy) !== JSON.stringify(policyOriginal);

  async function handleSavePolicy() {
    if (!policy) return;
    setPolicySaving(true);
    try {
      await axios.post("/grievance-config/policy/save", {
        moduleEnabled: policy.moduleEnabled,
        allowAnonymous: policy.allowAnonymous,
        allowEmployeeWithdraw: policy.allowEmployeeWithdraw,
        requireResolutionNotes: policy.requireResolutionNotes,
        satisfactionCaptureEnabled: policy.satisfactionCaptureEnabled,
        autoCloseAfterDays: policy.autoCloseAfterDays,
        slaWarningThresholdPct: policy.slaWarningThresholdPct,
        notifyOnAssigned: policy.notifyOnAssigned,
        notifyOnStatusChange: policy.notifyOnStatusChange,
        notifyOnSlaWarning: policy.notifyOnSlaWarning,
        notifyOnSlaBreach: policy.notifyOnSlaBreach,
      });
      showSuccess("Policy saved", "Grievance policy updated successfully.");
      await loadPolicy();
    } catch (err: any) {
      showError("Save failed", err?.response?.data?.error ?? "Could not save grievance policy.");
    } finally {
      setPolicySaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.post("/grievance-config/categories/save", { id: deleteTarget.id, action: "DELETE" });
      showSuccess("Category deleted", `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      loadCategories();
    } catch (err: any) {
      showError("Delete failed", err?.response?.data?.message ?? err?.response?.data?.error ?? "This category may have existing cases — deactivate it instead.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(["categories", "policy", "notifications"] as InnerTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setInner(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              inner === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "categories" ? "Categories" : t === "policy" ? "General Policy" : "Notification Hooks"}
          </button>
        ))}
      </div>

      {inner === "categories" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
              Categories drive default severity, confidentiality, SLA targets, and auto-routing for new grievance cases.
            </p>
            {canManage && (
              <Button size="sm" variant="solid" color="primary" icon={<Plus size={14} />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
                New Category
              </Button>
            )}
          </div>
          {catLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Name</th><th>Severity</th><th>SLA (Ack / Resolve)</th><th>Default Assignee</th><th>Escalation</th><th>Cases</th><th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No categories configured yet.</td></tr>
                ) : (
                  categories.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((cat) => (
                    <tr key={cat.id}>
                      <td className="font-medium">
                        {cat.name}
                        {cat.forceConfidential && <ShieldCheck size={13} className="inline ml-1.5 text-amber-500" aria-label="Force confidential" />}
                      </td>
                      <td className="text-sm">{cat.defaultSeverity}</td>
                      <td className="text-sm whitespace-nowrap">
                        {cat.acknowledgeSlaHours ? `${cat.acknowledgeSlaHours}h` : "—"} / {cat.resolveSlaDays ? `${cat.resolveSlaDays}d` : "—"}
                      </td>
                      <td className="text-sm">{cat.defaultAssigneeName ?? "—"}</td>
                      <td className="text-sm">{cat.escalationUserName ? `${cat.escalationUserName} (+${cat.escalationAfterDays}d)` : "—"}</td>
                      <td className="text-sm">{cat.caseCount}</td>
                      <td><span className={`xp-badge ${cat.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}>{cat.isActive ? "Active" : "Inactive"}</span></td>
                      {canManage && (
                        <td>
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" onClick={() => { setEditing(cat); setDialogOpen(true); }} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 disabled:opacity-30 disabled:hover:bg-transparent"
                              onClick={() => setDeleteTarget(cat)}
                              disabled={cat.caseCount > 0}
                              title={cat.caseCount > 0 ? "Has cases — deactivate instead" : "Delete"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          <GrievanceCategoryDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSaved={() => { setDialogOpen(false); loadCategories(); }}
            category={editing}
            users={users}
          />
          {deleteTarget && (
            <Dialog isOpen onClose={() => setDeleteTarget(null)} onRequestClose={() => setDeleteTarget(null)}>
              <h5 className="mb-3">Delete Category</h5>
              <p className="text-sm text-gray-600 dark:text-gray-300">Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="plain" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="solid" loading={deleting} className="bg-red-500 hover:bg-red-600" onClick={handleDeleteCategory}>Delete</Button>
              </div>
            </Dialog>
          )}
        </div>
      )}

      {inner === "policy" && (
        policy ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
                  Governs module-wide grievance behaviour — anonymity, withdrawal, resolution requirements, and SLA warning thresholds.
                </p>
                {policy.updatedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated {new Date(policy.updatedAt).toLocaleString()}{policy.updatedByName ? ` by ${policy.updatedByName}` : ""}
                  </p>
                )}
              </div>
              {canManage && (
                <Button variant="solid" size="sm" loading={policySaving} disabled={!policyDirty} onClick={handleSavePolicy}>
                  {policyDirty ? "Save Changes" : "Saved"}
                </Button>
              )}
            </div>
            <SectionTitle>Module</SectionTitle>
            <ToggleRow
              label="Grievance Module"
              description="When off, no new grievances can be submitted through any channel. Existing cases remain visible and actionable."
              checked={policy.moduleEnabled}
              onChange={(v) => setPolicyField("moduleEnabled", v)}
              disabled={!canManage}
            />
            <SectionTitle>Submission</SectionTitle>
            <ToggleRow
              label="Allow Anonymous Submissions"
              description="Employees may submit a grievance without their identity being captured anywhere, including the audit trail."
              checked={policy.allowAnonymous}
              onChange={(v) => setPolicyField("allowAnonymous", v)}
              disabled={!canManage}
            />
            <ToggleRow
              label="Allow Employee Withdrawal"
              description="A complainant may withdraw their own open or in-progress case. Anonymous cases can never be withdrawn."
              checked={policy.allowEmployeeWithdraw}
              onChange={(v) => setPolicyField("allowEmployeeWithdraw", v)}
              disabled={!canManage}
            />
            <SectionTitle>Resolution</SectionTitle>
            <ToggleRow
              label="Require Resolution Notes"
              description="A case cannot be marked Resolved without written notes explaining the outcome."
              checked={policy.requireResolutionNotes}
              onChange={(v) => setPolicyField("requireResolutionNotes", v)}
              disabled={!canManage}
            />
            <ToggleRow
              label="Capture Satisfaction Rating"
              description="Allow the complainant to rate their resolved or closed case from 1–5. Anonymous cases are never eligible."
              checked={policy.satisfactionCaptureEnabled}
              onChange={(v) => setPolicyField("satisfactionCaptureEnabled", v)}
              disabled={!canManage}
            />
            <div className="mt-4">
              <label className="form-label">Auto-Close After (days)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={policy.autoCloseAfterDays === null ? "" : String(policy.autoCloseAfterDays)}
                  onChange={(e) => setPolicyField("autoCloseAfterDays", e.target.value === "" ? null : Number(e.target.value))}
                  disabled={!canManage}
                  className="w-32"
                  min={1}
                  placeholder="Off"
                />
                <span className="text-sm text-gray-500">days after resolution, if the complainant takes no further action</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave blank to disable auto-close entirely.</p>
            </div>
            <SectionTitle>SLA</SectionTitle>
            <div>
              <label className="form-label">Warning Threshold</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={99}
                  step={1}
                  value={policy.slaWarningThresholdPct}
                  onChange={(e) => setPolicyField("slaWarningThresholdPct", Number(e.target.value))}
                  disabled={!canManage}
                  className="flex-1 accent-primary"
                />
                <span className="w-14 text-center font-semibold text-primary tabular-nums">{policy.slaWarningThresholdPct}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                A warning fires once this percentage of the acknowledge or resolve window has elapsed without action. A case already past its deadline goes straight to breach.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />)}</div>
        )
      )}

      {inner === "notifications" && (
        policy ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
                Controls which grievance events send an email. These flags don't stop the underlying stamp or action — they only suppress the message.
              </p>
              {canManage && (
                <Button variant="solid" size="sm" loading={policySaving} disabled={!policyDirty} onClick={handleSavePolicy}>
                  {policyDirty ? "Save Changes" : "Saved"}
                </Button>
              )}
            </div>
            <ToggleRow label="Case Assigned" description="Notify the assignee when a case is routed or reassigned to them." checked={policy.notifyOnAssigned} onChange={(v) => setPolicyField("notifyOnAssigned", v)} disabled={!canManage} />
            <ToggleRow label="Status Change" description="Notify relevant parties when a case moves between statuses." checked={policy.notifyOnStatusChange} onChange={(v) => setPolicyField("notifyOnStatusChange", v)} disabled={!canManage} />
            <ToggleRow label="SLA Warning" description="Send an email when a case crosses the SLA warning threshold, before it breaches." checked={policy.notifyOnSlaWarning} onChange={(v) => setPolicyField("notifyOnSlaWarning", v)} disabled={!canManage} />
            <ToggleRow label="SLA Breach" description="Send an email the moment a case passes its acknowledge or resolve deadline." checked={policy.notifyOnSlaBreach} onChange={(v) => setPolicyField("notifyOnSlaBreach", v)} disabled={!canManage} />
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Auto-close never sends an email in this version. Escalation always notifies the escalation contact regardless of these toggles.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />)}</div>
        )
      )}
    </div>
  );
}

// ── Tab: Notifications ─────────────────────────────────────────────────────────
function NotificationsTab({
  data,
  set,
  canManage,
}: {
  data: CompanySettings;
  set: <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => void;
  canManage: boolean;
}) {
  return (
    <div className="space-y-2">
      <SectionTitle>Notification Triggers</SectionTitle>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
        Control which system events trigger email or SMS notifications.
        Individual templates are managed under Master Data → Notification
        Templates.
      </p>

      <ToggleRow
        label="Payslip Ready"
        description="Send email to employee when their payslip is generated after a payroll run."
        checked={data.notifyPayslipEmail}
        onChange={(v) => set("notifyPayslipEmail", v)}
        disabled={!canManage}
      />
      <ToggleRow
        label="Leave Decision"
        description="Notify employee via email and SMS when their leave request is approved or rejected."
        checked={data.notifyLeaveDecision}
        onChange={(v) => set("notifyLeaveDecision", v)}
        disabled={!canManage}
      />
      <ToggleRow
        label="Attendance Alerts"
        description="Notify HR when an employee is marked absent or late beyond the grace period."
        checked={data.notifyAttendanceAlert}
        onChange={(v) => set("notifyAttendanceAlert", v)}
        disabled={!canManage}
      />
      <ToggleRow
        label="Loan Approval"
        description="Notify employee when their loan record is approved or status changes."
        checked={data.notifyLoanApproval}
        onChange={(v) => set("notifyLoanApproval", v)}
        disabled={!canManage}
      />

      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> New user welcome emails (with temporary
          password) are always sent regardless of these toggles. Mail server and
          SMS provider are configured in{" "}
          <code className="font-mono">appsettings.json</code>.
        </p>
      </div>
    </div>
  );
}

// ── Tab: System Status ─────────────────────────────────────────────────────────
function SystemTab({ data }: { data: CompanySettings }) {
  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 font-mono">
          {value}
        </span>
      </div>
    );
  }

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleString("en-LK", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="space-y-6">
      <SectionTitle>System Information</SectionTitle>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 px-4">
        <InfoRow label="Company ID" value={data.id} />
        <InfoRow label="Database Record" value="company_settings" />
        <InfoRow label="Created At" value={fmt(data.createdAt)} />
        <InfoRow label="Last Updated" value={fmt(data.updatedAt)} />
        <InfoRow label="Status" value={data.isActive ? "Active" : "Inactive"} />
        <InfoRow label="Payroll Cycle" value={data.payrollCycleType} />
        <InfoRow label="Timezone" value={data.timezone} />
        <InfoRow label="Currency" value={data.currency} />
      </div>

      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          System status information is read-only. Contact your system
          administrator to change infrastructure-level settings.
        </p>
      </div>
    </div>
  );
}