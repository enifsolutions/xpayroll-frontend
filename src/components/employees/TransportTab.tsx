'use client';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { showSuccess, showError } from '@/lib/toast';
import api from '@/lib/axios';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';
import {
  EmployeeTransport, TransportForm, EMPTY_TRANSPORT,
  TRAVEL_TYPES, VEHICLE_TYPES,
} from '@/types/employee-extended.types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 mt-6 first:mt-0">{title}</p>
  );
}

export default function TransportTab({ employeeId }: { employeeId: string }) {
  const canManage   = usePermission(Permissions.HR.Transport.Manage);
  const initialized = useRef(false);

  const [record,   setRecord]   = useState<EmployeeTransport | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form,     setForm]     = useState<TransportForm>(EMPTY_TRANSPORT);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = async () => {
    try {
      const res = await api.get<EmployeeTransport>(`employee-transport/${employeeId}`);
      setRecord(res.data ?? null);
    } catch { setRecord(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const startEdit = () => {
    setForm(record ? {
      residentialAddress:     record.residentialAddress     ?? '',
      city:                   record.city                   ?? '',
      distanceKm:             record.distanceKm?.toString() ?? '',
      travelType:             record.travelType             ?? '',
      vehicleType:            record.vehicleType            ?? '',
      vehicleNumber:          record.vehicleNumber          ?? '',
      fuelAllowanceEligible:  record.fuelAllowanceEligible,
      transportAllowance:     record.transportAllowance?.toString() ?? '',
      notes:                  record.notes                  ?? '',
    } : EMPTY_TRANSPORT);
    setError(''); setEditMode(true);
  };

  const f = (field: keyof TransportForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post('employee-transport', {
        employeeId,
        residentialAddress:    form.residentialAddress.trim() || null,
        city:                  form.city.trim()               || null,
        distanceKm:            form.distanceKm ? parseFloat(form.distanceKm) : null,
        travelType:            form.travelType                || null,
        vehicleType:           form.vehicleType               || null,
        vehicleNumber:         form.vehicleNumber.trim()      || null,
        fuelAllowanceEligible: form.fuelAllowanceEligible,
        transportAllowance:    form.transportAllowance ? parseFloat(form.transportAllowance) : null,
        notes:                 form.notes.trim()              || null,
        userId: 1,
      });
      await load();
      setEditMode(false);
      showSuccess('Transport Saved', 'Transport details have been updated.');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save transport details.');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!editMode) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h5 className="h5">Transport Details</h5>
            <p className="text-sm text-gray-500 mt-0.5">Commute and vehicle information.</p>
          </div>
          {canManage && <Button variant="solid" onClick={startEdit}>{record ? 'Edit' : 'Add Details'}</Button>}
        </div>

        {!record ? (
          <div className="text-center py-16 text-gray-400">No transport details added yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {[
              ['Residential Address', record.residentialAddress],
              ['City',                record.city],
              ['Distance (km)',       record.distanceKm],
              ['Travel Type',         record.travelType],
              ['Vehicle Type',        record.vehicleType],
              ['Vehicle Number',      record.vehicleNumber],
              ['Fuel Allowance',      record.fuelAllowanceEligible ? 'Eligible' : 'Not Eligible'],
              ['Transport Allowance', record.transportAllowance ? `LKR ${record.transportAllowance.toLocaleString()}` : null],
              ['Notes',               record.notes],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm heading-text">{value ?? <span className="text-gray-400">—</span>}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h5 className="h5">Transport Details</h5>
      </div>

      <Section title="Residential" />
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        <div className="col-span-2">
          <Field label="Residential Address">
            <textarea className="input w-full" rows={2} value={form.residentialAddress} onChange={f('residentialAddress')} placeholder="No. 12, Galle Road, Colombo 03" />
          </Field>
        </div>
        <Field label="City"><Input value={form.city} onChange={f('city')} placeholder="Colombo" /></Field>
        <Field label="Distance to Office (km)"><Input type="number" step="0.1" value={form.distanceKm} onChange={f('distanceKm')} placeholder="12.5" /></Field>
      </div>

      <Section title="Commute" />
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        <Field label="Travel Type">
          <select className="input w-full" value={form.travelType} onChange={f('travelType')}>
            <option value="">Select…</option>
            {TRAVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Vehicle Type">
          <select className="input w-full" value={form.vehicleType} onChange={f('vehicleType')}>
            <option value="">Select…</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Vehicle Number"><Input value={form.vehicleNumber} onChange={f('vehicleNumber')} placeholder="CAB-1234" /></Field>
      </div>

      <Section title="Allowance" />
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        <div className="flex items-center gap-3 pt-2">
          <input type="checkbox" id="fuel_eligible" checked={form.fuelAllowanceEligible}
            onChange={e => setForm(p => ({ ...p, fuelAllowanceEligible: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-primary" />
          <label htmlFor="fuel_eligible" className="text-sm font-medium text-gray-700 dark:text-gray-300">Fuel Allowance Eligible</label>
        </div>
        <Field label="Transport Allowance (LKR)"><Input type="number" value={form.transportAllowance} onChange={f('transportAllowance')} placeholder="5000" /></Field>
      </div>

      <div className="mt-5"><Field label="Notes"><textarea className="input w-full" rows={2} value={form.notes} onChange={f('notes')} /></Field></div>

      {error && <p className="text-error text-sm mt-4">{error}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
        <Button variant="plain" onClick={() => setEditMode(false)}>Cancel</Button>
        <Button variant="solid" loading={saving} onClick={handleSave}>Save Transport Details</Button>
      </div>
    </div>
  );
}
