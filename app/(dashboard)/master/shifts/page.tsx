'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2, Clock, Moon } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  code: string;
  expectedStart: string;       // "HH:mm:ss" from TIME column
  expectedEnd: string;
  breakDurationMinutes: number;
  workingHoursPerDay: number;
  isNightShift: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface ShiftForm {
  name: string;
  code: string;
  expectedStart: string;         // "HH:mm" for <input type="time">
  expectedEnd: string;
  breakDurationMinutes: string;
  workingHoursPerDay: string;
  isNightShift: boolean;
  isActive: boolean;
}

const EMPTY: ShiftForm = {
  name: '',
  code: '',
  expectedStart: '08:00',
  expectedEnd: '17:00',
  breakDurationMinutes: '60',
  workingHoursPerDay: '8',
  isNightShift: false,
  isActive: true,
};

// "08:00:00" → "08:00"
const toTimeInput = (t: string) => (t ? t.substring(0, 5) : '');
// "08:00" → "08:00:00"
const toTimeValue = (t: string) => (t ? `${t}:00` : '');

const fmt12 = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function ShiftsPage() {
  const [items, setItems]           = useState<Shift[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Shift | null>(null);
  const [form, setForm]             = useState<ShiftForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<Shift[]>('/Shift');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load shifts.');
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

  const openEdit = (item: Shift) => {
    setEditing(item);
    setForm({
      name:                 item.name,
      code:                 item.code,
      expectedStart:        toTimeInput(item.expectedStart),
      expectedEnd:          toTimeInput(item.expectedEnd),
      breakDurationMinutes: String(item.breakDurationMinutes),
      workingHoursPerDay:   String(item.workingHoursPerDay),
      isNightShift:         item.isNightShift,
      isActive:             item.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and Code are required.');
      return;
    }
    if (!form.expectedStart || !form.expectedEnd) {
      setError('Start and End times are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/Shift/save', {
        action:               editing ? 'UPDATE' : 'ADD',
        id:                   editing?.id ?? null,
        name:                 form.name.trim(),
        code:                 form.code.trim().toUpperCase(),
        expectedStart:        toTimeValue(form.expectedStart),
        expectedEnd:          toTimeValue(form.expectedEnd),
        breakDurationMinutes: parseInt(form.breakDurationMinutes) || 0,
        workingHoursPerDay:   parseFloat(form.workingHoursPerDay) || 8,
        isNightShift:         form.isNightShift,
        isActive:             form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Shift updated' : 'Shift created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save shift.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Shift) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post('/Shift/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Shift deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete shift.');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Shifts</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage work shift schedules and their timings.
          </p>
        </div>
        <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
          Add Shift
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
                  <th>Code</th>
                  <th>Timing</th>
                  <th>Break</th>
                  <th>Working Hours</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No shifts found
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium heading-text">{item.name}</td>
                    <td>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {item.code}
                      </code>
                    </td>
                    <td className="tabular-nums text-sm">
                      {fmt12(item.expectedStart)} – {fmt12(item.expectedEnd)}
                    </td>
                    <td>{item.breakDurationMinutes} min</td>
                    <td>{Number(item.workingHoursPerDay).toFixed(1)} hrs</td>
                    <td>
                      <span className={`xp-badge ${item.isNightShift ? 'xp-badge-info' : 'xp-badge-warning'}`}>
                        <span className="inline-flex items-center gap-1">
                          {item.isNightShift ? <Moon size={11} /> : <Clock size={11} />}
                          {item.isNightShift ? 'Night' : 'Day'}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
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
        <h5 className="h5 mb-4">{editing ? 'Edit Shift' : 'Add Shift'}</h5>

        <div className="space-y-4">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Morning Shift"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Code <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. MORN"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                maxLength={50}
              />
            </div>
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Time <span className="text-error">*</span></label>
              <Input
                type="time"
                value={form.expectedStart}
                onChange={e => setForm(f => ({ ...f, expectedStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">End Time <span className="text-error">*</span></label>
              <Input
                type="time"
                value={form.expectedEnd}
                onChange={e => setForm(f => ({ ...f, expectedEnd: e.target.value }))}
              />
            </div>
          </div>

          {/* Break + Working hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Break Duration (minutes)</label>
              <Input
                type="number"
                min="0"
                placeholder="60"
                value={form.breakDurationMinutes}
                onChange={e => setForm(f => ({ ...f, breakDurationMinutes: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Working Hours / Day</label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="8"
                value={form.workingHoursPerDay}
                onChange={e => setForm(f => ({ ...f, workingHoursPerDay: e.target.value }))}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Night Shift</span>
              <Switcher
                checked={form.isNightShift}
                onChange={val => setForm(f => ({ ...f, isNightShift: val }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={val => setForm(f => ({ ...f, isActive: val }))}
              />
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}