'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2, Star } from 'lucide-react';

interface AttendancePolicy {
  id: string;
  name: string;
  trackingMode: string;
  trackBreaks: boolean;
  trackOvertime: boolean;
  allowSelfCheckin: boolean;
  allowBiometric: boolean;
  allowQrNfc: boolean;
  lateGraceMinutes: number;
  overtimeThresholdMinutes: number;
  isDefault: boolean;
}

interface AttendancePolicyForm {
  name: string;
  trackingMode: string;
  trackBreaks: boolean;
  trackOvertime: boolean;
  allowSelfCheckin: boolean;
  allowBiometric: boolean;
  allowQrNfc: boolean;
  lateGraceMinutes: string;
  overtimeThresholdMinutes: string;
  isDefault: boolean;
}

const EMPTY: AttendancePolicyForm = {
  name: '',
  trackingMode: 'CheckInOut',
  trackBreaks: false,
  trackOvertime: false,
  allowSelfCheckin: true,
  allowBiometric: true,
  allowQrNfc: true,
  lateGraceMinutes: '10',
  overtimeThresholdMinutes: '0',
  isDefault: false,
};

const TRACKING_MODE_OPTIONS = [
  { value: 'CheckInOnly',       label: 'Check-in Only'         },
  { value: 'CheckInOut',        label: 'Check-in / Out'        },
  { value: 'CheckInOutBreaks',  label: 'Check-in / Out + Breaks' },
];

export default function AttendancePoliciesPage() {
  const [items, setItems]           = useState<AttendancePolicy[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<AttendancePolicy | null>(null);
  const [form, setForm]             = useState<AttendancePolicyForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<AttendancePolicy[]>('/AttendancePolicy');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load attendance policies.');
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

  const openEdit = (item: AttendancePolicy) => {
    setEditing(item);
    setForm({
      name:                     item.name,
      trackingMode:             item.trackingMode,
      trackBreaks:              item.trackBreaks,
      trackOvertime:            item.trackOvertime,
      allowSelfCheckin:         item.allowSelfCheckin,
      allowBiometric:           item.allowBiometric,
      allowQrNfc:               item.allowQrNfc,
      lateGraceMinutes:         String(item.lateGraceMinutes),
      overtimeThresholdMinutes: String(item.overtimeThresholdMinutes),
      isDefault:                item.isDefault,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/AttendancePolicy/save', {
        action:                   editing ? 'UPDATE' : 'ADD',
        id:                       editing?.id ?? null,
        name:                     form.name.trim(),
        trackingMode:             form.trackingMode,
        trackBreaks:              form.trackBreaks,
        trackOvertime:            form.trackOvertime,
        allowSelfCheckin:         form.allowSelfCheckin,
        allowBiometric:           form.allowBiometric,
        allowQrNfc:               form.allowQrNfc,
        lateGraceMinutes:         parseInt(form.lateGraceMinutes) || 0,
        overtimeThresholdMinutes: parseInt(form.overtimeThresholdMinutes) || 0,
        isDefault:                form.isDefault,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Policy updated' : 'Policy created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AttendancePolicy) => {
    if (item.isDefault) { showError('Cannot delete', 'The default policy cannot be deleted.'); return; }
    if (!confirm(`Delete policy "${item.name}"?`)) return;
    try {
      await api.post('/AttendancePolicy/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Policy deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete policy.');
    }
  };

  const trackingLabel = (mode: string) =>
    TRACKING_MODE_OPTIONS.find(o => o.value === mode)?.label ?? mode;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Attendance Policies</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure how attendance is tracked per employee group.
          </p>
        </div>
        <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
          Add Policy
        </Button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tracking Mode</th>
                  <th>Self Check-in</th>
                  <th>Biometric</th>
                  <th>QR / NFC</th>
                  <th>Grace (min)</th>
                  <th>OT Threshold</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No attendance policies found
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {item.isDefault && (
                          <Star size={13} className="text-yellow-500 fill-yellow-400 shrink-0" />
                        )}
                        <span className="font-medium heading-text">{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="xp-badge xp-badge-info">{trackingLabel(item.trackingMode)}</span>
                    </td>
                    <td>
                      <span className={`xp-badge ${item.allowSelfCheckin ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                        {item.allowSelfCheckin ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`xp-badge ${item.allowBiometric ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                        {item.allowBiometric ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`xp-badge ${item.allowQrNfc ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                        {item.allowQrNfc ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{item.lateGraceMinutes} min</td>
                    <td>{item.overtimeThresholdMinutes} min</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={item.isDefault}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={item.isDefault ? 'Cannot delete default policy' : 'Delete'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">{editing ? 'Edit Attendance Policy' : 'Add Attendance Policy'}</h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">Policy Name <span className="text-error">*</span></label>
            <Input
              placeholder="e.g. Standard Office Policy"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">Tracking Mode</label>
            <select
              className="input w-full"
              value={form.trackingMode}
              onChange={e => setForm(f => ({ ...f, trackingMode: e.target.value }))}
            >
              {TRACKING_MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Late Grace (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.lateGraceMinutes}
                onChange={e => setForm(f => ({ ...f, lateGraceMinutes: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">OT Threshold (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.overtimeThresholdMinutes}
                onChange={e => setForm(f => ({ ...f, overtimeThresholdMinutes: e.target.value }))}
              />
            </div>
          </div>

          {/* Check-in methods */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Methods</p>
            {([
              ['allowSelfCheckin', 'Allow Self Check-in (Mobile / Web)'],
              ['allowBiometric',   'Allow Biometric Devices'],
              ['allowQrNfc',       'Allow QR / NFC Devices'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm font-medium w-56">{label}</span>
                <Switcher
                  checked={form[key as keyof AttendancePolicyForm] as boolean}
                  onChange={val => setForm(f => ({ ...f, [key]: val }))}
                />
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Options</p>
            {([
              ['trackBreaks',   'Track Break Times'],
              ['trackOvertime', 'Track Overtime'],
              ['isDefault',     'Set as Default Policy'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm font-medium w-56">{label}</span>
                <Switcher
                  checked={form[key as keyof AttendancePolicyForm] as boolean}
                  onChange={val => setForm(f => ({ ...f, [key]: val }))}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}