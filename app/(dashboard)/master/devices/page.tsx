'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil } from 'lucide-react';
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

interface Branch {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  deviceCode: string;
  deviceType: string;
  branchId: string | null;
  branchName: string | null;
  locationTag: string | null;
  isActive: boolean;
  punchMode: string;
  identifierType: string;
  syncIntervalMinutes: number;
  timezone: string;
  lastSyncAt: string | null;
  registeredAt: string;
}

interface DeviceForm {
  name: string;
  deviceCode: string;
  deviceType: string;
  branchId: string;
  locationTag: string;
  apiToken: string;
  isActive: boolean;
  punchMode: string;
  identifierType: string;
  syncIntervalMinutes: string;
  timezone: string;
}

const EMPTY: DeviceForm = {
  name: '',
  deviceCode: '',
  deviceType: 'Biometric',
  branchId: '',
  locationTag: '',
  apiToken: '',
  isActive: true,
  punchMode: 'ExplicitType',
  identifierType: 'EmployeeCode',
  syncIntervalMinutes: '5',
  timezone: 'UTC',
};

const DEVICE_TYPE_OPTIONS = [
  { value: 'Biometric', label: 'Biometric' },
  { value: 'QrCode',    label: 'QR Code'   },
  { value: 'Nfc',       label: 'NFC'       },
];

const PUNCH_MODE_OPTIONS = [
  { value: 'ExplicitType',    label: 'Explicit Type',    desc: 'Device sends CheckIn/CheckOut explicitly' },
  { value: 'AlternatingPunch',label: 'Alternating Punch',desc: 'First punch = In, second = Out, alternating' },
  { value: 'FirstLastPunch',  label: 'First/Last Punch', desc: 'First punch of day = In, last = Out' },
];

const IDENTIFIER_TYPE_OPTIONS = [
  { value: 'EmployeeCode', label: 'Employee Code' },
  { value: 'EmployeeId',   label: 'Employee ID'   },
  { value: 'CardNumber',   label: 'Card Number'   },
  { value: 'NationalId',   label: 'National ID'   },
];

const TYPE_COLORS: Record<string, string> = {
  Biometric: 'xp-badge-primary',
  QrCode:    'xp-badge-info',
  Nfc:       'xp-badge-warning',
};

const TIMEZONES = [
  'UTC', 'Asia/Colombo', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
];

