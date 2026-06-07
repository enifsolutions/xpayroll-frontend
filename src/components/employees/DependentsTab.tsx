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
  EmployeeDependent, DependentForm, EMPTY_DEPENDENT,
  RELATIONSHIPS, DEP_GENDERS,
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

export default function DependentsTab({ employeeId }: { employeeId: string }) {
  const canManage   = usePermission(Permissions.HR.Dependents.Manage);
  const initialized = useRef(false);

  const [items,        setItems]        = useState<EmployeeDependent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState<EmployeeDependent | null>(null);
  const [form,         setForm]         = useState<DependentForm>(EMPTY_DEPENDENT);
  const [error,        setError]        = useState('');
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDependent | null>(null);

  const load = async () => {
    try {
      const res = await api.get<EmployeeDependent[]>(`employee-dependents/${employeeId}`);
      setItems(res.data);
    } catch { showError('Load Failed', 'Could not load dependents.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const f = (field: keyof DependentForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_DEPENDENT); setError(''); setDialogOpen(true);
  };

  const openEdit = (item: EmployeeDependent) => {
    setEditing(item);
    setForm({
      fullName:            item.fullName,
      relationship:        item.relationship,
      dateOfBirth:         item.dateOfBirth         ?? '',
      gender:              item.gender               ?? '',
      nicNumber:           item.nicNumber            ?? '',
      phoneNumber:         item.phoneNumber          ?? '',
      isEmergencyContact:  item.isEmergencyContact,
      notes:               item.notes               ?? '',
    });
    setError(''); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim())   { setError('Full name is required.');   return; }
    if (!form.relationship)      { setError('Relationship is required.'); return; }
    setSaving(true);
    try {
      await api.post('employee-dependents', {
        action:             editing ? 'UPDATE' : 'ADD',
        id:                 editing?.id ?? null,
        employeeId,
        fullName:           form.fullName.trim(),
        relationship:       form.relationship,
        dateOfBirth:        form.dateOfBirth   || null,
        gender:             form.gender        || null,
        nicNumber:          form.nicNumber.trim()   || null,
        phoneNumber:        form.phoneNumber.trim() || null,
        isEmergencyContact: form.isEmergencyContact,
        notes:              form.notes.trim()  || null,
        userId: 1,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Dependent Updated' : 'Dependent Added', form.fullName);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save dependent.');
    } finally { setSaving(false); }
  };

  const promptDelete = (item: EmployeeDependent) => { setDeleteTarget(item); setConfirmOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post('employee-dependents', { action: 'DELETE', id: deleteTarget.id, employeeId, userId: 1 });
      setConfirmOpen(false); setDeleteTarget(null);
      await load();
      showSuccess('Dependent Removed', deleteTarget.fullName);
    } catch { showError('Delete Failed', 'Could not remove dependent.'); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Dependents</h5>
          <p className="text-sm text-gray-500 mt-0.5">Family members and emergency contacts.</p>
        </div>
        {canManage && (
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>Add Dependent</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No dependents added yet.</div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Name</th><th>Relationship</th><th>Date of Birth</th>
              <th>NIC</th><th>Phone</th><th>Emergency</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="font-medium heading-text">{item.fullName}</td>
                <td className="text-gray-500">{item.relationship}</td>
                <td className="text-gray-500">{item.dateOfBirth ?? '—'}</td>
                <td className="text-gray-500">{item.nicNumber ?? '—'}</td>
                <td className="text-gray-500">{item.phoneNumber ?? '—'}</td>
                <td>
                  {item.isEmergencyContact
                    ? <span className="xp-badge xp-badge-success">Yes</span>
                    : <span className="text-gray-400 text-sm">No</span>}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"><Pencil size={15} /></button>
                    )}
                    {canManage && (
                      <button onClick={() => promptDelete(item)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)}>
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? 'Edit Dependent' : 'Add Dependent'}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Full Name" required><Input value={form.fullName} onChange={f('fullName')} placeholder="Full legal name" /></Field>
              </div>
              <Field label="Relationship" required>
                <select className="input w-full" value={form.relationship} onChange={f('relationship')}>
                  <option value="">Select…</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Gender">
                <select className="input w-full" value={form.gender} onChange={f('gender')}>
                  <option value="">Select…</option>
                  {DEP_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} /></Field>
              <Field label="NIC Number"><Input value={form.nicNumber} onChange={f('nicNumber')} placeholder="987654321V" /></Field>
              <Field label="Phone Number"><Input value={form.phoneNumber} onChange={f('phoneNumber')} placeholder="077 123 4567" /></Field>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="emergency" checked={form.isEmergencyContact}
                  onChange={e => setForm(p => ({ ...p, isEmergencyContact: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary" />
                <label htmlFor="emergency" className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact</label>
              </div>
              <div className="col-span-2">
                <Field label="Notes"><textarea className="input w-full" rows={2} value={form.notes} onChange={f('notes')} /></Field>
              </div>
            </div>
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
        title="Remove Dependent"
        message={deleteTarget ? `Remove "${deleteTarget.fullName}" from dependents?` : ''}
        confirmLabel="Yes, Remove" cancelLabel="Keep It"
        loading={deleting} onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />
    </>
  );
}
