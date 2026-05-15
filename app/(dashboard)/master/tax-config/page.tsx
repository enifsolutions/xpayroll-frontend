'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

interface TaxConfig {
  id: string;
  name: string;
  taxYear: number;
  regime: string;
  isActive: boolean;
  createdAt: string;
}

interface TaxConfigForm {
  name: string;
  taxYear: string;
  regime: string;
  isActive: boolean;
}

const EMPTY: TaxConfigForm = {
  name: '',
  taxYear: String(new Date().getFullYear()),
  regime: 'PAYE',
  isActive: true,
};

const REGIMES = ['PAYE', 'APIT', 'WHT', 'Other'];

const REGIME_COLORS: Record<string, string> = {
  PAYE: 'xp-badge-primary',
  APIT: 'xp-badge-info',
  WHT:  'xp-badge-warning',
  Other:'xp-badge-neutral',
};

export default function TaxConfigPage() {
  useRequirePermission(Permissions.MasterData.TaxConfig.View);
  const canManage = usePermission(Permissions.MasterData.TaxConfig.Manage);

  const [items, setItems]           = useState<TaxConfig[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<TaxConfig | null>(null);
  const [form, setForm]             = useState<TaxConfigForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<TaxConfig[]>("/tax-configs");
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load tax configurations.');
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

  const openEdit = (item: TaxConfig) => {
    setEditing(item);
    setForm({
      name:     item.name,
      taxYear:  String(item.taxYear),
      regime:   item.regime,
      isActive: item.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.taxYear)      { setError('Tax year is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post("/tax-configs/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        taxYear: parseInt(form.taxYear),
        regime: form.regime,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Tax config updated' : 'Tax config created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save tax config.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: TaxConfig) => {
    if (!confirm(`Delete tax config "${item.name}"?`)) return;
    try {
      await api.post("/tax-configs/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess('Tax config deleted', item.name);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete tax config.');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Tax Configuration</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            PAYE and other tax regime configurations by year. Tax slabs are
            managed within each config.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Add Config
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
                  <th>Tax Year</th>
                  <th>Regime</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No tax configurations found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium heading-text">{item.name}</td>
                      <td className="font-semibold text-primary">
                        {item.taxYear}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${REGIME_COLORS[item.regime] ?? "xp-badge-neutral"}`}
                        >
                          {item.regime}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {new Date(item.createdAt).toLocaleDateString()}
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
          {editing ? "Edit Tax Config" : "Add Tax Config"}
        </h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              Name <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. PAYE 2025/2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Tax Year <span className="text-error">*</span>
              </label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.taxYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taxYear: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Regime</label>
              <select
                className="input w-full"
                value={form.regime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, regime: e.target.value }))
                }
              >
                {REGIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
            />
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