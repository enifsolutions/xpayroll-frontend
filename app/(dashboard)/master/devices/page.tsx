'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import {
  PlusIcon, Pencil, Trash2, Search, Wifi, WifiOff,
  Fingerprint, CreditCard, QrCode, Cpu, RefreshCw,
} from 'lucide-react';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';

/* ─────────────────────────────────── types ────────────────────────────── */

interface Branch {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  deviceCode: string;
  deviceType: string;
  protocol: string | null;
  branchId: string | null;
  branchName: string | null;
  locationTag: string | null;
  isActive: boolean;
  punchMode: string;
  identifierType: string;
  syncIntervalMinutes: number;
  timezone: string;
  isupDeviceId: string | null;
  deviceIp: string | null;
  devicePort: number | null;
  lastSyncAt: string | null;
  lastHeartbeatAt: string | null;
  registeredAt: string;
}

interface DeviceForm {
  name: string;
  deviceCode: string;
  deviceType: string;
  protocol: string;
  branchId: string;
  locationTag: string;
  apiToken: string;
  isActive: boolean;
  punchMode: string;
  identifierType: string;
  syncIntervalMinutes: string;
  timezone: string;
  isupDeviceId: string;
  isupKey: string;
  deviceIp: string;
  devicePort: string;
}

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  active: number;
}

/* ─────────────────────────────────── constants ─────────────────────────── */

const EMPTY: DeviceForm = {
  name: "",
  deviceCode: "",
  deviceType: "Biometric",
  protocol: "ZktecoAdms",
  branchId: "",
  locationTag: "",
  apiToken: "",
  isActive: true,
  punchMode: "ExplicitType",
  identifierType: "EmployeeCode",
  syncIntervalMinutes: "60",
  timezone: "Asia/Colombo",
  isupDeviceId: "",
  isupKey: "",
  deviceIp: "",
  devicePort: "80",
};

const DEVICE_TYPE_OPTIONS = [
  { value: 'Biometric', label: 'Biometric' },
  { value: 'QrCode',    label: 'QR Code'   },
  { value: 'Nfc',       label: 'NFC'       },
];

const PROTOCOL_OPTIONS = [
  {
    value: "ZktecoAdms",
    label: "ZKTeco ADMS",
    desc: "Device pushes to your server (iClock)",
  },
  {
    value: "HikVisionIsup",
    label: "HikVision ISUP 5.0",
    desc: "Device connects via TCP (port 7660)",
  },
  {
    value: "HikVisionIsapi",
    label: "HikVision ISAPI",
    desc: "Server polls device (requires static IP)",
  },
];

const PUNCH_MODE_OPTIONS = [
  {
    value: "ExplicitType",
    label: "Explicit Type",
    desc: "Device sends CheckIn/CheckOut explicitly",
  },
  {
    value: "AlternatingPunch",
    label: "Alternating Punch",
    desc: "First punch = In, second = Out",
  },
  {
    value: "FirstLastPunch",
    label: "First / Last Punch",
    desc: "First of day = In, last = Out",
  },
];

const IDENTIFIER_TYPE_OPTIONS = [
  { value: 'EmployeeCode', label: 'Employee Code' },
  { value: 'EmployeeId',   label: 'Employee ID'   },
  { value: 'CardNumber',   label: 'Card Number'   },
  { value: 'NationalId',   label: 'National ID'   },
];

const PROTOCOL_BADGE: Record<string, string> = {
  ZktecoAdms: "xp-badge-success",
  HikVisionIsup: "xp-badge-info",
  HikVisionIsapi: "xp-badge-warning",
};

const TIMEZONES = [
  'UTC', 'Asia/Colombo', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
];

const PAGE_SIZE = 10;

/* ─────────────────────────────────── helpers ───────────────────────────── */

function heartbeatStatus(
  ts: string | null,
): "online" | "idle" | "offline" | "never" {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5 * 60_000) return "online";
  if (diff < 30 * 60_000) return "idle";
  return "offline";
}

