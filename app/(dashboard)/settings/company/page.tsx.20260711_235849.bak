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
  // Audit
  createdAt: string;
  updatedAt: string | null;
}

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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompanySettingsPage() {
  useRequirePermission(Permissions.Settings.Company.View);
  const canManage = usePermission(Permissions.Settings.Company.Manage);
  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [data, setData] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
        leaveYearStartMonth: d.leaveYearStartMonth ?? 1,
        leaveCarryForwardEnabled: d.leaveCarryForwardEnabled ?? true,
        leaveCarryForwardMaxDays: d.leaveCarryForwardMaxDays ?? 0,
        leaveAdvanceNoticeDays: d.leaveAdvanceNoticeDays ?? 1,
        notifyPayslipEmail: d.notifyPayslipEmail ?? true,
        notifyLeaveDecision: d.notifyLeaveDecision ?? true,
        notifyAttendanceAlert: d.notifyAttendanceAlert ?? false,
        notifyLoanApproval: d.notifyLoanApproval ?? true,
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
        leaveYearStartMonth: data.leaveYearStartMonth,
        leaveCarryForwardEnabled: data.leaveCarryForwardEnabled,
        leaveCarryForwardMaxDays: data.leaveCarryForwardMaxDays,
        leaveAdvanceNoticeDays: data.leaveAdvanceNoticeDays,
        notifyPayslipEmail: data.notifyPayslipEmail,
        notifyLeaveDecision: data.notifyLeaveDecision,
        notifyAttendanceAlert: data.notifyAttendanceAlert,
        notifyLoanApproval: data.notifyLoanApproval,
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
