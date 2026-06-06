'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Trash2, Fingerprint } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';

interface Device {
  id: string;
  name: string;
  deviceCode: string;
  protocol: string | null;
  identifierType: string;
}

interface Binding {
  id: string;
  employeeId: string;
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

interface BindingForm {
  deviceId: string;
  identifierType: string;
  identifierValue: string;
  fingerIndex: string;
}

const EMPTY_FORM: BindingForm = {
  deviceId: '',
  identifierType: 'EmployeeCode',
  identifierValue: '',
  fingerIndex: '',
};

const IDENTIFIER_OPTIONS = [
  { value: 'EmployeeCode', label: 'Employee Code' },
  { value: 'EmployeeId',   label: 'Employee ID'   },
  { value: 'CardNumber',   label: 'Card Number'   },
  { value: 'NationalId',   label: 'National ID'   },
];

const FINGER_OPTIONS = [
  { value: '',  label: '— Not a fingerprint —' },
  { value: '0', label: 'Right Thumb' },
  { value: '1', label: 'Right Index' },
  { value: '2', label: 'Right Middle' },
  { value: '3', label: 'Right Ring' },
  { value: '4', label: 'Right Little' },
  { value: '5', label: 'Left Thumb' },
  { value: '6', label: 'Left Index' },
  { value: '7', label: 'Left Middle' },
  { value: '8', label: 'Left Ring' },
  { value: '9', label: 'Left Little' },
];

const STATUS_COLORS: Record<string, string> = {
  Active:     'xp-badge-success',
  Inactive:   'xp-badge-neutral',
  Unverified: 'xp-badge-warning',
};

export default function EmployeeBiometricPage() {
  const { id: employeeId } = useParams<{ id: string }>();
  const userId    = useAuthStore(s => s.user?.userId);
  const canManage = usePermission(Permissions.Biometric.Binding.Manage);

  const [bindings,    setBindings]    = useState<Binding[]>([]);
  const [devices,     setDevices]     = useState<Device[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [form,        setForm]        = useState<BindingForm>(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const initialized                   = useRef(false);

  // When device changes, auto-set identifierType from device config
  const selectedDevice = devices.find(d => d.id === form.deviceId);

  const load = async () => {
    try {
      setLoading(true);
      const [bRes, dRes] = await Promise.all([
        api.get<Binding[]>('/biometric-bindings', { params: { employeeId } }),
        api.get<Device[]>('/devices', { params: { isActive: true } }),
      ]);
      setBindings(bRes.data);
      setDevices(dRes.data);
    } catch {
      showError('Load failed', 'Could not load biometric bindings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  // Auto-fill identifierType when device selected
  useEffect(() => {
    if (selectedDevice) {
      setForm(f => ({ ...f, identifierType: selectedDevice.identifierType }));
    }
  }, [form.deviceId]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.deviceId)              { setError('Please select a device.');         return; }
    if (!form.identifierValue.trim()){ setError('Identifier value is required.');   return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/biometric-bindings/save', {
        action:          'ADD',
        employeeId,
        deviceId:        form.deviceId,
        identifierType:  form.identifierType,
        identifierValue: form.identifierValue.trim(),
        fingerIndex:     form.fingerIndex !== '' ? parseInt(form.fingerIndex) : null,
        userId,
      });
      setDialogOpen(false);
      await load();
      showSuccess('Binding added', 'Biometric binding registered successfully.');
    } catch (err: unknown) {
      showError('Failed', (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save binding.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Binding) => {
    if (!confirm(`Remove binding for ${b.deviceName}?`)) return;
    try {
      await api.post('/biometric-bindings/save', { action: 'DELETE', id: b.id, userId });
      await load();
      showSuccess('Binding removed', b.deviceName);
    } catch {
      showError('Delete failed', 'Could not remove binding.');
    }
  };

  const fingerLabel = (idx: number | null) =>
    idx === null ? '—' : (FINGER_OPTIONS.find(f => f.value === String(idx))?.label ?? `Finger ${idx}`);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h6 className="font-semibold">Biometric Bindings</h6>
          <p className="text-sm text-gray-500 mt-0.5">Device enrollments and identifier mappings for this employee.</p>
        </div>
        {canManage && (
          <Button variant="solid" size="sm" icon={<PlusIcon size={15} />} onClick={openAdd}>
            Add Binding
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : bindings.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
          <Fingerprint size={36} strokeWidth={1.2} />
          <p className="text-sm">No biometric bindings yet.</p>
          {canManage && (
            <Button variant="plain" size="sm" onClick={openAdd}>Add First Binding</Button>
          )}
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Device</th>
              <th>Identifier Type</th>
              <th>Identifier Value</th>
              <th>Finger</th>
              <th>Template</th>
              <th>Status</th>
              <th>Enrolled</th>
              {canManage && <th className="w-16 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {bindings.map(b => (
              <tr key={b.id}>
                <td>
                  <div className="font-medium text-sm">{b.deviceName}</div>
                  <div className="text-xs text-gray-400 font-mono">{b.deviceCode}</div>
                </td>
                <td className="text-sm text-gray-600 dark:text-gray-400">{b.identifierType}</td>
                <td>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {b.identifierValue}
                  </code>
                </td>
                <td className="text-sm text-gray-500">{fingerLabel(b.fingerIndex)}</td>
                <td>
                  <span className={`xp-badge ${b.hasTemplate ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                    {b.hasTemplate ? 'Stored' : 'None'}
                  </span>
                </td>
                <td>
                  <span className={`xp-badge ${STATUS_COLORS[b.status] ?? 'xp-badge-neutral'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="text-sm text-gray-500">
                  {new Date(b.enrolledAt).toLocaleDateString()}
                </td>
                {canManage && (
                  <td className="text-center">
                    <button onClick={() => handleDelete(b)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Binding Dialog */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)} width={520}>
        <h5 className="mb-5 font-semibold">Add Biometric Binding</h5>

        <div className="flex flex-col gap-4">
          {/* Device */}
          <div>
            <label className="form-label">Device <span className="text-red-500">*</span></label>
            <select className="input input-md w-full" value={form.deviceId}
              onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))}>
              <option value="">— Select device —</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.deviceCode})
                </option>
              ))}
            </select>
          </div>

          {/* Identifier Type */}
          <div>
            <label className="form-label">Identifier Type</label>
            <select className="input input-md w-full" value={form.identifierType}
              onChange={e => setForm(f => ({ ...f, identifierType: e.target.value }))}>
              {IDENTIFIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {selectedDevice && (
              <p className="text-xs text-gray-400 mt-1">
                Auto-set from device default ({selectedDevice.identifierType}). Change if needed.
              </p>
            )}
          </div>

          {/* Identifier Value */}
          <div>
            <label className="form-label">Identifier Value <span className="text-red-500">*</span></label>
            <input className="input input-md w-full" placeholder="e.g. EMP-001 or card number"
              value={form.identifierValue}
              onChange={e => setForm(f => ({ ...f, identifierValue: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">
              The raw value the device will send when this employee authenticates.
            </p>
          </div>

          {/* Finger Index */}
          <div>
            <label className="form-label">Finger (for fingerprint devices)</label>
            <select className="input input-md w-full" value={form.fingerIndex}
              onChange={e => setForm(f => ({ ...f, fingerIndex: e.target.value }))}>
              {FINGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>Add Binding</Button>
        </div>
      </Dialog>
    </div>
  );
}