function protocolLabel(p: string | null) {
  return PROTOCOL_OPTIONS.find(o => o.value === p)?.label ?? p ?? '—';
}

function punchModeLabel(m: string) {
  return PUNCH_MODE_OPTIONS.find(o => o.value === m)?.label ?? m;
}

/* Avatar icon square — same hash-color approach as Designations */
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function DeviceIcon({ type, seed }: { type: string; seed: string }) {
  const cls = avatarColor(seed);
  const Icon = type === 'QrCode' ? QrCode : type === 'Nfc' ? CreditCard : Fingerprint;
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cls}`}>
      <Icon size={17} />
    </div>
  );
}

/* ─────────────────────────────────── stat card ─────────────────────────── */

function StatCard({
  label, value, sub, subColor, icon, iconColor,
}: {
  label: string;
  value: number | string;
  sub?: string;
  subColor?: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="card">
      <div className="card-body py-4 px-5">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium truncate">
              {label}
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
              {value}
            </p>
            {sub && (
              <p className={`text-xs mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── page ──────────────────────────────── */

export default function DevicesPage() {
  useRequirePermission(Permissions.MasterData.Devices.View);
  const canManage = usePermission(Permissions.MasterData.Devices.Manage);

  const [items, setItems] = useState<Device[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* filters */
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const initialized = useRef(false);

  const isHikVision =
    form.protocol === "HikVisionIsup" || form.protocol === "HikVisionIsapi";
  const isIsapi = form.protocol === "HikVisionIsapi";

  /* ── load ── */
  const load = async () => {
    try {
      setLoading(true);
      const [devRes, brRes] = await Promise.all([
        api.get<Device[]>("/devices"),
        api.get<Branch[]>("/branches"),
      ]);
      setItems(devRes.data);
      setBranches(brRes.data);
    } catch (err: unknown) {
      showError(
        "Load failed",
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not load devices.",
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

  /* ── stats ── */
  const stats: DeviceStats = {
    total: items.length,
    online: items.filter((d) => heartbeatStatus(d.lastHeartbeatAt) === "online")
      .length,
    offline: items.filter(
      (d) => heartbeatStatus(d.lastHeartbeatAt) === "offline",
    ).length,
    active: items.filter((d) => d.isActive).length,
  };

  /* ── filtered list ── */
  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.deviceCode.toLowerCase().includes(q) ||
      (d.locationTag ?? "").toLowerCase().includes(q) ||
      (d.branchName ?? "").toLowerCase().includes(q);
    const matchType = !typeFilter || d.deviceType === typeFilter;
    const matchStatus =
      !statusFilter || (statusFilter === "active" ? d.isActive : !d.isActive);
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  /* ── dialog helpers ── */
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: Device) => {
    setEditing(item);
    setForm({
      name: item.name,
      deviceCode: item.deviceCode,
      deviceType: item.deviceType,
      protocol: item.protocol ?? "ZktecoAdms",
      branchId: item.branchId ?? "",
      locationTag: item.locationTag ?? "",
      apiToken: "",
      isActive: item.isActive,
      punchMode: item.punchMode ?? "ExplicitType",
      identifierType: item.identifierType ?? "EmployeeCode",
      syncIntervalMinutes: String(item.syncIntervalMinutes ?? 60),
      timezone: item.timezone ?? "Asia/Colombo",
      isupDeviceId: item.isupDeviceId ?? "",
      isupKey: "",
      deviceIp: item.deviceIp ?? "",
      devicePort: String(item.devicePort ?? 80),
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.deviceCode.trim()) {
      setError("Device code is required.");
      return;
    }
    if (!editing && !form.apiToken.trim()) {
      setError("API token is required for new devices.");
      return;
    }
    if (isHikVision && !form.isupDeviceId.trim()) {
      setError("ISUP Device ID is required for HikVision devices.");
      return;
    }
    if (isIsapi && !form.deviceIp.trim()) {
      setError("Device IP is required for ISAPI mode.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post("/devices/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        deviceCode: form.deviceCode.trim(),
        deviceType: form.deviceType,
        protocol: form.protocol,
        branchId: form.branchId || null,
        locationTag: form.locationTag.trim() || null,
        apiTokenHash: form.apiToken || undefined,
        isActive: form.isActive,
        punchMode: form.punchMode,
        identifierType: form.identifierType,
        syncIntervalMinutes: parseInt(form.syncIntervalMinutes) || 60,
        timezone: form.timezone,
        isupDeviceId: isHikVision ? form.isupDeviceId.trim() || null : null,
        isupKey: isHikVision && form.isupKey ? form.isupKey.trim() : undefined,
        deviceIp: form.deviceIp.trim() || null,
        devicePort: parseInt(form.devicePort) || null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Device updated" : "Device registered", form.name);
    } catch (err: unknown) {
      showError(
        "Failed to save",
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not save device.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Device) => {
    if (!confirm(`Delete device "${item.name}"?`)) return;
    try {
      await api.post("/devices/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess("Device deleted", item.name);
    } catch (err: unknown) {
      showError(
        "Delete failed",
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not delete device.",
      );
    }
  };

  /* ─────────────────────────────────── render ─────────────────────────── */

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="h3">Devices</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage biometric, QR code, and NFC attendance devices across all
            branches.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Register Device
          </Button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Devices"
          value={stats.total}
          sub={`${stats.active} active`}
          iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"
          icon={<Cpu size={20} />}
        />
        <StatCard
          label="Online Now"
          value={stats.online}
          sub="Heartbeat < 5 min"
          subColor="text-emerald-500"
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
          icon={<Wifi size={20} />}
        />
        <StatCard
          label="Offline Devices"
          value={stats.offline}
          sub={stats.offline > 0 ? "Action needed" : "All clear"}
          subColor={stats.offline > 0 ? "text-red-500" : "text-gray-400"}
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
          icon={<WifiOff size={20} />}
        />
        <StatCard
          label="Last Sync"
          value={
            items
              .reduce<Date | null>((latest, d) => {
                if (!d.lastSyncAt) return latest;
                const t = new Date(d.lastSyncAt);
                return !latest || t > latest ? t : latest;
              }, null)
              ?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) ?? "—"
          }
          sub="across all devices"
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
          icon={<RefreshCw size={20} />}
        />
      </div>

      {/* ── Filter Row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            className="input pl-9 w-full"
            placeholder="Search by name, code or branch…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>

        <select
          className="input w-auto"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            resetPage();
          }}
        >
          <option value="">All Types</option>
          {DEVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            resetPage();
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} {filtered.length === 1 ? "device" : "devices"}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Code</th>
                  <th>Protocol</th>
                  <th>Punch Mode</th>
                  <th>Branch</th>
                  <th>Last Sync</th>
                  <th>Online</th>
                  <th>Status</th>
                  {canManage && <th className="w-20 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-400">
                      No devices found
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => {
                    const hb = heartbeatStatus(item.lastHeartbeatAt);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <DeviceIcon
                              type={item.deviceType}
                              seed={item.deviceCode}
                            />
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-100">
                                {item.name}
                              </div>
                              {item.locationTag && (
                                <div className="text-xs text-gray-400">
                                  {item.locationTag}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {item.deviceCode}
                          </code>
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${PROTOCOL_BADGE[item.protocol ?? ""] ?? "xp-badge-neutral"}`}
                          >
                            {protocolLabel(item.protocol)}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">
                          {punchModeLabel(item.punchMode)}
                        </td>
                        <td className="text-gray-500 text-sm">
                          {item.branchName ?? "—"}
                        </td>
                        <td className="text-gray-500 text-sm">
                          {item.lastSyncAt ? (
                            new Date(item.lastSyncAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">
                              Never
                            </span>
                          )}
                        </td>
                        <td>
                          {hb === "online" && (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              Online
                            </span>
                          )}
                          {hb === "idle" && (
                            <span className="flex items-center gap-1.5 text-amber-500 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                              Idle
                            </span>
                          )}
                          {hb === "offline" && (
                            <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                              Offline
                            </span>
                          )}
                          {hb === "never" && (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              devices
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                      ? i + 1
                      : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                      p === page
                        ? "bg-primary text-white font-medium"
                        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Register / Edit Dialog ── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={680}
      >
        <h5 className="mb-5 font-semibold">
          {editing ? "Edit Device" : "Register Device"}
        </h5>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              Device Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Main Entrance"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">
              Device Code <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. BIO-001"
              value={form.deviceCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, deviceCode: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="form-label">Device Type</label>
            <select
              className="input w-full"
              value={form.deviceType}
              onChange={(e) =>
                setForm((f) => ({ ...f, deviceType: e.target.value }))
              }
            >
              {DEVICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Protocol <span className="text-red-500">*</span>
            </label>
            <select
              className="input w-full"
              value={form.protocol}
              onChange={(e) =>
                setForm((f) => ({ ...f, protocol: e.target.value }))
              }
            >
              {PROTOCOL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.desc}
                </option>
              ))}
            </select>
          </div>

          {isHikVision && (
            <>
              <div>
                <label className="form-label">
                  ISUP Device ID <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. HIK-ENTRANCE-01"
                  value={form.isupDeviceId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isupDeviceId: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must match the Device ID set on the physical device.
                </p>
              </div>
              <div>
                <label className="form-label">
                  ISUP Key {!editing && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="password"
                  placeholder={
                    editing
                      ? "Leave blank to keep existing"
                      : "Enter ISUP secret key"
                  }
                  value={form.isupKey}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isupKey: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          {isIsapi && (
            <>
              <div>
                <label className="form-label">
                  Device IP <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. 192.168.1.100"
                  value={form.deviceIp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deviceIp: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Device Port</label>
                <Input
                  type="number"
                  placeholder="80"
                  value={form.devicePort}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, devicePort: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="form-label">Punch Mode</label>
            <select
              className="input w-full"
              value={form.punchMode}
              onChange={(e) =>
                setForm((f) => ({ ...f, punchMode: e.target.value }))
              }
            >
              {PUNCH_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Identifier Type</label>
            <select
              className="input w-full"
              value={form.identifierType}
              onChange={(e) =>
                setForm((f) => ({ ...f, identifierType: e.target.value }))
              }
            >
              {IDENTIFIER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Branch</label>
            <select
              className="input w-full"
              value={form.branchId}
              onChange={(e) =>
                setForm((f) => ({ ...f, branchId: e.target.value }))
              }
            >
              <option value="">— None —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Sync Interval (minutes)</label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={form.syncIntervalMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, syncIntervalMinutes: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="form-label">Timezone</label>
            <select
              className="input w-full"
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="form-label">Location Tag</label>
            <Input
              placeholder="e.g. Floor 2, Reception"
              value={form.locationTag}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationTag: e.target.value }))
              }
            />
          </div>

          <div className="col-span-2">
            <label className="form-label">
              API Token {!editing && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="password"
              placeholder={
                editing
                  ? "Leave blank to keep existing token"
                  : "Enter device API token"
              }
              value={form.apiToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiToken: e.target.value }))
              }
            />
            {editing && (
              <p className="text-xs text-gray-400 mt-1">
                Only fill in to rotate the existing token.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switcher
              checked={form.isActive}
              onChange={(val: boolean) =>
                setForm((f) => ({ ...f, isActive: val }))
              }
            />
            <label className="form-label mb-0">Active</label>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update" : "Register"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}