'use client';
import { useEffect, useRef, useState } from 'react';
import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSuccess, showError } from '@/lib/toast';
import api from '@/lib/axios';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';
import {
  EmployeeQualification, QualificationForm, EMPTY_QUALIFICATION,
  QUALIFICATION_CATEGORIES,
} from '@/types/employee-extended.types';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}{required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Education:     'xp-badge-info',
  Experience:    'xp-badge-success',
  Expertise:     'xp-badge-warning',
  Certification: 'xp-badge-primary',
  Language:      'xp-badge-neutral',
};

export default function QualificationsTab({ employeeId }: { employeeId: string }) {
  const canManage   = usePermission(Permissions.HR.Qualifications.Manage);
  const initialized = useRef(false);

  const [items,        setItems]        = useState<EmployeeQualification[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [catFilter,    setCatFilter]    = useState('');
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState<EmployeeQualification | null>(null);
  const [form,         setForm]         = useState<QualificationForm>(EMPTY_QUALIFICATION);
  const [error,        setError]        = useState('');
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeQualification | null>(null);

  const load = async () => {
    try {
      const res = await api.get<EmployeeQualification[]>(`employee-qualifications/${employeeId}`);
      setItems(res.data);
    } catch { showError('Load Failed', 'Could not load qualifications.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const f = (field: keyof QualificationForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_QUALIFICATION); setError(''); setDialogOpen(true);
  };

  const openEdit = (item: EmployeeQualification) => {
    setEditing(item);
    setForm({
      category:    item.category,
      title:       item.title,
      institution: item.institution  ?? '',
      fromDate:    item.fromDate     ?? '',
      toDate:      item.toDate       ?? '',
      isCurrent:   item.isCurrent,
      grade:       item.grade        ?? '',
      description: item.description  ?? '',
    });
    setError(''); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      await api.post('employee-qualifications', {
        action:      editing ? 'UPDATE' : 'ADD',
        id:          editing?.id ?? null,
        employeeId,
        category:    form.category,
        title:       form.title.trim(),
        institution: form.institution.trim() || null,
        fromDate:    form.fromDate  || null,
        toDate:      form.isCurrent ? null : (form.toDate || null),
        isCurrent:   form.isCurrent,
        grade:       form.grade.trim()       || null,
        description: form.description.trim() || null,
        userId: 1,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Qualification Updated' : 'Qualification Added', form.title);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save qualification.');
    } finally { setSaving(false); }
  };

  const promptDelete = (item: EmployeeQualification) => { setDeleteTarget(item); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post('employee-qualifications', { action: 'DELETE', id: deleteTarget.id, employeeId, userId: 1 });
      setConfirmOpen(false); setDeleteTarget(null);
      await load();
      showSuccess('Qualification Removed', deleteTarget.title);
    } catch { showError('Delete Failed', 'Could not remove qualification.'); }
    finally { setDeleting(false); }
  };

  const filtered = catFilter ? items.filter(i => i.category === catFilter) : items;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Qualifications</h5>
          <p className="text-sm text-gray-500 mt-0.5">Education, experience, expertise, certifications and languages.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {QUALIFICATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {canManage && <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>Add</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No qualifications added yet.</div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Category</th><th>Title</th><th>Institution</th>
              <th>Period</th><th>Grade</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td><span className={`xp-badge ${CATEGORY_COLORS[item.category] ?? 'xp-badge-neutral'}`}>{item.category}</span></td>
                <td>
                  <div className="font-medium heading-text">{item.title}</div>
                  {item.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</div>}
                </td>
                <td className="text-gray-500">{item.institution ?? '—'}</td>
                <td className="text-gray-500 text-sm">
                  {item.fromDate ?? '?'} — {item.isCurrent ? <span className="xp-badge xp-badge-success text-xs">Current</span> : (item.toDate ?? '?')}
                </td>
                <td className="text-gray-500">{item.grade ?? '—'}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"><Pencil size={15} /></button>}
                    {canManage && <button onClick={() => promptDelete(item)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)}>
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? 'Edit Qualification' : 'Add Qualification'}</h5>
          <div className="space-y-4">
            <Field label="Category" required>
              <select className="input w-full" value={form.category} onChange={f('category')}>
                {QUALIFICATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Title" required><Input value={form.title} onChange={f('title')} placeholder="BSc Computer Science / Senior Developer / Python…" /></Field>
            <Field label="Institution / Company / Issuing Body"><Input value={form.institution} onChange={f('institution')} placeholder="University of Colombo" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From Date"><Input type="date" value={form.fromDate} onChange={f('fromDate')} /></Field>
              <Field label="To Date">
                <Input type="date" value={form.toDate} onChange={f('toDate')} disabled={form.isCurrent} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_current" checked={form.isCurrent}
                onChange={e => setForm(p => ({ ...p, isCurrent: e.target.checked, toDate: e.target.checked ? '' : p.toDate }))}
                className="w-4 h-4 rounded border-gray-300 text-primary" />
              <label htmlFor="is_current" className="text-sm font-medium text-gray-700 dark:text-gray-300">Currently Active / Ongoing</label>
            </div>
            <Field label="Grade / Result"><Input value={form.grade} onChange={f('grade')} placeholder="Second Upper / Pass / 4.0 GPA" /></Field>
            <Field label="Description"><textarea className="input w-full" rows={2} value={form.description} onChange={f('description')} /></Field>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen} variant="danger"
        title="Remove Qualification"
        message={deleteTarget ? `Remove "${deleteTarget.title}"?` : ''}
        confirmLabel="Yes, Remove" cancelLabel="Keep It"
        loading={deleting} onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />
    </>
  );
}
