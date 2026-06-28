'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useEffect, useRef, useState, useMemo } from 'react'
import { PlusIcon, Pencil, Trash2, Building2, CheckCircle2, XCircle, Landmark } from 'lucide-react'
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
const EMPTY: BankBranchForm = { bankName: '', branchName: '', branchCode: '', city: '', swiftCode: '', isActive: true }
const PAGE_SIZE = 10

// ── Avatar colour helper ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500',
  'bg-rose-500','bg-cyan-500','bg-fuchsia-500','bg-teal-500',
]
function bankColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function bankInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4 py-4">
        <div className={`${color} rounded-xl p-3 flex-shrink-0 text-white`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-2xl font-bold heading-text">{value}</p>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function BankBranchesPage() {
  useRequirePermission(Permissions.MasterData.BankBranches.View)
  const canManage = usePermission(Permissions.MasterData.BankBranches.Manage)
  const initialized = useRef(false)

  const [items,        setItems]        = useState<BankBranch[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [bankFilter,   setBankFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page,         setPage]         = useState(1)
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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = items.length
    const active  = items.filter(i => i.isActive).length
    const inactive = total - active
    const banks   = new Set(items.map(i => i.bankName)).size
    return { total, active, inactive, banks }
  }, [items])

  // ── Filtering & pagination ─────────────────────────────────────────────────
  const bankNames = useMemo(() => [...new Set(items.map(i => i.bankName))].sort(), [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i => {
      if (bankFilter && i.bankName !== bankFilter) return false
      if (statusFilter === 'active'   && !i.isActive) return false
      if (statusFilter === 'inactive' && i.isActive)  return false
      if (q && !i.bankName.toLowerCase().includes(q) &&
               !i.branchName.toLowerCase().includes(q) &&
               !(i.branchCode ?? '').toLowerCase().includes(q) &&
               !(i.city ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, bankFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)
  const onSearch  = (v: string) => { setSearch(v);       resetPage() }
  const onBank    = (v: string) => { setBankFilter(v);   resetPage() }
  const onStatus  = (v: string) => { setStatusFilter(v); resetPage() }

  // ── Pagination buttons ─────────────────────────────────────────────────────
  const pageButtons = useMemo(() => {
    const btns: (number | '…')[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) btns.push(i) }
    else {
      btns.push(1)
      if (page > 3) btns.push('…')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) btns.push(i)
      if (page < totalPages - 2) btns.push('…')
      btns.push(totalPages)
    }
    return btns
  }, [page, totalPages])

  // ── Form helpers ───────────────────────────────────────────────────────────
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

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Bank Branches</h3>
          <p className="text-gray-500 mt-1">Manage bank branch master data for payroll processing.</p>
        </div>
        {canManage && (
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Branch
          </Button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Branches" value={stats.total}
          sub={`across ${stats.banks} bank${stats.banks !== 1 ? 's' : ''}`}
          icon={<Landmark size={20} />} color="bg-blue-500" />
        <StatCard label="Active Branches" value={stats.active}
          sub={stats.total ? `${Math.round(stats.active / stats.total * 100)}% of total` : '—'}
          icon={<CheckCircle2 size={20} />} color="bg-emerald-500" />
        <StatCard label="Inactive Branches" value={stats.inactive}
          sub="not in use"
          icon={<XCircle size={20} />} color="bg-rose-500" />
        <StatCard label="Registered Banks" value={stats.banks}
          sub="unique institutions"
          icon={<Building2 size={20} />} color="bg-violet-500" />
      </div>

      {/* ── Table Card ── */}
      <div className="card">
        <div className="card-body">

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                className="input pl-9 w-full"
                placeholder="Search bank, branch, code, city…"
                value={search}
                onChange={e => onSearch(e.target.value)}
              />
            </div>
            <select className="input w-44" value={bankFilter} onChange={e => onBank(e.target.value)}>
              <option value="">All Banks</option>
              {bankNames.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="input w-36" value={statusFilter} onChange={e => onStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="text-sm text-gray-400 whitespace-nowrap ml-auto">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th>Branch Name</th>
                    <th>Branch Code</th>
                    <th>City</th>
                    <th>SWIFT Code</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        No branches found
                      </td>
                    </tr>
                  ) : pageData.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`${bankColor(item.bankName)} w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {bankInitials(item.bankName)}
                          </div>
                          <span className="font-medium heading-text">{item.bankName}</span>
                        </div>
                      </td>
                      <td>{item.branchName}</td>
                      <td>
                        {item.branchCode
                          ? <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.branchCode}</code>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="text-gray-500">{item.city ?? '—'}</td>
                      <td>
                        {item.swiftCode
                          ? <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">{item.swiftCode}</code>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td>
                        <span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-neutral'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <button onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-500 hover:text-violet-600 transition-colors"
                              title="Edit">
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button onClick={() => promptDelete(item)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                              title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      ←
                    </button>
                    {pageButtons.map((btn, i) =>
                      btn === '…'
                        ? <span key={`e${i}`} className="px-1.5 text-gray-400">…</span>
                        : <button key={btn} onClick={() => setPage(btn as number)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              page === btn
                                ? 'bg-primary text-white border-primary'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}>
                            {btn}
                          </button>
                    )}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)}>
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? 'Edit Branch' : 'Add Branch'}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Bank Name <span className="text-red-500">*</span></label>
                <Input value={form.bankName} onChange={f('bankName')} placeholder="Commercial Bank" />
              </div>
              <div>
                <label className="form-label">Branch Name <span className="text-red-500">*</span></label>
                <Input value={form.branchName} onChange={f('branchName')} placeholder="Colombo 03" />
              </div>
              <div>
                <label className="form-label">Branch Code</label>
                <Input value={form.branchCode} onChange={f('branchCode')} placeholder="001" />
              </div>
              <div>
                <label className="form-label">City</label>
                <Input value={form.city} onChange={f('city')} placeholder="Colombo" />
              </div>
              <div className="col-span-2">
                <label className="form-label">SWIFT Code</label>
                <Input value={form.swiftCode} onChange={f('swiftCode')} placeholder="CCEYLKLX" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="branch_active" checked={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary" />
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

      {/* ── Confirm Delete ── */}
      <ConfirmDialog open={confirmOpen} variant="danger" title="Remove Branch"
        message={deleteTarget ? `Remove "${deleteTarget.branchName}" from ${deleteTarget.bankName}?` : ''}
        confirmLabel="Yes, Remove" cancelLabel="Keep It" loading={deleting}
        onConfirm={handleDelete} onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }} />
    </>
  )
}