export default function DevicesPage() {
  useRequirePermission(Permissions.MasterData.Devices.View);
  const canManage = usePermission(Permissions.MasterData.Devices.Manage);

  const [items,      setItems]      = useState<Device[]>([]);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState<Device | null>(null);
  const [form,       setForm]       = useState<DeviceForm>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const initialized                 = useRef(false);

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
      showError('Load failed', (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not load devices.');
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
    setForm({ ...EMPTY });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: Device) => {
    setEditing(item);
    setForm({
      name:                item.name,
      deviceCode:          item.deviceCode,
      deviceType:          item.deviceType,
      branchId:            item.branchId ?? '',
      locationTag:         item.locationTag ?? '',
      apiToken:            '',
      isActive:            item.isActive,
      punchMode:           item.punchMode ?? 'ExplicitType',
      identifierType:      item.identifierType ?? 'EmployeeCode',
      syncIntervalMinutes: String(item.syncIntervalMinutes ?? 5),
      timezone:            item.timezone ?? 'UTC',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())       { setError('Name is required.'); return; }
    if (!form.deviceCode.trim()) { setError('Device code is required.'); return; }
    if (!editing && !form.apiToken.trim()) { setError('API token is required for new devices.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post("/devices/save", {
        action:              editing ? "UPDATE" : "ADD",
        id:                  editing?.id ?? null,
        name:                form.name.trim(),
        deviceCode:          form.deviceCode.trim(),
        deviceType:          form.deviceType,
        branchId:            form.branchId || null,
        locationTag:         form.locationTag.trim() || null,
        apiTokenHash:        form.apiToken || undefined,
        isActive:            form.isActive,
        punchMode:           form.punchMode,
        identifierType:      form.identifierType,
        syncIntervalMinutes: parseInt(form.syncIntervalMinutes) || 5,
        timezone:            form.timezone,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Device updated' : 'Device registered', form.name);
    } catch (err: unknown) {
      showError('Failed to save', (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save device.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Device) => {
    if (!confirm(`Delete device "${item.name}"?`)) return;
    try {
      await api.post("/devices/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess('Device deleted', item.name);
    } catch (err: unknown) {
      showError('Delete failed', (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not delete device.');
    }
  };

  const typeLabel = (t: string) => DEVICE_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;
  const punchModeLabel = (m: string) => PUNCH_MODE_OPTIONS.find(o => o.value === m)?.label ?? m;
  const identifierLabel = (t: string) => IDENTIFIER_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;

  const filtered = typeFilter ? items.filter(d => d.deviceType === typeFilter) : items;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Devices</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage biometric, QR code, and NFC attendance devices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input" value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {DEVICE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {canManage && (
            <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
              Register Device
            </Button>
          )}
        </div>
      </div>

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
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Punch Mode</th>
                  <th>Identifier</th>
                  <th>Sync Interval</th>
                  <th>Branch</th>
                  <th>Last Sync</th>
                  <th>Status</th>
                  {canManage && <th className="w-24 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      No devices found
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.locationTag ?? ''}</div>
                      </td>
                      <td>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {item.deviceCode}
                        </code>
                      </td>
                      <td>
                        <span className={`xp-badge ${TYPE_COLORS[item.deviceType] ?? "xp-badge-neutral"}`}>
                          {typeLabel(item.deviceType)}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">
                        {punchModeLabel(item.punchMode)}
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">
                        {identifierLabel(item.identifierType)}
                      </td>
                      <td className="text-sm text-gray-500">
                        {item.syncIntervalMinutes}m
                      </td>
                      <td className="text-gray-500">{item.branchName ?? "—"}</td>
                      <td className="text-gray-500 text-sm">
                        {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : "Never"}
                      </td>
                      <td>
                        <span className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="text-center">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} width={640}>
        <h5 className="mb-4 font-semibold">{editing ? "Edit Device" : "Register Device"}</h5>

        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="form-label">Device Name <span className="text-red-500">*</span></label>
            <Input placeholder="e.g. Main Entrance" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Code */}
          <div>
            <label className="form-label">Device Code <span className="text-red-500">*</span></label>
            <Input placeholder="e.g. BIO-001" value={form.deviceCode}
              onChange={(e) => setForm((f) => ({ ...f, deviceCode: e.target.value }))} />
          </div>

          {/* Device Type */}
          <div>
            <label className="form-label">Device Type</label>
            <select className="input input-md w-full" value={form.deviceType}
              onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value }))}>
              {DEVICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="form-label">Branch</label>
            <select className="input input-md w-full" value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">— None —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Punch Mode */}
          <div className="col-span-2">
            <label className="form-label">Punch Mode</label>
            <select className="input input-md w-full" value={form.punchMode}
              onChange={(e) => setForm((f) => ({ ...f, punchMode: e.target.value }))}>
              {PUNCH_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
          </div>

          {/* Identifier Type */}
          <div>
            <label className="form-label">Identifier Type</label>
            <select className="input input-md w-full" value={form.identifierType}
              onChange={(e) => setForm((f) => ({ ...f, identifierType: e.target.value }))}>
              {IDENTIFIER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Sync Interval */}
          <div>
            <label className="form-label">Sync Interval (minutes)</label>
            <Input type="number" min="1" max="60" value={form.syncIntervalMinutes}
              onChange={(e) => setForm((f) => ({ ...f, syncIntervalMinutes: e.target.value }))} />
          </div>

          {/* Timezone */}
          <div>
            <label className="form-label">Timezone</label>
            <select className="input input-md w-full" value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Location Tag */}
          <div>
            <label className="form-label">Location Tag</label>
            <Input placeholder="e.g. Floor 2, Reception" value={form.locationTag}
              onChange={(e) => setForm((f) => ({ ...f, locationTag: e.target.value }))} />
          </div>

          {/* API Token */}
          <div className="col-span-2">
            <label className="form-label">
              API Token {!editing && <span className="text-red-500">*</span>}
            </label>
            <Input type="password"
              placeholder={editing ? "Leave blank to keep existing token" : "Enter device API token"}
              value={form.apiToken}
              onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))} />
            {editing && (
              <p className="text-xs text-gray-400 mt-1">Only fill in to rotate the existing token.</p>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 pt-2">
            <Switcher checked={form.isActive}
              onChange={(val: boolean) => setForm((f) => ({ ...f, isActive: val }))} />
            <label className="form-label mb-0">Active</label>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update" : "Register"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
