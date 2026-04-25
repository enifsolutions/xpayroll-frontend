'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  isActive: boolean;
}

interface Department {
  id: number;
  branchId: number | null;
  branchName: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

interface DeptForm {
  branchId: string;
  allBranches: boolean;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

const EMPTY: DeptForm = {
  branchId: '',
  allBranches: false,
  name: '',
  code: '',
  description: '',
  isActive: true,
};

export default function DepartmentsPage() {
  const [items, setItems]           = useState<Department[]>([]);
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Department | null>(null);
  const [form, setForm]             = useState<DeptForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const [depts, brs] = await Promise.all([
        api.get<Department[]>('/department'),
        api.get<Branch[]>('/branches'),
      ]);
      setItems(depts.data);
      setBranches(brs.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load data.');
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
    setForm(EMPTY);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({
      branchId: d.branchId ? String(d.branchId) : '',
      allBranches: !d.branchId,
      name: d.name,
      code: d.code,
      description: d.description ?? '',
      isActive: d.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    if (!form.allBranches && !form.branchId) {
      setError('Please select a branch or enable All Branches.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/department', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        branchId: form.allBranches ? null : form.branchId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        isActive: form.isActive,
        userId: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Department updated' : 'Department created', form.name);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save department.');
    } finally {
      setSaving(false);
    }
  };

  };

  const set = <K extends keyof DeptForm>(field: K, value: DeptForm[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Departments</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage company departments</p>
        </div>
        <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
          Add Department
        </Button>
      </div>

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
                  <th>Branch</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No departments found
                    </td>
                  </tr>
                ) : items.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium heading-text">{d.name}</td>
                    <td>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {d.code}
                      </code>
                    </td>
                    <td>
                      {d.branchName
                        ? d.branchName
                        : <span className="badge badge-info">All Branches</span>}
                    </td>
                    <td className="text-sm text-gray-500 max-w-xs truncate">
                      {d.description || '—'}
                    </td>
                    <td>
                      <span className={`xp-badge ${d.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">{editing ? 'Edit Department' : 'Add Department'}</h5>

        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium">All Branches</span>
              <Switcher
                checked={form.allBranches}
                onChange={val => setForm(f => ({ ...f, allBranches: val, branchId: '' }))}
              />
            </label>
          </div>

          {!form.allBranches && (
            <div>
              <label className="form-label">Branch <span className="text-error">*</span></label>
              <select
                className="input w-full"
                value={form.branchId}
                onChange={e => set('branchId', e.target.value)}
              >
                <option value="">Select branch…</option>
                {branches.map(b => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Finance"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Code <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. FIN"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <Input
              placeholder="Optional description…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={val => set('isActive', val)}
              />
            </label>
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
