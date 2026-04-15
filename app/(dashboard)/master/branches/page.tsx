'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import { PlusIcon } from 'lucide-react';
import Switcher from '@/components/ui/Switcher';
import { Pencil, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { showSuccess, showError } from '@/lib/toast';

interface Branch {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isHeadOffice: boolean;
  isActive: boolean;
}

const EMPTY_FORM: BranchForm = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  isHeadOffice: false,
  isActive: true,
};

export default function BranchesPage() {
  const [branches, setBranches]   = useState<Branch[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]     = useState<Branch | null>(null);
  const [form, setForm]           = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Branch[]>('/branches');
      setBranches(data);
    } catch {
      setError('Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code ?? '',
      address: b.address ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      isHeadOffice: b.isHeadOffice,
      isActive: b.isActive,
    });
    setDialogOpen(true);
  };        

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/branches', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        isHeadOffice: form.isHeadOffice,
        isActive: form.isActive,
        userId: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Branch updated' : 'Branch created', form.name);
    } catch {
      showError('Failed to save', 'Could not save branch. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this branch?')) return;
    try {
      await api.post('/branches', { action: 'DELETE', id });
      await load();
    } catch {
      setError('Failed to delete branch.');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Branches</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your company branches
          </p>
        </div>
        <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
          Add Branch
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-error-subtle text-error text-sm">
          {error}
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
                  <th>Name</th>
                  <th>Code</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Head Office</th>
                  <th>Status</th>
                  <th className="w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No branches found
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id}>
                      <td className="font-medium heading-text">{b.name}</td>
                      <td>{b.code ?? '—'}</td>
                      <td>{b.phone ?? '—'}</td>
                      <td>{b.email ?? '—'}</td>
                      <td>
                        {b.isHeadOffice && (
                          <span className="badge badge-info">Head Office</span>
                        )}
                      </td>
                      <td>
                        <span className={`xp-badge ${b.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
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
        <h5 className="h5 mb-4">{editing ? 'Edit Branch' : 'Add Branch'}</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Branch Name <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Colombo Head Office"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Branch Code</label>
              <Input
                placeholder="e.g. CMB01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Address</label>
            <Input
              placeholder="e.g. No. 1, Main Street, Colombo"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone</label>
              <Input
                placeholder="e.g. +94 11 234 5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <Input
                type="email"
                placeholder="e.g. colombo@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium">Head Office</span>
              <Switcher
                checked={form.isHeadOffice}
                onChange={(val) => setForm({ ...form, isHeadOffice: val })}
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={(val) => setForm({ ...form, isActive: val })}
              />
            </label>
          </div>                 

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={saving}
            onClick={handleSave}
          >
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}