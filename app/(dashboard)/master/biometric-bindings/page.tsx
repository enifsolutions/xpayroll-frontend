"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import {
  Fingerprint,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
  Users,
  ShieldCheck,
  AlertTriangle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import { Permissions } from "@/lib/permissions";

/* ─────────────────────────────── types ────────────────────────────────── */

interface Binding {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string | null;
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  identifierType: string;
  identifierValue: string;
  fingerIndex: number | null;
  hasTemplate: boolean;
  templateFormat: string | null;
  status: string;
  enrolledAt: string;
  lastVerifiedAt: string | null;
}

interface Device {
  id: string;
  name: string;
  deviceCode: string;
}

interface Stats {
  totalBindings: number;
  activeUsers: number;
  missingBindings: number;
  syncHealth: number;
}

/* ─────────────────────────────── constants ─────────────────────────────── */

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  Active: "xp-badge-success",
  Inactive: "xp-badge-neutral",
  Unverified: "xp-badge-warning",
};

const IDENTIFIER_COLORS: Record<string, string> = {
  FaceID:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  Fingerprint:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "NFC Card":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Card: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PIN: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const FINGER_LABELS: Record<number, string> = {
  0: "R.Thumb",
  1: "R.Index",
  2: "R.Middle",
  3: "R.Ring",
  4: "R.Little",
  5: "L.Thumb",
  6: "L.Index",
  7: "L.Middle",
  8: "L.Ring",
  9: "L.Little",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-pink-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function identifierTypeLabel(raw: string) {
  if (!raw) return raw;
  const map: Record<string, string> = {
    EmployeeCode: "FaceID",
    CardNumber: "NFC Card",
    NationalId: "National ID",
    EmployeeId: "Fingerprint",
  };
  return map[raw] ?? raw;
}

/* ─────────────────────────────── stat card ─────────────────────────────── */

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  subColor: string;
  iconBg: string;
  iconColor: string;
}
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  iconBg,
  iconColor,
}: StatCardProps) {
  return (
    <div className="card flex-1 min-w-0">
      <div className="card-body flex items-center gap-4 py-4 px-5">
        <div className={`rounded-xl p-3 ${iconBg} flex-shrink-0`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {value}
          </p>
          <p className={`text-xs font-medium mt-0.5 ${subColor}`}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── page ─────────────────────────────────── */

export default function BiometricBindingsPage() {
  useRequirePermission(Permissions.Biometric.Binding.View);
  const canManage = usePermission(Permissions.Biometric.Binding.Manage);
  const userId = useAuthStore((s) => s.user?.userId);

  const [bindings, setBindings] = useState<Binding[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const initialized = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const [bRes, dRes, sRes] = await Promise.all([
        api.get<Binding[]>("/biometric-bindings"),
        api.get<Device[]>("/devices", { params: { isActive: true } }),
        api.get<Stats>("/biometric-bindings/stats"),
      ]);
      setBindings(bRes.data);
      setDevices(dRes.data);
      setStats(sRes.data);
    } catch {
      showError("Load failed", "Could not load biometric bindings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const handleDelete = async (b: Binding) => {
    if (!confirm(`Remove binding for ${b.employeeName} on ${b.deviceName}?`))
      return;
    try {
      await api.post("/biometric-bindings/save", {
        action: "DELETE",
        id: b.id,
        userId,
      });
      await load();
      showSuccess("Binding removed", `${b.employeeName} — ${b.deviceName}`);
    } catch {
      showError("Delete failed", "Could not remove binding.");
    }
  };

  /* filters */
  const filtered = bindings.filter((b) => {
    if (deviceFilter && b.deviceId !== deviceFilter) return false;
    if (statusFilter && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !b.employeeName.toLowerCase().includes(q) &&
        !b.employeeCode.toLowerCase().includes(q) &&
        !b.identifierValue.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onDevice = (v: string) => {
    setDeviceFilter(v);
    setPage(1);
  };
  const onStatus = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  /* page number buttons */
  function pageNumbers(cur: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "…", total];
    if (cur >= total - 3)
      return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "…", cur - 1, cur, cur + 1, "…", total];
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Biometric Bindings</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and sync employee biometric identifiers across all terminal
            devices.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              /* open add dialog */
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Add Binding
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="flex gap-4 mb-6">
        <StatCard
          icon={Fingerprint}
          label="Total Bindings"
          value={stats?.totalBindings?.toLocaleString() ?? "—"}
          sub="+12% vs last month"
          subColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats ? `${stats.activeUsers}%` : "—"}
          sub="Stable"
          subColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Missing Bindings"
          value={stats?.missingBindings ?? "—"}
          sub="Action Needed"
          subColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          icon={Activity}
          label="Sync Health"
          value={stats ? `${stats.syncHealth}%` : "—"}
          sub="Healthy"
          subColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body p-0">
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                className="input input-md pl-9 w-full"
                placeholder="Search employee or identifier..."
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>

            <select
              className="input input-md min-w-[160px]"
              value={deviceFilter}
              onChange={(e) => onDevice(e.target.value)}
            >
              <option value="">All Devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.deviceCode})
                </option>
              ))}
            </select>

            <select
              className="input input-md min-w-[140px]"
              value={statusFilter}
              onChange={(e) => onStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Unverified">Unverified</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={load}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} />
              </button>
              <button
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Export"
              >
                <Download size={15} />
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400 gap-2">
              <Fingerprint size={40} strokeWidth={1.2} />
              <p className="text-sm">No bindings found.</p>
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Binding Type</th>
                    <th>Device Group</th>
                    <th>Finger</th>
                    <th>Template</th>
                    <th>Last Sync</th>
                    <th>Status</th>
                    {canManage && <th className="w-20 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => {
                    const typeLabel = identifierTypeLabel(b.identifierType);
                    const typeCls =
                      IDENTIFIER_COLORS[typeLabel] ?? IDENTIFIER_COLORS["PIN"];
                    return (
                      <tr key={b.id}>
                        {/* Employee */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center
                              text-white text-xs font-semibold flex-shrink-0 ${avatarColor(b.employeeName)}`}
                            >
                              {getInitials(b.employeeName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                  {b.employeeName}
                                </span>
                                <Link
                                  href={`/employees/${b.employeeId}/biometric`}
                                  className="text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                                >
                                  <ExternalLink size={11} />
                                </Link>
                              </div>
                              {b.designation && (
                                <div className="text-xs text-gray-400 truncate">
                                  {b.designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td>
                          <code
                            className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800
                            px-1.5 py-0.5 rounded"
                          >
                            {b.employeeCode}
                          </code>
                        </td>

                        {/* Binding Type */}
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium
                            px-2.5 py-1 rounded-full ${typeCls}`}
                          >
                            {typeLabel === "FaceID" && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="8" r="4" />
                                <path d="M8 14s-2 1-2 4h12c0-3-2-4-2-4" />
                                <path d="M9 10.5c0 1 .5 1.5 1.5 1.5s1.5-.5 1.5-1.5" />
                                <path d="M13.5 10.5c0 1 .5 1.5 1.5 1.5" />
                              </svg>
                            )}
                            {typeLabel === "Fingerprint" && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                                <path d="M2 12a10 10 0 0 1 18-6" />
                                <path d="M2 17c.7-1.5 1-2.5 1-5a9.98 9.98 0 0 1 3-7" />
                                <path d="M20 11.5c.2 2 .5 3 1.5 4" />
                                <path d="M7 13.5c1.1.5 2 .5 2.5 2.5" />
                              </svg>
                            )}
                            {typeLabel === "NFC Card" && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect
                                  x="2"
                                  y="5"
                                  width="20"
                                  height="14"
                                  rx="2"
                                />
                                <path d="M2 10h20" />
                              </svg>
                            )}
                            {typeLabel}
                          </span>
                        </td>

                        {/* Device Group */}
                        <td>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {b.deviceName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {b.deviceCode}
                          </div>
                        </td>

                        {/* Finger */}
                        <td className="text-sm text-gray-500">
                          {b.fingerIndex !== null ? (
                            (FINGER_LABELS[b.fingerIndex] ??
                            `F${b.fingerIndex}`)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Template */}
                        <td>
                          <span
                            className={`xp-badge ${b.hasTemplate ? "xp-badge-success" : "xp-badge-neutral"}`}
                          >
                            {b.hasTemplate ? "Stored" : "None"}
                          </span>
                        </td>

                        {/* Last Sync */}
                        <td className="text-sm text-gray-500">
                          {b.lastVerifiedAt ? (
                            new Date(b.lastVerifiedAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`xp-badge ${STATUS_COLORS[b.status] ?? "xp-badge-neutral"}`}
                          >
                            {b.status}
                          </span>
                        </td>

                        {/* Actions */}
                        {canManage && (
                          <td className="text-center">
                            <button
                              onClick={() => handleDelete(b)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove binding"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  Showing{" "}
                  {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100
                               dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹
                  </button>
                  {pageNumbers(safePage, totalPages).map((n, i) =>
                    n === "…" ? (
                      <span
                        key={`e${i}`}
                        className="px-2 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                            ${
                              safePage === n
                                ? "bg-primary text-white"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100
                               dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}