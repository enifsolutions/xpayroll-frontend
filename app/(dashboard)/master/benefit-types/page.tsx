'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

interface BenefitType {
  id: string;
  name: string;
  code: string;
  type: string;
  calculationType: string;
  defaultAmount: number;
  defaultPercentage: number;
  isTaxable: boolean;
  isPensionable: boolean;
  isRecurring: boolean;
  isActive: boolean;
}

interface BenefitTypeForm {
  name: string;
  code: string;
  type: string;
  calculationType: string;
  defaultAmount: string;
  defaultPercentage: string;
  isTaxable: boolean;
  isPensionable: boolean;
  isRecurring: boolean;
  isActive: boolean;
}

const EMPTY: BenefitTypeForm = {
  name: '',
  code: '',
  type: 'Allowance',
  calculationType: 'FixedAmount',
  defaultAmount: '0',
  defaultPercentage: '0',
  isTaxable: false,
  isPensionable: false,
  isRecurring: true,
  isActive: true,
};

const TYPE_OPTIONS = [
  { value: 'Allowance', label: 'Allowance' },
  { value: 'Deduction', label: 'Deduction' },
];

const CALC_OPTIONS = [
  { value: 'FixedAmount', label: 'Fixed Amount' },
  { value: 'Percentage',  label: 'Percentage' },
];

export default function BenefitTypesPage() {
  const canManage = usePermission(Permissions.MasterData.BenefitTypes.Manage);
  const [items, setItems]           = useState<BenefitType[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<BenefitType | null>(null);
  const [form, setForm]             = useState<BenefitTypeForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<BenefitType[]>('/BenefitType');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load benefit types.');
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

  const openEdit = (item: BenefitType) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      type: item.type,
      calculationType: item.calculationType,
      defaultAmount: String(item.defaultAmount),
      defaultPercentage: String(item.defaultPercentage),
      isTaxable: item.isTaxable,
      isPensionable: item.isPensionable,
      isRecurring: item.isRecurring,
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
      await api.post('/BenefitType/save', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        calculationType: form.calculationType,
        defaultAmount: parseFloat(form.defaultAmount) || 0,
        defaultPercentage: parseFloat(form.defaultPercentage) || 0,
        isTaxable: form.isTaxable,
        isPensionable: form.isPensionable,
        isRecurring: form.isRecurring,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Benefit type updated' : 'Benefit type created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save benefit type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: BenefitType) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post('/BenefitType/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Benefit type deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete benefit type.');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Benefit Types</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define allowances and deductions applied to employee payroll.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Add Benefit Type
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
                  <th>Type</th>
                  <th>Calculation</th>
                  <th>Default Value</th>
                  <th>Taxable</th>
                  <th>Pensionable</th>
                  <th>Recurring</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">
                      No benefit types found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium heading-text">{item.name}</td>
                      <td>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {item.code}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.type === "Allowance" ? "xp-badge-success" : "xp-badge-warning"}`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td>
                        {CALC_OPTIONS.find(
                          (o) => o.value === item.calculationType,
                        )?.label ?? item.calculationType}
                      </td>
                      <td>
                        {item.calculationType === "FixedAmount"
                          ? item.defaultAmount.toFixed(2)
                          : `${item.defaultPercentage.toFixed(2)}%`}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.isTaxable ? "xp-badge-warning" : "xp-badge-neutral"}`}
                        >
                          {item.isTaxable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.isPensionable ? "xp-badge-info" : "xp-badge-neutral"}`}
                        >
                          {item.isPensionable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.isRecurring ? "xp-badge-info" : "xp-badge-neutral"}`}
                        >
                          {item.isRecurring ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
        <h5 className="h5 mb-4">
          {editing ? "Edit Benefit Type" : "Add Benefit Type"}
        </h5>

        <div className="space-y-4">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Name <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Housing Allowance"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Code <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. HOU_ALLOW"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          {/* Type + Calculation Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Calculation Type</label>
              <select
                className="input w-full"
                value={form.calculationType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, calculationType: e.target.value }))
                }
              >
                {CALC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Default Amount / Percentage — conditional */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Default Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.defaultAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultAmount: e.target.value }))
                }
                disabled={form.calculationType !== "FixedAmount"}
              />
            </div>
            <div>
              <label className="form-label">Default Percentage (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
                value={form.defaultPercentage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, defaultPercentage: e.target.value }))
                }
                disabled={form.calculationType !== "Percentage"}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Taxable</span>
              <Switcher
                checked={form.isTaxable}
                onChange={(val) => setForm((f) => ({ ...f, isTaxable: val }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Pensionable</span>
              <Switcher
                checked={form.isPensionable}
                onChange={(val) =>
                  setForm((f) => ({ ...f, isPensionable: val }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Recurring</span>
              <Switcher
                checked={form.isRecurring}
                onChange={(val) => setForm((f) => ({ ...f, isRecurring: val }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
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
            {editing ? "Update" : "Create"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}