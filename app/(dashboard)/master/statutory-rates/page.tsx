'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';

interface StatutoryRate {
  id: string;
  scheme: string;
  effectiveYear: number;
  effectiveMonth: number;
  employeeRate: number;
  employerRate: number;
  maxWageCeiling: number | null;
  isActive: boolean;
}

interface StatutoryRateForm {
  scheme: string;
  effectiveYear: string;
  effectiveMonth: string;
  employeeRate: string;
  employerRate: string;
  maxWageCeiling: string;
  isActive: boolean;
}

const EMPTY: StatutoryRateForm = {
  scheme: 'EPF',
  effectiveYear: String(new Date().getFullYear()),
  effectiveMonth: '1',
  employeeRate: '0',
  employerRate: '0',
  maxWageCeiling: '',
  isActive: true,
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const SCHEMES = ['EPF', 'ETF', 'PAYE', 'APIT', 'SocialSecurity', 'Other'];

export default function StatutoryRatesPage() {
  const [items, setItems]             = useState<StatutoryRate[]>([]);
  const [loading, setLoading]         = useState(true);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState<StatutoryRate | null>(null);
  const [form, setForm]               = useState<StatutoryRateForm>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [schemeFilter, setSchemeFilter] = useState('');
  const initialized                   = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<StatutoryRate[]>('/StatutoryRate');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load statutory rates.');
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

  const openEdit = (item: StatutoryRate) => {
    setEditing(item);
    setForm({
      scheme:         item.scheme,
      effectiveYear:  String(item.effectiveYear),
      effectiveMonth: String(item.effectiveMonth),
      employeeRate:   String(item.employeeRate),
      employerRate:   String(item.employerRate),
      maxWageCeiling: item.maxWageCeiling != null ? String(item.maxWageCeiling) : '',
      isActive:       item.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.scheme.trim()) { setError('Scheme is required.'); return; }
    if (!form.effectiveYear)  { setError('Effective year is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/StatutoryRate/save', {
        action:         editing ? 'UPDATE' : 'ADD',
        id:             editing?.id ?? null,
        scheme:         form.scheme,
        effectiveYear:  parseInt(form.effectiveYear),
        effectiveMonth: parseInt(form.effectiveMonth) || 1,
        employeeRate:   parseFloat(form.employeeRate) || 0,
        employerRate:   parseFloat(form.employerRate) || 0,
        maxWageCeiling: form.maxWageCeiling ? parseFloat(form.maxWageCeiling) : null,
        isActive:       form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Rate updated' : 'Rate added', `${form.scheme} ${form.effectiveYear}`);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save statutory rate.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: StatutoryRate) => {
    if (!confirm(`Delete "${item.scheme}" rate for ${item.effectiveYear}?`)) return;
    try {
      await api.post('/StatutoryRate/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Rate deleted', `${item.scheme} ${item.effectiveYear}`);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete rate.');
    }
  };

  const schemes  = [...new Set(items.map(i => i.scheme))].sort();
  const filtered = schemeFilter ? items.filter(i => i.scheme === schemeFilter) : items;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Statutory Rates</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            EPF, ETF, PAYE and other statutory contribution rates by year and scheme.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input"
            value={schemeFilter}
            onChange={e => setSchemeFilter(e.target.value)}
          >
            <option value="">All Schemes</option>
            {schemes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Rate
          </Button>
        </div>
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
                  <th>Scheme</th>
                  <th>Year</th>
                  <th>Month</th>
                  <th>Employee Rate</th>
                  <th>Employer Rate</th>
                  <th>Wage Ceiling</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No statutory rates found
                    </td>
                  </tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td><span className="font-semibold text-primary">{item.scheme}</span></td>
                    <td className="font-medium heading-text">{item.effectiveYear}</td>
                    <td className="text-gray-500">{MONTHS[item.effectiveMonth - 1]}</td>
                    <td><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.employeeRate}%</code></td>
                    <td><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.employerRate}%</code></td>
                    <td className="text-gray-500">
                      {item.maxWageCeiling != null ? item.maxWageCeiling.toLocaleString() : '—'}
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
        <h5 className="h5 mb-4">{editing ? 'Edit Statutory Rate' : 'Add Statutory Rate'}</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Scheme <span className="text-error">*</span></label>
              <select
                className="input w-full"
                value={form.scheme}
                onChange={e => setForm(f => ({ ...f, scheme: e.target.value }))}
              >
                {SCHEMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Effective Year <span className="text-error">*</span></label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.effectiveYear}
                onChange={e => setForm(f => ({ ...f, effectiveYear: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Effective Month</label>
            <select
              className="input w-full"
              value={form.effectiveMonth}
              onChange={e => setForm(f => ({ ...f, effectiveMonth: e.target.value }))}
            >
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee Rate (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.employeeRate}
                onChange={e => setForm(f => ({ ...f, employeeRate: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Employer Rate (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.employerRate}
                onChange={e => setForm(f => ({ ...f, employerRate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Max Wage Ceiling <span className="text-xs text-gray-400">(optional)</span></label>
            <Input
              type="number"
              min="0"
              placeholder="Leave blank for no ceiling"
              value={form.maxWageCeiling}
              onChange={e => setForm(f => ({ ...f, maxWageCeiling: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={val => setForm(f => ({ ...f, isActive: val }))}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Add Rate'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}