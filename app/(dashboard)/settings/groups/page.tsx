'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useEffect, useRef, useState } from 'react'
import { PlusIcon, Pencil, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { showSuccess, showError } from '@/lib/toast'
import api from '@/lib/axios'
import { usePermission } from '@/hooks/usePermission'
import { Permissions } from '@/lib/permissions'

interface Group {
  id: string; name: string; code: string; description?: string | null;
  leadId?: string | null; leadName?: string | null;
  departmentId?: string | null; departmentName?: string | null;
  isActive: boolean;
}
interface Department { id: string; name: string; }
interface Employee { id: string; firstName: string; lastName: string; }

interface GroupForm {
  name: string; code: string; description: string;
  leadId: string; departmentId: string; isActive: boolean;
}
const EMPTY: GroupForm = { name: '', code: '', description: '', leadId: '', departmentId: '', isActive: true };

export default function GroupsPage() {
  useRequirePermission(Permissions.Settings.Groups.View)
  const canManage = usePermission(Permissions.Settings.Groups.Manage)
  const initialized = useRef(false)

  const [items,        setItems]        = useState<Group[]>([])
  const [departments,  setDepartments]  = useState<Department[]>([])
  const [employees,    setEmployees]    = useState<Employee[]>([])
  const [loading,      setLoading]      = useState(true)
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [editing,      setEditing]      = useState<Group | null>(null)
  const [form,         setForm]         = useState<GroupForm>(EMPTY)
  const [error,        setError]        = useState('')
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  const load = async () => {
    try {
      const [grpRes, deptRes, empRes] = await Promise.all([
        api.get<Group[]>('groups'),
        api.get<Department[]>('departments'),
        api.get<Employee[]>('employees'),
      ])
      setItems(grpRes.data)
      setDepartments(deptRes.data.filter((d: any) => d.isActive))
      setEmployees(empRes.data)
    } catch { showError('Load Failed', 'Could not load groups.') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (initialized.current) return; initialized.current = true; load() }, [])

  const f = (field: keyof GroupForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  const openAdd = () => { setEditing(null); setForm(EMPTY); setError(''); setDialogOpen(true) }
  const openEdit = (item: Group) => {
    setEditing(item)
    setForm({ name: item.name, code: item.code, description: item.description ?? '',
      leadId: item.leadId ?? '', departmentId: item.departmentId ?? '', isActive: item.isActive })
    setError(''); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.code.trim()) { setError('Code is required.'); return }
    setSaving(true)
    try {
      await api.post('groups/save', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        name: form.name.trim(), code: form.code.trim(),
        description: form.description.trim() || null,
        leadId: form.leadId || null,
        departmentId: form.departmentId || null,
        isActive: form.isActive, userId: 1,
      })
      setDialogOpen(false); await load()
      showSuccess(editing ? 'Group Updated' : 'Group Added', form.name)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to save group.') }
    finally { setSaving(false) }
  }

  const promptDelete = (item: Group) => { setDeleteTarget(item); setConfirmOpen(true) }
  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try {
      await api.post('groups/save', { action: 'DELETE', id: deleteTarget.id, userId: 1 })
      setConfirmOpen(false); setDeleteTarget(null); await load()
      showSuccess('Group Removed', deleteTarget.name)
    } catch { showError('Delete Failed', 'Could not remove group.') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h3 className="h3">Groups</h3><p className="text-gray-500 mt-1">Manage employee groups and their leads.</p></div>
        {canManage && <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>Add Group</Button>}
      </div>
      <div className="card"><div className="card-body">
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div> : (
          <table className="table-default table-hover w-full">
            <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Lead</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">No groups found</td></tr>
                : items.map(item => (
                <tr key={item.id}>
                  <td><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.code}</code></td>
                  <td className="font-medium heading-text">{item.name}</td>
                  <td className="text-gray-500">{item.departmentName ?? '—'}</td>
                  <td className="text-gray-500">{item.leadName ?? '—'}</td>
                  <td><span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-neutral'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="flex justify-end gap-1">
                    {canManage && <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"><Pencil size={15} /></button>}
                    {canManage && <button onClick={() => promptDelete(item)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)}>
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? 'Edit Group' : 'Add Group'}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Name <span className="text-red-500">*</span></label><Input value={form.name} onChange={f('name')} placeholder="Group name" /></div>
              <div><label className="form-label">Code <span className="text-red-500">*</span></label><Input value={form.code} onChange={f('code')} placeholder="GRP001" /></div>
            </div>
            <div><label className="form-label">Department</label>
              <select className="input w-full" value={form.departmentId} onChange={f('departmentId')}>
                <option value="">— Select Department —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="form-label">Lead</label>
              <select className="input w-full" value={form.leadId} onChange={f('leadId')}>
                <option value="">— Select Lead —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div><label className="form-label">Description</label><textarea className="input w-full" rows={2} value={form.description} onChange={f('description')} /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="group_active" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary" />
              <label htmlFor="group_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={confirmOpen} variant="danger" title="Remove Group"
        message={deleteTarget ? `Remove group "${deleteTarget.name}"?` : ''}
        confirmLabel="Yes, Remove" cancelLabel="Keep It" loading={deleting}
        onConfirm={handleDelete} onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }} />
    </>
  )
}
