'use client';

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import { showSuccess, showError } from '@/lib/toast';
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  Plus,
  Pencil,
  Building2,
  CheckCircle2,
  Star,
  Download,
  Search,
  MapPin,
  Phone,
  Mail,
  Hash,
  Users,
  CreditCard,
  Leaf,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "@/store/authStore";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { BRANCHES_STEPS } from "@/lib/tours/branches";

const MapView = dynamic(() => import('@/components/branches/BranchMapView'), { ssr: false });

interface Branch {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  absentDeductionAfterDays: number | null;
  lateDeductionPerMinute: number | null;
  overtimeRateMultiplier: number | null;
}

interface BranchMetrics {
  branchId: number;
  branchName: string;
  employeeCount: number;
  avgLeaveRemaining: number;
  totalLoanOutstanding: number;
  activeLoanCount: number;
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isHeadOffice: boolean;
  isActive: boolean;
  absentDeductionAfterDays: string;
  lateDeductionPerMinute: string;
  overtimeRateMultiplier: string;
}

const EMPTY_FORM: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  isHeadOffice: false,
  isActive: true,
  absentDeductionAfterDays: "",
  lateDeductionPerMinute: "",
  overtimeRateMultiplier: "",
};

type Tab = 'table' | 'map' | 'trends';

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function BranchesPage() {
  const tour = useTour("admin-page-branches", BRANCHES_STEPS);
  useRequirePermission(Permissions.MasterData.Branches.View);
  const canManage = usePermission(Permissions.MasterData.Branches.Manage);
  const userId = useAuthStore((s) => s.user?.userId);

  const initialized = useRef(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [metrics, setMetrics] = useState<BranchMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [activeTab, setActiveTab] = useState<Tab>("table");

  const load = async () => {
    try {
      setLoading(true);
      const [{ data: b }, { data: m }] = await Promise.all([
        api.get<Branch[]>("/branches"),
        api.get<BranchMetrics[]>("/branches/metrics"),
      ]);
      setBranches(b);
      setMetrics(m);
    } catch (err:any){
      showError(
        "Failed to load",
        err?.response?.data?.error ?? "Could not load branches.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code ?? "",
      address: b.address ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      isHeadOffice: b.isHeadOffice,
      isActive: b.isActive,
      absentDeductionAfterDays: b.absentDeductionAfterDays?.toString() ?? "",
      lateDeductionPerMinute: b.lateDeductionPerMinute?.toString() ?? "",
      overtimeRateMultiplier: b.overtimeRateMultiplier?.toString() ?? "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Branch name is required.");
      return;
    }
    setSaving(true);
    setError("");

    let lat: number | null = null;
    let lng: number | null = null;
    setGeocoding(true);
    const geoQuery = form.address.trim() || form.name.trim();
    const coords = await geocode(geoQuery);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
    setGeocoding(false);

    try {
      await api.post("/branches", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        isHeadOffice: form.isHeadOffice,
        isActive: form.isActive,
        latitude: lat,
        longitude: lng,
        absentDeductionAfterDays: form.absentDeductionAfterDays
          ? parseInt(form.absentDeductionAfterDays)
          : null,
        lateDeductionPerMinute: form.lateDeductionPerMinute
          ? parseFloat(form.lateDeductionPerMinute)
          : null,
        overtimeRateMultiplier: form.overtimeRateMultiplier
          ? parseFloat(form.overtimeRateMultiplier)
          : null,
        userId,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Branch updated" : "Branch created",
        form.name.trim(),
      );
    } catch (err:any){
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save branch.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Code",
      "Phone",
      "Email",
      "Address",
      "Head Office",
      "Status",
      "Latitude",
      "Longitude",
    ];
    const rows = filtered.map((b) => [
      b.name,
      b.code ?? "",
      b.phone ?? "",
      b.email ?? "",
      b.address ?? "",
      b.isHeadOffice ? "Yes" : "No",
      b.isActive ? "Active" : "Inactive",
      b.latitude ?? "",
      b.longitude ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branches.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const headOffice = branches.find((b) => b.isHeadOffice);
  const unmapped = branches.filter((b) => !b.latitude).length;

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.code ?? "").toLowerCase().includes(q) ||
      (b.email ?? "").toLowerCase().includes(q) ||
      (b.phone ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && b.isActive) ||
      (statusFilter === "inactive" && !b.isActive);
    return matchSearch && matchStatus;
  });

  const chartData = metrics.map((m) => ({
    name:
      m.branchName.length > 12 ? m.branchName.slice(0, 12) + "…" : m.branchName,
    "Avg Leave Remaining": Number(m.avgLeaveRemaining),
    "Active Loans": Number(m.activeLoanCount),
    "Loan Outstanding": Number(m.totalLoanOutstanding),
    employees: m.employeeCount,
  }));

  const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "table", label: "Branch List", Icon: Building2 },
    { key: "map", label: "Regional Distribution", Icon: MapPin },
    { key: "trends", label: "Growth Trends", Icon: Users },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="h3">Branches</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage your company branch network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            data-tour="branches-export-button"
          >
            <Download size={14} />
            Export CSV
          </button>
          {canManage && (
            <Button
              variant="solid"
              icon={<Plus size={15} />}
              onClick={openAdd}
              data-tour="branches-add-button"
            >
              Add Branch
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Total Branches
              </p>
              <p className="text-2xl font-semibold heading-text leading-none mt-0.5">
                {totalBranches}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Active Locations
              </p>
              <p className="text-2xl font-semibold heading-text leading-none mt-0.5">
                {activeBranches}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  / {totalBranches}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
              <Star size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Head Office
              </p>
              <p className="text-sm font-semibold heading-text leading-snug mt-0.5 truncate max-w-[160px]">
                {headOffice ? (
                  headOffice.name
                ) : (
                  <span className="text-gray-400 font-normal">Not set</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-700">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            data-tour={
              key === "map"
                ? "branches-tab-map"
                : key === "trends"
                  ? "branches-tab-trends"
                  : undefined
            }
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "table" && (
        <div className="card">
          <div className="card-body border-b border-gray-100 dark:border-gray-700 pb-4">
            <div
              className="flex items-center gap-3"
              data-tour="branches-search-panel"
            >
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-full pl-8 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "inactive",
                  )
                }
                className="input text-sm w-36"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="ml-auto text-xs text-gray-400">
                {filtered.length} of {totalBranches} branch
                {totalBranches !== 1 ? "es" : ""}
              </span>
            </div>
          </div>

          <div className="card-body pt-0" data-tour="branches-table">
            {loading ? (
              <div className="flex justify-center py-14">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14">
                <Building2
                  size={36}
                  className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search || statusFilter !== "all"
                    ? "No branches match your filters."
                    : "No branches yet. Add your first branch to get started."}
                </p>
              </div>
            ) : (
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-400" />
                        Name
                      </span>
                    </th>
                    <th>
                      <span className="flex items-center gap-1.5">
                        <Hash size={13} className="text-gray-400" />
                        Code
                      </span>
                    </th>
                    <th>
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        Phone
                      </span>
                    </th>
                    <th>
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-gray-400" />
                        Email
                      </span>
                    </th>
                    <th>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" />
                        Address
                      </span>
                    </th>
                    <th>Status</th>
                    {canManage && <th className="w-20 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 text-xs font-bold">
                            {b.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium heading-text text-sm leading-tight">
                              {b.name}
                            </p>
                            {b.isHeadOffice && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
                                <Star size={9} />
                                Head Office
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {b.code ? (
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                            {b.code}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                      <td className="text-sm">
                        {b.phone ?? (
                          <span className="text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                      <td className="text-sm">
                        {b.email ?? (
                          <span className="text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                      <td className="text-sm max-w-[180px] truncate text-gray-500 dark:text-gray-400">
                        {b.address ?? (
                          <span className="text-gray-300 dark:text-gray-600">
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${b.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                        >
                          {b.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="text-center">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-violet-600 dark:hover:bg-gray-700 dark:hover:text-violet-400 transition-colors"
                            title="Edit branch"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "map" && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium heading-text text-sm">
                  Regional Distribution
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Branch locations across your network ·{" "}
                  {totalBranches - unmapped} of {totalBranches} mapped
                </p>
              </div>
              {unmapped > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                  {unmapped} branch{unmapped > 1 ? "es" : ""} not yet geocoded —
                  re-save to pin
                </span>
              )}
            </div>
            <div
              className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700"
              style={{ height: 460 }}
              data-tour="branches-map-view"
            >
              <MapView branches={branches} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-body" data-tour="branches-trends-chart">
              <div className="flex items-center gap-2 mb-1">
                <Leaf size={15} className="text-emerald-500" />
                <p className="font-medium heading-text text-sm">
                  Average Leave Remaining by Branch
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Average leave days remaining per active employee · current year
              </p>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : chartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [
                        `${v} days`,
                        "Avg Leave Remaining",
                      ]}
                    />
                    <Bar
                      dataKey="Avg Leave Remaining"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={15} className="text-violet-500" />
                <p className="font-medium heading-text text-sm">
                  Loan Repayments by Branch
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Total outstanding loan balance across active loans per branch ·
                LKR
              </p>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : chartData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No data available
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [
                        `LKR ${v.toLocaleString()}`,
                        "Outstanding Balance",
                      ]}
                    />
                    <Bar
                      dataKey="Loan Outstanding"
                      fill="#7c3aed"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={15} className="text-blue-500" />
                  <p className="font-medium heading-text text-sm">
                    Headcount by Branch
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Active employees
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [v, "Employees"]}
                    />
                    <Bar
                      dataKey="employees"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={15} className="text-rose-500" />
                  <p className="font-medium heading-text text-sm">
                    Active Loans by Branch
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Count of active loan records
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border-tertiary)"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [v, "Active Loans"]}
                    />
                    <Bar
                      dataKey="Active Loans"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={640}
      >
        <h5 className="h5 mb-1">{editing ? "Edit Branch" : "Add Branch"}</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {editing
            ? `Update details for ${editing.name}`
            : "Fill in the details to register a new branch. Location is resolved automatically from the address."}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Branch Name <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Colombo Head Office"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Branch Code</label>
              <Input
                placeholder="e.g. CMB01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Address
              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                · used to auto-resolve map location
              </span>
            </label>
            <Input
              placeholder="e.g. No. 1, Main Street, Colombo 03"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <Input
                placeholder="e.g. +94 11 234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <Input
                type="email"
                placeholder="e.g. colombo@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Deduction Rule Overrides
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Optional. Leave blank to use the Company default (or whichever
              hierarchy channel is configured in Company Settings).
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Absent Deduct After (days)</label>
                <Input
                  type="number"
                  placeholder="Company default"
                  value={form.absentDeductionAfterDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      absentDeductionAfterDays: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Late Deduct / Minute</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Company default"
                  value={form.lateDeductionPerMinute}
                  onChange={(e) =>
                    setForm({ ...form, lateDeductionPerMinute: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">OT Rate Multiplier</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Company default"
                  value={form.overtimeRateMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, overtimeRateMultiplier: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <Switcher
                checked={form.isHeadOffice}
                onChange={(val) => setForm({ ...form, isHeadOffice: val })}
              />
              <span className="text-sm font-medium heading-text">
                Head Office
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Switcher
                checked={form.isActive}
                onChange={(val) => setForm({ ...form, isActive: val })}
              />
              <span className="text-sm font-medium heading-text">Active</span>
            </label>
          </div>

          {geocoding && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
              Resolving location from address…
            </div>
          )}

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update Branch" : "Create Branch"}
          </Button>
        </div>
      </Dialog>

      {tour.visible && (
        <TourOverlay
          step={tour.step}
          stepIndex={tour.stepIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onPrev={tour.prev}
          onDismiss={tour.dismiss}
          nextStepTarget={tour.nextStep?.target}
        />
      )}
    </div>
  );
}
