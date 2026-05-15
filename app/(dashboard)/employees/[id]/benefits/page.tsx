'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlusIcon, Pencil, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { showSuccess, showError } from '@/lib/toast'
import api from '@/lib/axios'
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  EmployeeBenefit, BenefitTypeOption, BenefitForm, defaultForm,
} from './benefits.types'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtAmount = (n: number) =>
  n.toLocaleString('en-LK', { minimumFractionDigits: 2 })

export default function BenefitsPage() {
  const { id: employeeId } = useParams<{ id: string }>()
  const initialized = useRef(false)

  const [benefits,      setBenefits]      = useState<EmployeeBenefit[]>([])
  const [benefitTypes,  setBenefitTypes]  = useState<BenefitTypeOption[]>([])
  const [loading,       setLoading]       = useState(true)

  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [editing,       setEditing]       = useState<EmployeeBenefit | null>(null)
  const [form,          setForm]          = useState<BenefitForm>(defaultForm())
  const [error,         setError]         = useState('')

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<EmployeeBenefit | null>(null)

  // Selected benefit type details (for showing defaults in form)
  const canManage = usePermission(Permissions.HR.Employee.Update);
  const selectedType = benefitTypes.find(b => b.id === form.benefitDefinitionId)

  const load = async () => {
    try {
      const [bRes, btRes] = await Promise.all([
        api.get(`employee-benefits?employeeId=${employeeId}`),
        api.get("benefit-types"),
      ]);
      setBenefits(bRes.data)
      setBenefitTypes(btRes.data)
    } catch {
      showError('Load Failed', 'Could not load benefits.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm())
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (b: EmployeeBenefit) => {
    setEditing(b)
    setForm({
      benefitDefinitionId: b.benefitDefinitionId,
      overrideAmount:      b.overrideAmount?.toString() ?? '',
      overridePercentage:  b.overridePercentage?.toString() ?? '',
      effectiveFrom:       b.effectiveFrom,
      effectiveTo:         b.effectiveTo ?? '',
      isActive:            b.isActive,
    })
    setError('')
    setDialogOpen(true)
  }

  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const validate = (): boolean => {
    if (!form.benefitDefinitionId) { setError('Benefit type is required.'); return false }
    if (!form.effectiveFrom)       { setError('Effective From is required.'); return false }
    if (form.effectiveTo && form.effectiveTo <= form.effectiveFrom) {
      setError('Effective To must be after Effective From.'); return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('employee-benefits/save', {
        action:              editing ? 'UPDATE' : 'ADD',
        id:                  editing?.id,
        employeeId,
        benefitDefinitionId: form.benefitDefinitionId,
        overrideAmount:      form.overrideAmount      ? parseFloat(form.overrideAmount)      : null,
        overridePercentage:  form.overridePercentage  ? parseFloat(form.overridePercentage)  : null,
        effectiveFrom:       form.effectiveFrom,
        effectiveTo:         form.effectiveTo || null,
        isActive:            form.isActive,
      })
      closeDialog()
      await load()
      showSuccess(
        editing ? 'Benefit Updated' : 'Benefit Added',
        editing ? 'Employee benefit has been updated.' : 'Employee benefit has been added.'
      )
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.error
      showError('Save Failed', msg ?? 'Could not save benefit.')
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (b: EmployeeBenefit) => { setDeleteTarget(b); setConfirmOpen(true) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.post('employee-benefits/save', { action: 'DELETE', id: deleteTarget.id })
      setConfirmOpen(false)
      setDeleteTarget(null)
      await load()
      showSuccess('Benefit Removed', `${deleteTarget.benefitName} has been removed.`)
    } catch {
      showError('Delete Failed', 'Could not remove benefit.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Benefits</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage benefit assignments for this employee.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Add Benefit
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : benefits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No benefits assigned. Click <strong>Add Benefit</strong> to get
          started.
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Benefit</th>
              <th>Type</th>
              <th>Calculation</th>
              <th className="text-right">Effective Amount</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {benefits.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="heading-text font-medium">
                    {b.benefitName}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {b.benefitCode}
                  </span>
                  {b.overrideAmount != null || b.overridePercentage != null ? (
                    <span className="ml-2 xp-badge xp-badge-info text-xs">
                      Override
                    </span>
                  ) : null}
                </td>
                <td>
                  <span className="xp-badge xp-badge-neutral">
                    {b.benefitType}
                  </span>
                </td>
                <td className="text-gray-500 text-sm">{b.calculationType}</td>
                <td className="text-right font-medium heading-text">
                  {b.calculationType === "FixedAmount"
                    ? `LKR ${fmtAmount(b.effectiveAmount)}`
                    : `${b.effectivePercentage}%`}
                </td>
                <td>{fmt(b.effectiveFrom)}</td>
                <td>{fmt(b.effectiveTo)}</td>
                <td>
                  <span
                    className={`xp-badge ${b.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                  >
                    {b.isActive ? "Active" : "Inactive"}
                  </span>
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
            {editing ? "Edit Benefit" : "Add Benefit"}
          </h5>

          <div className="space-y-4">
            {/* Benefit type */}
            <div>
              <label className="form-label">
                Benefit Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.benefitDefinitionId}
                onChange={(e) =>
                  setForm({ ...form, benefitDefinitionId: e.target.value })
                }
                disabled={!!editing}
              >
                <option value="">Select benefit type…</option>
                {benefitTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name} ({bt.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Show defaults from selected type */}
            {selectedType && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Default</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedType.calculationType === "FixedAmount"
                      ? `LKR ${fmtAmount(selectedType.defaultAmount)}`
                      : `${selectedType.defaultPercentage}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Calculation</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedType.calculationType}
                  </span>
                </div>
              </div>
            )}

            {/* Override fields */}
            {selectedType?.calculationType === "FixedAmount" && (
              <div>
                <label className="form-label">
                  Override Amount
                  <span className="text-gray-400 text-xs ml-1">
                    (leave blank to use default)
                  </span>
                </label>
                <Input
                  type="number"
                  placeholder={selectedType.defaultAmount.toString()}
                  value={form.overrideAmount}
                  onChange={(e) =>
                    setForm({ ...form, overrideAmount: e.target.value })
                  }
                />
              </div>
            )}

            {selectedType && selectedType.calculationType !== "FixedAmount" && (
              <div>
                <label className="form-label">
                  Override Percentage
                  <span className="text-gray-400 text-xs ml-1">
                    (leave blank to use default)
                  </span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={selectedType.defaultPercentage.toString()}
                  value={form.overridePercentage}
                  onChange={(e) =>
                    setForm({ ...form, overridePercentage: e.target.value })
                  }
                />
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Effective From <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm({ ...form, effectiveFrom: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">
                  Effective To
                  <span className="text-gray-400 text-xs ml-1">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    setForm({ ...form, effectiveTo: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Active toggle — edit only */}
            {editing && (
              <div className="flex items-center justify-between">
                <label className="form-label mb-0">Active</label>
                <Switcher
                  checked={form.isActive}
                  onChange={(val: boolean) =>
                    setForm({ ...form, isActive: val })
                  }
                />
              </div>
            )}

            {error && <p className="text-error text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>
                {editing ? "Update" : "Add Benefit"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Benefit"
        message={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.benefitName}"? This action cannot be undone.`
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
