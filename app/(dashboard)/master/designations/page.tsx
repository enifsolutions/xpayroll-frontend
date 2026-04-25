'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';

interface Designation {
  id: number;
  title: string;
  level: string | null;
  grade: string | null;
  isActive: boolean;
}

interface DesignationForm {
  title: string;
  level: string;
  grade: string;
  isActive: boolean;
}

const EMPTY: DesignationForm = {
  title: '',
  level: '',
  grade: '',
  isActive: true,
};

export default function DesignationsPage() {
  const [items, setItems]           = useState<Designation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Designation | null>(null);
  const [form, setForm]             = useState<DesignationForm>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const initialized                 = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<Designation[]>('/designation');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load designations.');
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
    setDialogOpen(true);
  };

  const openEdit = (d: Designation) => {
    setEditing(d);
    setForm({
      title: d.title,
      level: d.level ?? '',
      grade: d.grade ?? '',
      isActive: d.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/designation/save', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        title: form.title.trim(),
        level: form.level.trim() || null,
        grade: form.grade.trim() || null,
        isActive: form.isActive,
        userId: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Designation updated' : 'Designation created', form.title);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save designation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Designation) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    try {
      await api.post('/designation/save', { action: 'DELETE', id: d.id });
      await load();
      showSuccess('Designation deleted', d.title);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete designation.');
    }
  };

  const set = <K extends keyof DesignationForm>(field: K, value: DesignationForm[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Designations</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage job designations, levels and grades
          </p>
        </div>
        <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
          Add Designation
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
                  <th>Title</th>
                  <th>Level</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No designations found
                    </td>
                  </tr>
                ) : items.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium heading-text">{d.title}</td>
                    <td>{d.level ?? '—'}</td>
                    <td>{d.grade ?? '—'}</td>
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

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">{editing ? 'Edit Designation' : 'Add Designation'}</h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">Title <span className="text-error">*</span></label>
            <Input
              placeholder="e.g. Software Engineer"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Level</label>
              <Input
                placeholder="e.g. Senior"
                value={form.level}
                onChange={e => set('level', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Grade</label>
              <Input
                placeholder="e.g. G3"
                value={form.grade}
                onChange={e => set('grade', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={val => set('isActive', val)}
            />
          </div>
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