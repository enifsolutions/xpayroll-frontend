'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';

interface PublicHoliday {
  id: string;
  name: string;
  holidayDate: string;
  isOptional: boolean;
  createdAt: string;
}

interface PublicHolidayForm {
  name: string;
  holidayDate: string;
  isOptional: boolean;
}

const EMPTY: PublicHolidayForm = {
  name: '',
  holidayDate: '',
  isOptional: false,
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(d: string) {
  const dt = new Date(d);
  return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

function getDayOfWeek(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

export default function PublicHolidaysPage() {
  const [items, setItems]           = useState<PublicHoliday[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<PublicHoliday | null>(null);
  const [form, setForm]             = useState<PublicHolidayForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<PublicHoliday[]>(`/PublicHolidays?year=${yearFilter}`);
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load public holidays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    load();
  }, [yearFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: PublicHoliday) => {
    setEditing(item);
    setForm({
      name:        item.name,
      holidayDate: item.holidayDate,
      isOptional:  item.isOptional,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.holidayDate)  { setError('Date is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/PublicHolidays/save', {
        action:      editing ? 'UPDATE' : 'ADD',
        id:          editing?.id ?? null,
        name:        form.name.trim(),
        holidayDate: form.holidayDate,
        isOptional:  form.isOptional,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Holiday updated' : 'Holiday added', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save holiday.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PublicHoliday) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post('/PublicHolidays/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Holiday deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete holiday.');
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

  const mandatory = items.filter(h => !h.isOptional).length;
  const optional  = items.filter(h => h.isOptional).length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Public Holidays</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage company-wide public holidays used in payroll and leave calculations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input"
            value={yearFilter}
            onChange={e => setYearFilter(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="card-body py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold heading-text mt-1">{items.length}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Mandatory</p>
              <p className="text-2xl font-bold heading-text mt-1">{mandatory}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Optional</p>
              <p className="text-2xl font-bold heading-text mt-1">{optional}</p>
            </div>
          </div>
        </div>
      )}

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
                  <th>Date</th>
                  <th>Day</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No public holidays for {yearFilter}
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium text-primary">{formatDate(item.holidayDate)}</td>
                    <td className="text-gray-500 text-sm">{getDayOfWeek(item.holidayDate)}</td>
                    <td className="font-medium heading-text">{item.name}</td>
                    <td>
                      <span className={`xp-badge ${item.isOptional ? 'xp-badge-warning' : 'xp-badge-info'}`}>
                        {item.isOptional ? 'Optional' : 'Mandatory'}
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
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
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
        <h5 className="h5 mb-4">{editing ? 'Edit Holiday' : 'Add Public Holiday'}</h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">Name <span className="text-error">*</span></label>
            <Input
              placeholder="e.g. Independence Day"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Date <span className="text-error">*</span></label>
            <Input
              type="date"
              value={form.holidayDate}
              onChange={e => setForm(f => ({ ...f, holidayDate: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Optional Holiday</p>
              <p className="text-xs text-gray-500 mt-0.5">Employees can choose whether to take this day off</p>
            </div>
            <Switcher
              checked={form.isOptional}
              onChange={val => setForm(f => ({ ...f, isOptional: val }))}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Add Holiday'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}