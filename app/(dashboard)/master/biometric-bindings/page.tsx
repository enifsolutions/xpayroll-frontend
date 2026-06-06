'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import { showError, showSuccess } from '@/lib/toast';
import { Fingerprint, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { Permissions } from '@/lib/permissions';

interface Binding {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
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

const STATUS_COLORS: Record<string, string> = {
  Active:     'xp-badge-success',
  Inactive:   'xp-badge-neutral',
  Unverified: 'xp-badge-warning',
};

const FINGER_LABELS: Record<number, string> = {
  0: 'R.Thumb', 1: 'R.Index', 2: 'R.Middle', 3: 'R.Ring', 4: 'R.Little',
  5: 'L.Thumb', 6: 'L.Index', 7: 'L.Middle', 8: 'L.Ring', 9: 'L.Little',
};

export default function BiometricBindingsMasterPage() {
  useRequirePermission(Permissions.Biometric.Binding.View);
  const canManage = usePermission(Permissions.Biometric.Binding.Manage);
  const userId    = useAuthStore(s => s.user?.userId);

  const [bindings,      setBindings]      = useState<Binding[]>([]);
  const [devices,       setDevices]       = useState<Device[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deviceFilter,  setDeviceFilter]  = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [search,        setSearch]        = useState('');
  const initialized                       = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const [bRes, dRes] = await Promise.all([
        api.get<Binding[]>('/biometric-bindings'),
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

  const handleDelete = async (b: Binding) => {
    if (!confirm(`Remove binding for ${b.employeeName} on ${b.deviceName}?`)) return;
    try {
      await api.post('/biometric-bindings/save', { action: 'DELETE', id: b.id, userId });
      await load();
      showSuccess('Binding removed', `${b.employeeName} — ${b.deviceName}`);
    } catch {
      showError('Delete failed', 'Could not remove binding.');
    }
  };

  const filtered = bindings.filter(b => {
    if (deviceFilter && b.deviceId !== deviceFilter) return false;
    if (statusFilter && b.status  !== statusFilter)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.employeeName.toLowerCase().includes(q) &&
          !b.employeeCode.toLowerCase().includes(q) &&
          !b.identifierValue.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Biometric Bindings</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            All device identifier mappings across employees.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Fingerprint size={16} />
          <span>{filtered.length} binding{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input input-md w-64"
          placeholder="Search employee or identifier..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input input-md" value={deviceFilter}
          onChange={e => setDeviceFilter(e.target.value)}>
          <option value="">All Devices</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.deviceCode})</option>
          ))}
        </select>
        <select className="input input-md" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Unverified">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-gray-400 gap-2">
              <Fingerprint size={40} strokeWidth={1.2} />
              <p className="text-sm">No bindings found.</p>
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Device</th>
                  <th>Identifier</th>
                  <th>Finger</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                  <th>Last Verified</th>
                  {canManage && <th className="w-20 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{b.employeeName}</span>
                        <Link href={`/employees/${b.employeeId}/biometric`}
                          className="text-gray-400 hover:text-primary transition-colors">
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                      <div className="text-xs font-mono text-gray-400">{b.employeeCode}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{b.deviceName}</div>
                      <div className="text-xs text-gray-400 font-mono">{b.deviceCode}</div>
                    </td>
                    <td>
                      <div className="text-xs text-gray-500 mb-0.5">{b.identifierType}</div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {b.identifierValue}
                      </code>
                    </td>
                    <td className="text-sm text-gray-500">
                      {b.fingerIndex !== null ? FINGER_LABELS[b.fingerIndex] ?? `F${b.fingerIndex}` : '—'}
                    </td>
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
                    <td className="text-sm text-gray-500">
                      {b.lastVerifiedAt ? new Date(b.lastVerifiedAt).toLocaleDateString() : '—'}
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
        </div>
      </div>
    </div>
  );
}
