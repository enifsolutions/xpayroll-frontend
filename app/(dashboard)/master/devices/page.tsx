'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Wifi, WifiOff } from 'lucide-react';
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

const EMPTY: DeviceForm = {
  name: '',
  deviceCode: '',
  deviceType: 'Biometric',
  protocol: 'ZktecoAdms',
  branchId: '',
  locationTag: '',
  apiToken: '',
  isActive: true,
  punchMode: 'ExplicitType',
  identifierType: 'EmployeeCode',
  syncIntervalMinutes: '60',
  timezone: 'Asia/Colombo',
  isupDeviceId: '',
  isupKey: '',
  deviceIp: '',
  devicePort: '80',
};

const DEVICE_TYPE_OPTIONS = [
  { value: 'Biometric', label: 'Biometric' },
  { value: 'QrCode',    label: 'QR Code'   },
  { value: 'Nfc',       label: 'NFC'       },
];

const PROTOCOL_OPTIONS = [
  { value: 'ZktecoAdms',     label: 'ZKTeco ADMS',          desc: 'Device pushes to your server (iClock)' },
  { value: 'HikVisionIsup',  label: 'HikVision ISUP 5.0',   desc: 'Device connects via TCP (port 7660)' },
  { value: 'HikVisionIsapi', label: 'HikVision ISAPI',       desc: 'Server polls device (requires static IP)' },
];

