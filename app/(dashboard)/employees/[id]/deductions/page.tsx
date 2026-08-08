'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission';
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
  EmployeeDeduction, DeductionTypeOption, DeductionForm, defaultForm,
} from './deductions.types'
import { getErrorMessage } from "@/lib/apiError";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtAmount = (n: number) =>
  n.toLocaleString('en-LK', { minimumFractionDigits: 2 })

const TYPE_BADGE: Record<string, string> = {
  Statutory: 'xp-badge-danger',
  Voluntary: 'xp-badge-info',
  Loan:      'xp-badge-warning',
  Other:     'xp-badge-neutral',
}

export default function DeductionsPage() {
  useRequirePermission('HR.Employee.View');
  const { id: employeeId } = useParams<{ id: string }>()
  const initialized = useRef(false)
  const canManage = usePermission(Permissions.HR.Employee.Update);


  const [deductions,      setDeductions]      = useState<EmployeeDeduction[]>([])
  const [deductionTypes,  setDeductionTypes]  = useState<DeductionTypeOption[]>([])
  const [loading,         setLoading]         = useState(true)

  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [editing,       setEditing]       = useState<EmployeeDeduction | null>(null)
  const [form,          setForm]          = useState<DeductionForm>(defaultForm())
  const [error,         setError]         = useState('')

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<EmployeeDeduction | null>(null)

  const selectedType = deductionTypes.find(d => d.id === form.deductionDefinitionId)

  const load = async () => {
    try {
      const [dRes, dtRes] = await Promise.all([
        api.get(`employee-deductions?employeeId=${employeeId}`),
        api.get("deduction-types"),
      ]);
      setDeductions(dRes.data)
      setDeductionTypes(dtRes.data)
    } catch (err){
      showError(
        "Load Failed",
        getErrorMessage(err, "Could not load deductions."),
      );
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
    setEditing(null); setForm(defaultForm()); setError(''); setDialogOpen(true)
  }

  const openEdit = (d: EmployeeDeduction) => {
    setEditing(d)
    setForm({
      deductionDefinitionId: d.deductionDefinitionId,
      overrideAmount:        d.overrideAmount?.toString() ?? '',
      overridePercentage:    d.overridePercentage?.toString() ?? '',
      effectiveFrom:         d.effectiveFrom,
      effectiveTo:           d.effectiveTo ?? '',
      isActive:              d.isActive,
    })
    setError('')
    setDialogOpen(true)
  }

  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const validate = (): boolean => {
    if (!form.deductionDefinitionId) { setError('Deduction type is required.'); return false }
    if (!form.effectiveFrom)         { setError('Effective From is required.'); return false }
    if (form.effectiveTo && form.effectiveTo <= form.effectiveFrom) {
      setError('Effective To must be after Effective From.'); return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('employee-deductions/save', {
        action:               editing ? 'UPDATE' : 'ADD',
        id:                   editing?.id,
        employeeId,
        deductionDefinitionId: form.deductionDefinitionId,
        overrideAmount:       form.overrideAmount      ? parseFloat(form.overrideAmount)      : null,
        overridePercentage:   form.overridePercentage  ? parseFloat(form.overridePercentage)  : null,
        effectiveFrom:        form.effectiveFrom,
        effectiveTo:          form.effectiveTo || null,
        isActive:             form.isActive,
      })
      closeDialog()
      await load()
      showSuccess(
        editing ? 'Deduction Updated' : 'Deduction Added',
        editing ? 'Employee deduction has been updated.' : 'Employee deduction has been added.'
      )
    } catch (e: unknown) {
      showError("Save Failed", getErrorMessage(e, "Could not save deduction."));
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (d: EmployeeDeduction) => { setDeleteTarget(d); setConfirmOpen(true) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.post('employee-deductions/save', { action: 'DELETE', id: deleteTarget.id })
      setConfirmOpen(false); setDeleteTarget(null)
      await load()
      showSuccess('Deduction Removed', `${deleteTarget.deductionName} has been removed.`)
    } catch (err){
      showError(
        "Delete Failed",
        getErrorMessage(err, "Could not remove deduction."),
      );
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Deductions</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage deduction assignments for this employee.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Add Deduction
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : deductions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No deductions assigned. Click <strong>Add Deduction</strong> to get
          started.
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Deduction</th>
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
            {deductions.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className="heading-text font-medium">
                    {d.deductionName}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {d.deductionCode}
                  </span>
                  {(d.overrideAmount != null ||
                    d.overridePercentage != null) && (
                    <span className="ml-2 xp-badge xp-badge-info text-xs">
                      Override
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`xp-badge ${TYPE_BADGE[d.deductionType] ?? "xp-badge-neutral"}`}
                  >
                    {d.deductionType}
                  </span>
                  {d.isStatutory && (
                    <span className="ml-1 xp-badge xp-badge-warning text-xs">
                      Statutory
                    </span>
                  )}
                </td>
                <td className="text-gray-500 text-sm">{d.calculationType}</td>
                <td className="text-right font-medium heading-text">
                  {d.calculationType === "FixedAmount"
                    ? `LKR ${fmtAmount(d.effectiveAmount)}`
                    : `${d.effectivePercentage}%`}
                </td>
                <td>{fmt(d.effectiveFrom)}</td>
                <td>{fmt(d.effectiveTo)}</td>
                <td>
                  <span
                    className={`xp-badge ${d.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                  >
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => promptDelete(d)}
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
            {editing ? "Edit Deduction" : "Add Deduction"}
          </h5>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Deduction Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.deductionDefinitionId}
                onChange={(e) =>
                  setForm({ ...form, deductionDefinitionId: e.target.value })
                }
                disabled={!!editing}
              >
                <option value="">Select deduction type…</option>
                {deductionTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name} ({dt.code}){dt.isStatutory ? " — Statutory" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Defaults reference card */}
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
                {selectedType.isStatutory && (
                  <div className="flex justify-between">
                    <span>Statutory</span>
                    <span className="xp-badge xp-badge-warning text-xs">
                      Yes
                    </span>
                  </div>
                )}
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
                  Effective To{" "}
                  <span className="text-gray-400 text-xs">(optional)</span>
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
                {editing ? "Update" : "Add Deduction"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Deduction"
        message={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.deductionName}"? This action cannot be undone.`
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
