'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { usePermission } from '@/hooks/usePermission'
import { Permissions } from '@/lib/permissions'

interface LeaveType {
  id: number;
  name: string;
  code: string;
  accrualType: string;
  daysPerYear: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryDays: number;
  requiresApproval: boolean;
  minNoticeDays: number;
  genderRestriction: string | null;
  isActive: boolean;
}

interface LeaveTypeForm {
  name: string;
  code: string;
  accrualType: string;
  daysPerYear: string;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryDays: string;
  requiresApproval: boolean;
  minNoticeDays: string;
  genderRestriction: string;
  isActive: boolean;
}

const EMPTY: LeaveTypeForm = {
  name: '',
  code: '',
  accrualType: 'Annual',
  daysPerYear: '',
  isPaid: true,
  carryForward: false,
  maxCarryDays: '0',
  requiresApproval: true,
  minNoticeDays: '0',
  genderRestriction: '-',
  isActive: true,
};

const ACCRUAL_OPTIONS = [
  { value: 'Annual',    label: 'Annual' },
  { value: 'Monthly',   label: 'Monthly' },
  { value: 'NoAccrual', label: 'No Accrual' },
];

export default function LeaveTypesPage() {
  useRequirePermission(Permissions.MasterData.DeductionTypes.View)
  const canManage = usePermission(Permissions.MasterData.DeductionTypes.Manage)

  const [items, setItems]           = useState<LeaveType[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<LeaveType | null>(null);
  const [form, setForm]             = useState<LeaveTypeForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<LeaveType[]>('/leavetype');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load leave types.');
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

  const openEdit = (item: LeaveType) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      accrualType: item.accrualType,
      daysPerYear: String(item.daysPerYear),
      isPaid: item.isPaid,
      carryForward: item.carryForward,
      maxCarryDays: String(item.maxCarryDays),
      requiresApproval: item.requiresApproval,
      minNoticeDays: String(item.minNoticeDays),
      genderRestriction: item.genderRestriction ?? '',
      isActive: item.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and Code are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/leavetype/save', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        accrualType: form.accrualType,
        daysPerYear: parseFloat(form.daysPerYear) || 0,
        isPaid: form.isPaid,
        carryForward: form.carryForward,
        maxCarryDays: parseInt(form.maxCarryDays) || 0,
        requiresApproval: form.requiresApproval,
        minNoticeDays: parseInt(form.minNoticeDays) || 0,
        genderRestriction: form.genderRestriction || null,
        isActive: form.isActive,
        userId: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Leave type updated' : 'Leave type created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save leave type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LeaveType) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post('/leavetype/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Leave type deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete leave type.');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Leave Types</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define leave entitlements, accrual rules, and approval policies.
          </p>
        </div>
        {canManage && (
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Leave Type
          </Button>
        )}
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
                  <th>Accrual</th>
                  <th>Days/Year</th>
                  <th>Paid</th>
                  <th>Carry Forward</th>
                  <th>Approval</th>
                  <th>Min Notice</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-400">
                      No leave types found
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
                    <td>{ACCRUAL_OPTIONS.find(o => o.value === item.accrualType)?.label ?? item.accrualType}</td>
                    <td>{item.daysPerYear}</td>
                    <td>
                      <span className={`xp-badge ${item.isPaid ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                        {item.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      {item.carryForward
                        ? <span className="xp-badge xp-badge-info">Up to {item.maxCarryDays}d</span>
                        : <span className="xp-badge xp-badge-neutral">No</span>}
                    </td>
                    <td>
                      <span className={`xp-badge ${item.requiresApproval ? 'xp-badge-warning' : 'xp-badge-neutral'}`}>
                        {item.requiresApproval ? 'Required' : 'Auto'}
                      </span>
                    </td>
                    <td>{item.minNoticeDays > 0 ? `${item.minNoticeDays}d` : '—'}</td>
                    <td>
                      {item.genderRestriction
                        ? <span className="xp-badge xp-badge-info">{item.genderRestriction}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td>
                      <span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canManage && (
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-error dark:hover:bg-gray-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
        <h5 className="h5 mb-4">{editing ? 'Edit Leave Type' : 'Add Leave Type'}</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Annual Leave"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Code <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. AL"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Accrual Type</label>
              <select
                className="input w-full"
                value={form.accrualType}
                onChange={e => setForm(f => ({ ...f, accrualType: e.target.value }))}
              >
                {ACCRUAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Days Per Year</label>
              <Input
                type="number"
                placeholder="e.g. 14"
                value={form.daysPerYear}
                onChange={e => setForm(f => ({ ...f, daysPerYear: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Min Notice Days</label>
              <Input
                type="number"
                placeholder="0"
                value={form.minNoticeDays}
                onChange={e => setForm(f => ({ ...f, minNoticeDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Max Carry Forward Days</label>
              <Input
                type="number"
                placeholder="0"
                value={form.maxCarryDays}
                onChange={e => setForm(f => ({ ...f, maxCarryDays: e.target.value }))}
                disabled={!form.carryForward}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Gender Restriction</label>
            <select
              className="input w-full"
              value={form.genderRestriction}
              onChange={e => setForm(f => ({ ...f, genderRestriction: e.target.value }))}
            >
              <option value="">No Restriction</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="All">All</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Paid Leave</span>
              <Switcher checked={form.isPaid} onChange={val => setForm(f => ({ ...f, isPaid: val }))} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Carry Forward</span>
              <Switcher checked={form.carryForward} onChange={val => setForm(f => ({ ...f, carryForward: val }))} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Requires Approval</span>
              <Switcher checked={form.requiresApproval} onChange={val => setForm(f => ({ ...f, requiresApproval: val }))} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Active</span>
              <Switcher checked={form.isActive} onChange={val => setForm(f => ({ ...f, isActive: val }))} />
            </div>
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