const PUNCH_MODE_OPTIONS = [
  { value: 'ExplicitType',     label: 'Explicit Type',     desc: 'Device sends CheckIn/CheckOut explicitly' },
  { value: 'AlternatingPunch', label: 'Alternating Punch', desc: 'First punch = In, second = Out' },
  { value: 'FirstLastPunch',   label: 'First / Last Punch',desc: 'First of day = In, last = Out' },
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

const PROTOCOL_COLORS: Record<string, string> = {
  ZktecoAdms:     'xp-badge-success',
  HikVisionIsup:  'xp-badge-info',
  HikVisionIsapi: 'xp-badge-warning',
};

const TIMEZONES = [
  'UTC', 'Asia/Colombo', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
  'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
];

function heartbeatStatus(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return 'never';
  const diff = Date.now() - new Date(lastHeartbeat).getTime();
  if (diff < 5 * 60 * 1000) return 'online';
  if (diff < 30 * 60 * 1000) return 'idle';
  return 'offline';
}

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

  const isHikVision = form.protocol === 'HikVisionIsup' || form.protocol === 'HikVisionIsapi';
  const isIsapi     = form.protocol === 'HikVisionIsapi';

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
      protocol:            item.protocol ?? 'ZktecoAdms',
      branchId:            item.branchId ?? '',
      locationTag:         item.locationTag ?? '',
      apiToken:            '',
      isActive:            item.isActive,
      punchMode:           item.punchMode ?? 'ExplicitType',
      identifierType:      item.identifierType ?? 'EmployeeCode',
      syncIntervalMinutes: String(item.syncIntervalMinutes ?? 60),
      timezone:            item.timezone ?? 'Asia/Colombo',
      isupDeviceId:        item.isupDeviceId ?? '',
      isupKey:             '',
      deviceIp:            item.deviceIp ?? '',
      devicePort:          String(item.devicePort ?? 80),
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())       { setError('Name is required.');        return; }
    if (!form.deviceCode.trim()) { setError('Device code is required.'); return; }
    if (!editing && !form.apiToken.trim()) { setError('API token is required for new devices.'); return; }
    if (isHikVision && !form.isupDeviceId.trim()) { setError('ISUP Device ID is required for HikVision devices.'); return; }
    if (isIsapi && !form.deviceIp.trim()) { setError('Device IP is required for ISAPI mode.'); return; }

    setSaving(true);
    setError('');
    try {
      await api.post("/devices/save", {
        action:              editing ? "UPDATE" : "ADD",
        id:                  editing?.id ?? null,
        name:                form.name.trim(),
        deviceCode:          form.deviceCode.trim(),
        deviceType:          form.deviceType,
        protocol:            form.protocol,
        branchId:            form.branchId || null,
        locationTag:         form.locationTag.trim() || null,
        apiTokenHash:        form.apiToken || undefined,
        isActive:            form.isActive,
        punchMode:           form.punchMode,
        identifierType:      form.identifierType,
        syncIntervalMinutes: parseInt(form.syncIntervalMinutes) || 60,
        timezone:            form.timezone,
        isupDeviceId:        isHikVision ? form.isupDeviceId.trim() || null : null,
        isupKey:             isHikVision && form.isupKey ? form.isupKey.trim() : undefined,
        deviceIp:            form.deviceIp.trim() || null,
        devicePort:          parseInt(form.devicePort) || null,
        userId:              undefined, // set by auth store in axios interceptor if needed
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

  const protocolLabel = (p: string | null) => PROTOCOL_OPTIONS.find(o => o.value === p)?.label ?? p ?? '—';
  const punchModeLabel = (m: string) => PUNCH_MODE_OPTIONS.find(o => o.value === m)?.label ?? m;

  const filtered = typeFilter ? items.filter(d => d.deviceType === typeFilter) : items;

  return (
    <div>
      {/* Header */}
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

      {/* Table */}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">No devices found</td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const hb = heartbeatStatus(item.lastHeartbeatAt);
                    return (
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
                          <span className={`xp-badge ${PROTOCOL_COLORS[item.protocol ?? ''] ?? 'xp-badge-neutral'}`}>
                            {protocolLabel(item.protocol)}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">
                          {punchModeLabel(item.punchMode)}
                        </td>
                        <td className="text-gray-500">{item.branchName ?? '—'}</td>
                        <td className="text-gray-500 text-sm">
                          {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'}
                        </td>
                        <td>
                          {hb === 'online'  && <span title="Online"  className="flex items-center gap-1 text-green-500 text-xs"><Wifi size={13}/> Online</span>}
                          {hb === 'idle'    && <span title="Idle"    className="flex items-center gap-1 text-yellow-500 text-xs"><Wifi size={13}/> Idle</span>}
                          {hb === 'offline' && <span title="Offline" className="flex items-center gap-1 text-red-400 text-xs"><WifiOff size={13}/> Offline</span>}
                          {hb === 'never'   && <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td>
                          <span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="text-center">
                            <button onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                              <Pencil size={15} />
                            </button>
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
      </div>

      {/* Dialog */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)} width={680}>
        <h5 className="mb-5 font-semibold">{editing ? 'Edit Device' : 'Register Device'}</h5>

        <div className="grid grid-cols-2 gap-4">

          {/* Name */}
          <div>
            <label className="form-label">Device Name <span className="text-red-500">*</span></label>
            <Input placeholder="e.g. Main Entrance" value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Code */}
          <div>
            <label className="form-label">Device Code <span className="text-red-500">*</span></label>
            <Input placeholder="e.g. BIO-001" value={form.deviceCode}
              onChange={(e) => setForm(f => ({ ...f, deviceCode: e.target.value }))} />
          </div>

          {/* Device Type */}
          <div>
            <label className="form-label">Device Type</label>
            <select className="input input-md w-full" value={form.deviceType}
              onChange={(e) => setForm(f => ({ ...f, deviceType: e.target.value }))}>
              {DEVICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Protocol */}
          <div>
            <label className="form-label">Protocol <span className="text-red-500">*</span></label>
            <select className="input input-md w-full" value={form.protocol}
              onChange={(e) => setForm(f => ({ ...f, protocol: e.target.value }))}>
              {PROTOCOL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
          </div>

          {/* HikVision fields — shown only when HikVision protocol selected */}
          {isHikVision && (
            <>
              <div>
                <label className="form-label">ISUP Device ID <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. HIK-ENTRANCE-01" value={form.isupDeviceId}
                  onChange={(e) => setForm(f => ({ ...f, isupDeviceId: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Must match the Device ID set on the physical device.</p>
              </div>

              <div>
                <label className="form-label">
                  ISUP Key {!editing && <span className="text-red-500">*</span>}
                </label>
                <Input type="password"
                  placeholder={editing ? 'Leave blank to keep existing' : 'Enter ISUP secret key'}
                  value={form.isupKey}
                  onChange={(e) => setForm(f => ({ ...f, isupKey: e.target.value }))} />
              </div>
            </>
          )}

          {/* ISAPI-only: device IP */}
          {isIsapi && (
            <>
              <div>
                <label className="form-label">Device IP <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. 192.168.1.100" value={form.deviceIp}
                  onChange={(e) => setForm(f => ({ ...f, deviceIp: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Device Port</label>
                <Input type="number" placeholder="80" value={form.devicePort}
                  onChange={(e) => setForm(f => ({ ...f, devicePort: e.target.value }))} />
              </div>
            </>
          )}

          {/* Punch Mode */}
          <div className="col-span-2">
            <label className="form-label">Punch Mode</label>
            <select className="input input-md w-full" value={form.punchMode}
              onChange={(e) => setForm(f => ({ ...f, punchMode: e.target.value }))}>
              {PUNCH_MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} — {o.desc}</option>
              ))}
            </select>
          </div>

          {/* Identifier Type */}
          <div>
            <label className="form-label">Identifier Type</label>
            <select className="input input-md w-full" value={form.identifierType}
              onChange={(e) => setForm(f => ({ ...f, identifierType: e.target.value }))}>
              {IDENTIFIER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="form-label">Branch</label>
            <select className="input input-md w-full" value={form.branchId}
              onChange={(e) => setForm(f => ({ ...f, branchId: e.target.value }))}>
              <option value="">— None —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Sync Interval */}
          <div>
            <label className="form-label">Sync Interval (minutes)</label>
            <Input type="number" min="1" max="1440" value={form.syncIntervalMinutes}
              onChange={(e) => setForm(f => ({ ...f, syncIntervalMinutes: e.target.value }))} />
          </div>

          {/* Timezone */}
          <div>
            <label className="form-label">Timezone</label>
            <select className="input input-md w-full" value={form.timezone}
              onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {/* Location Tag */}
          <div className="col-span-2">
            <label className="form-label">Location Tag</label>
            <Input placeholder="e.g. Floor 2, Reception" value={form.locationTag}
              onChange={(e) => setForm(f => ({ ...f, locationTag: e.target.value }))} />
          </div>

          {/* API Token */}
          <div className="col-span-2">
            <label className="form-label">
              API Token {!editing && <span className="text-red-500">*</span>}
            </label>
            <Input type="password"
              placeholder={editing ? 'Leave blank to keep existing token' : 'Enter device API token'}
              value={form.apiToken}
              onChange={(e) => setForm(f => ({ ...f, apiToken: e.target.value }))} />
            {editing && (
              <p className="text-xs text-gray-400 mt-1">Only fill in to rotate the existing token.</p>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 pt-1">
            <Switcher checked={form.isActive}
              onChange={(val: boolean) => setForm(f => ({ ...f, isActive: val }))} />
            <label className="form-label mb-0">Active</label>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Register'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
