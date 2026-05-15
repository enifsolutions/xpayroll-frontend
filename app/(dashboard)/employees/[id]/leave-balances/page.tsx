'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlusIcon, Pencil, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { showSuccess, showError } from '@/lib/toast'
import api from '@/lib/axios'
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  EmployeeLeaveBalance, LeaveTypeOption, LeaveBalanceForm, defaultForm,
} from './leave-balances.types'

const CURRENT_YEAR = new Date().getFullYear()

// Visual bar showing used vs remaining
function BalanceBar({ used, entitled, carried }: { used: number; entitled: number; carried: number }) {
  const total = entitled + carried
  if (total === 0) return <span className="text-gray-400 text-xs">—</span>
  const usedPct = Math.min((used / total) * 100, 100)
  const color = usedPct > 90 ? 'bg-red-400' : usedPct > 70 ? 'bg-yellow-400' : 'bg-primary'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${usedPct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{usedPct.toFixed(0)}%</span>
    </div>
  )
}

export default function LeaveBalancesPage() {
  const { id: employeeId } = useParams<{ id: string }>()
  const initialized = useRef(false)
  const canManage = usePermission(Permissions.HR.Leave.Manage);


  const [balances,    setBalances]    = useState<EmployeeLeaveBalance[]>([])
  const [leaveTypes,  setLeaveTypes]  = useState<LeaveTypeOption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [yearFilter,  setYearFilter]  = useState<number>(CURRENT_YEAR)

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [editing,     setEditing]     = useState<EmployeeLeaveBalance | null>(null)
  const [form,        setForm]        = useState<LeaveBalanceForm>(defaultForm(CURRENT_YEAR))
  const [error,       setError]       = useState('')

  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeLeaveBalance | null>(null)

  // Computed remaining from form values
  const formRemaining =
    (parseFloat(form.entitled) || 0) +
    (parseFloat(form.carriedForward) || 0) -
    (parseFloat(form.used) || 0)

  const load = async (year = yearFilter) => {
    try {
      const [bRes, ltRes] = await Promise.all([
        api.get(`employee-leave-balances?employeeId=${employeeId}`),
        api.get("leave-types"),
      ]);
      setBalances(bRes.data)
      setLeaveTypes(ltRes.data)
    } catch {
      showError('Load Failed', 'Could not load leave balances.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load()
  }, [])

  const handleYearChange = (y: number) => {
    setYearFilter(y)
    setLoading(true)
    load(y)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm(yearFilter))
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (b: EmployeeLeaveBalance) => {
    setEditing(b)
    setForm({
      leaveTypeId:    b.leaveTypeId,
      year:           b.year.toString(),
      entitled:       b.entitled.toString(),
      carriedForward: b.carriedForward.toString(),
      used:           b.used.toString(),
    })
    setError('')
    setDialogOpen(true)
  }

  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const validate = (): boolean => {
    if (!form.leaveTypeId) { setError('Leave type is required.'); return false }
    if (!form.year || isNaN(parseInt(form.year))) { setError('Year is required.'); return false }
    if (parseFloat(form.entitled) < 0) { setError('Entitled days cannot be negative.'); return false }
    if (parseFloat(form.used) < 0) { setError('Used days cannot be negative.'); return false }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('employee-leave-balances/save', {
        action:        editing ? 'UPDATE' : 'ADD',
        id:            editing?.id,
        employeeId,
        leaveTypeId:   form.leaveTypeId,
        year:          parseInt(form.year),
        entitled:      parseFloat(form.entitled) || 0,
        carriedForward: parseFloat(form.carriedForward) || 0,
        used:          parseFloat(form.used) || 0,
      })
      closeDialog()
      await load()
      showSuccess(
        editing ? 'Balance Updated' : 'Balance Added',
        editing ? 'Leave balance has been updated.' : 'Leave balance has been added.'
      )
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showError('Save Failed', msg ?? 'Could not save leave balance.')
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (b: EmployeeLeaveBalance) => { setDeleteTarget(b); setConfirmOpen(true) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.post('employee-leave-balances/save', { action: 'DELETE', id: deleteTarget.id })
      setConfirmOpen(false); setDeleteTarget(null)
      await load()
      showSuccess('Balance Removed', `${deleteTarget.leaveTypeName} balance has been removed.`)
    } catch {
      showError('Delete Failed', 'Could not remove leave balance.')
    } finally {
      setDeleting(false)
    }
  }

  // Year selector: current year ± 2
  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Leave Balances</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage leave entitlements and balances by year.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year filter */}
          <select
            className="input"
            value={yearFilter}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {canManage && (
            <Button
              variant="solid"
              icon={<PlusIcon size={16} />}
              onClick={openAdd}
            >
              Add Balance
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : balances.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No leave balances for {yearFilter}. Click <strong>Add Balance</strong>{" "}
          to get started.
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Year</th>
              <th className="text-right">Entitled</th>
              <th className="text-right">Carried Fwd</th>
              <th className="text-right">Used</th>
              <th className="text-right">Remaining</th>
              <th>Usage</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="heading-text font-medium">
                    {b.leaveTypeName}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {b.leaveTypeCode}
                  </span>
                  <div className="flex gap-1 mt-0.5">
                    {b.isPaid && (
                      <span className="xp-badge xp-badge-success text-xs">
                        Paid
                      </span>
                    )}
                    {b.carryForward && (
                      <span className="xp-badge xp-badge-info text-xs">
                        Carry Fwd
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-gray-500">{b.year}</td>
                <td className="text-right font-medium">{b.entitled}</td>
                <td className="text-right text-gray-500">{b.carriedForward}</td>
                <td className="text-right text-gray-500">{b.used}</td>
                <td className="text-right font-medium">
                  <span
                    className={
                      b.remaining < 0
                        ? "text-red-500"
                        : b.remaining === 0
                          ? "text-gray-400"
                          : "text-primary"
                    }
                  >
                    {b.remaining}
                  </span>
                </td>
                <td>
                  <BalanceBar
                    used={b.used}
                    entitled={b.entitled}
                    carried={b.carriedForward}
                  />
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => promptDelete(b)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        onRequestClose={closeDialog}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-4">
            {editing ? "Edit Leave Balance" : "Add Leave Balance"}
          </h5>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.leaveTypeId}
                onChange={(e) =>
                  setForm({ ...form, leaveTypeId: e.target.value })
                }
                disabled={!!editing}
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                disabled={!!editing}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">Entitled</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.entitled}
                  onChange={(e) =>
                    setForm({ ...form, entitled: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Carried Fwd</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.carriedForward}
                  onChange={(e) =>
                    setForm({ ...form, carriedForward: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Used</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.used}
                  onChange={(e) => setForm({ ...form, used: e.target.value })}
                />
              </div>
            </div>

            {/* Computed remaining */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-500">
                Remaining (computed)
              </span>
              <span
                className={`font-semibold text-lg ${formRemaining < 0 ? "text-red-500" : "text-primary"}`}
              >
                {formRemaining.toFixed(1)} days
              </span>
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>
                {editing ? "Update" : "Add Balance"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Leave Balance"
        message={
          deleteTarget
            ? `Are you sure you want to remove the "${deleteTarget.leaveTypeName}" balance for ${deleteTarget.year}?`
            : ""
        }
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
