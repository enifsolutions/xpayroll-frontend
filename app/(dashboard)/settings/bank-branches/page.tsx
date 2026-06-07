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

interface BankBranch {
  id: string; bankName: string; branchName: string;
  branchCode?: string | null; city?: string | null;
  swiftCode?: string | null; isActive: boolean;
}
interface BankBranchForm {
  bankName: string; branchName: string; branchCode: string;
  city: string; swiftCode: string; isActive: boolean;
}
const EMPTY: BankBranchForm = { bankName: '', branchName: '', branchCode: '', city: '', swiftCode: '', isActive: true };

export default function BankBranchesPage() {
  useRequirePermission(Permissions.Settings.BankBranches.View)
  const canManage = usePermission(Permissions.Settings.BankBranches.Manage)
  const initialized = useRef(false)

  const [items,        setItems]        = useState<BankBranch[]>([])
  const [loading,      setLoading]      = useState(true)
  const [bankFilter,   setBankFilter]   = useState('')
  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [editing,      setEditing]      = useState<BankBranch | null>(null)
  const [form,         setForm]         = useState<BankBranchForm>(EMPTY)
  const [error,        setError]        = useState('')
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BankBranch | null>(null)

  const load = async () => {
    try {
      const res = await api.get<BankBranch[]>('bank-branches')
      setItems(res.data)
    } catch { showError('Load Failed', 'Could not load bank branches.') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (initialized.current) return; initialized.current = true; load() }, [])

  const f = (field: keyof BankBranchForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  const openAdd = () => { setEditing(null); setForm(EMPTY); setError(''); setDialogOpen(true) }
  const openEdit = (item: BankBranch) => {
    setEditing(item)
    setForm({ bankName: item.bankName, branchName: item.branchName,
      branchCode: item.branchCode ?? '', city: item.city ?? '',
      swiftCode: item.swiftCode ?? '', isActive: item.isActive })
    setError(''); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.bankName.trim())   { setError('Bank name is required.'); return }
    if (!form.branchName.trim()) { setError('Branch name is required.'); return }
    setSaving(true)
    try {
      await api.post('bank-branches/save', {
        action: editing ? 'UPDATE' : 'ADD',
        id: editing?.id ?? null,
        bankName: form.bankName.trim(), branchName: form.branchName.trim(),
        branchCode: form.branchCode.trim() || null,
        city: form.city.trim() || null,
        swiftCode: form.swiftCode.trim() || null,
        isActive: form.isActive, userId: 1,
      })
      setDialogOpen(false); await load()
      showSuccess(editing ? 'Branch Updated' : 'Branch Added', `${form.bankName} — ${form.branchName}`)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to save branch.') }
    finally { setSaving(false) }
  }

  const promptDelete = (item: BankBranch) => { setDeleteTarget(item); setConfirmOpen(true) }
  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true)
    try {
      await api.post('bank-branches/save', { action: 'DELETE', id: deleteTarget.id, userId: 1 })
      setConfirmOpen(false); setDeleteTarget(null); await load()
      showSuccess('Branch Removed', deleteTarget.branchName)
    } catch { showError('Delete Failed', 'Could not remove branch.') }
    finally { setDeleting(false) }
  }

  const bankNames = [...new Set(items.map(i => i.bankName))].sort()
  const filtered = bankFilter ? items.filter(i => i.bankName === bankFilter) : items

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h3 className="h3">Bank Branches</h3><p className="text-gray-500 mt-1">Manage bank branch master data.</p></div>
        <div className="flex items-center gap-3">
          <select className="input" value={bankFilter} onChange={e => setBankFilter(e.target.value)}>
            <option value="">All Banks</option>
            {bankNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {canManage && <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>Add Branch</Button>}
        </div>
      </div>
      <div className="card"><div className="card-body">
        {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div> : (
          <table className="table-default table-hover w-full">
            <thead><tr><th>Bank Name</th><th>Branch Name</th><th>Branch Code</th><th>City</th><th>SWIFT</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">No branches found</td></tr>
                : filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-medium heading-text">{item.bankName}</td>
                  <td>{item.branchName}</td>
                  <td><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.branchCode ?? '—'}</code></td>
                  <td className="text-gray-500">{item.city ?? '—'}</td>
                  <td className="text-gray-500">{item.swiftCode ?? '—'}</td>
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
          <h5 className="h5 mb-5">{editing ? 'Edit Branch' : 'Add Branch'}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Bank Name <span className="text-red-500">*</span></label><Input value={form.bankName} onChange={f('bankName')} placeholder="Commercial Bank" /></div>
              <div><label className="form-label">Branch Name <span className="text-red-500">*</span></label><Input value={form.branchName} onChange={f('branchName')} placeholder="Colombo 03" /></div>
              <div><label className="form-label">Branch Code</label><Input value={form.branchCode} onChange={f('branchCode')} placeholder="001" /></div>
              <div><label className="form-label">City</label><Input value={form.city} onChange={f('city')} placeholder="Colombo" /></div>
              <div className="col-span-2"><label className="form-label">SWIFT Code</label><Input value={form.swiftCode} onChange={f('swiftCode')} placeholder="CCEYLKLX" /></div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="branch_active" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary" />
              <label htmlFor="branch_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={confirmOpen} variant="danger" title="Remove Branch"
        message={deleteTarget ? `Remove "${deleteTarget.branchName}"?` : ''}
        confirmLabel="Yes, Remove" cancelLabel="Keep It" loading={deleting}
        onConfirm={handleDelete} onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }} />
    </>
  )
}
