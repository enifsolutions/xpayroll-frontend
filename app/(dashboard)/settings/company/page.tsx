"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Settings2,
  CalendarDays,
  Bell,
  Activity,
  Save,
  Upload,
  X,
  ChevronRight,
  ShieldAlert,
  Rocket,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
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

type TabKey = "profile" | "payroll" | "leave" | "notifications" | "system";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Company Profile", icon: <Building2 size={16} /> },
  { key: "payroll", label: "Payroll & HR", icon: <Settings2 size={16} /> },
  { key: "leave", label: "Leave Policy", icon: <CalendarDays size={16} /> },
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
const DEDUCTION_SOURCES = ["Company", "Branch", "Department", "Designation"];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompanySettingsPage() {
  useRequirePermission(Permissions.Settings.Company.View);
  const canManage = usePermission(Permissions.Settings.Company.Manage);
  const canCreate = usePermission(Permissions.Settings.Company.Create);
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
        financialYearStart: d.financialYearStart ?? "01-01",
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
    } catch {
      showError("Failed to load company settings.");
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
      showError(err?.response?.data?.error ?? "Failed to save settings.");
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
              <Field label="Financial Year Start (MM-DD)">
                <Input
                  value={createForm.financialYearStart}
                  onChange={(e) =>
                    setCreateField("financialYearStart", e.target.value)
                  }
                  placeholder="01-01"
                  maxLength={5}
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
        {canManage && !isSystem && (
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
        <Field label="Financial Year Start (MM-DD)">
          <Input
            value={data.financialYearStart}
            onChange={(e) => set("financialYearStart", e.target.value)}
            disabled={!canManage}
            placeholder="01-01"
            maxLength={5}
          />
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
