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
  ShiftAssignment,
  ShiftAssignmentForm,
  ShiftOption,
  PolicyOption,
  defaultForm,
} from './shift-assignments.types'
import { getErrorMessage } from "@/lib/apiError";

export default function ShiftAssignmentsPage() {
  useRequirePermission('HR.Employee.View');
  const { id: employeeId } = useParams<{ id: string }>()

  const initialized = useRef(false)
  const canManage = usePermission(Permissions.HR.ShiftAssignment.Manage);


  const [assignments,   setAssignments]   = useState<ShiftAssignment[]>([])
  const [shifts,        setShifts]        = useState<ShiftOption[]>([])
  const [policies,      setPolicies]      = useState<PolicyOption[]>([])
  const [loading,       setLoading]       = useState(true)

  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [editing,       setEditing]       = useState<ShiftAssignment | null>(null)
  const [form,          setForm]          = useState<ShiftAssignmentForm>(defaultForm())
  const [error,         setError]         = useState('')

  // Confirm delete state
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<ShiftAssignment | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const [aRes, sRes, pRes] = await Promise.all([
        api.get(`shift-assignments?employeeId=${employeeId}`),
        api.get("shift"),
        api.get("attendance-policies"),
      ]);
      setAssignments(aRes.data)
      setShifts(sRes.data)
      setPolicies(pRes.data)
    } catch (err) {
      showError(
          "Load Failed",
          getErrorMessage(err, "Could not load shift assignments."),
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

  // ── Form dialog ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(defaultForm())
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (a: ShiftAssignment) => {
    setEditing(a)
    setForm({
      shiftId:             a.shiftId,
      attendancePolicyId:  a.attendancePolicyId,
      effectiveFrom:       a.effectiveFrom,
      effectiveTo:         a.effectiveTo ?? '',
      isActive:            a.isActive,
    })
    setError('')
    setDialogOpen(true)
  }

  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const validate = (): boolean => {
    if (!form.shiftId)            { setError('Shift is required.'); return false }
    if (!form.attendancePolicyId) { setError('Attendance Policy is required.'); return false }
    if (!form.effectiveFrom)      { setError('Effective From is required.'); return false }
    if (form.effectiveTo && form.effectiveTo <= form.effectiveFrom) {
      setError('Effective To must be after Effective From.'); return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('shift-assignments/save', {
        action:              editing ? 'UPDATE' : 'ADD',
        id:                  editing?.id,
        employeeId,
        shiftId:             form.shiftId,
        attendancePolicyId:  form.attendancePolicyId,
        effectiveFrom:       form.effectiveFrom,
        effectiveTo:         form.effectiveTo || null,
        isActive:            form.isActive,
      })
      closeDialog()
      await load()
      showSuccess(
        editing ? 'Assignment Updated' : 'Assignment Added',
        editing ? 'Shift assignment has been updated.' : 'Shift assignment has been created.'
      )
    } catch (e: unknown) {
      showError(
        "Save Failed",
        getErrorMessage(e, "Could not save shift assignment."),
      );
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const promptDelete = (a: ShiftAssignment) => {
    setDeleteTarget(a)
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.post('shift-assignments/save', {
        action: 'DELETE',
        id:     deleteTarget.id,
      })
      setConfirmOpen(false)
      setDeleteTarget(null)
      await load()
      showSuccess('Assignment Removed', `${deleteTarget.shiftName} assignment has been removed.`)
    } catch (err){
      showError(
          "Delete Failed",
          getErrorMessage(err, "Could not remove shift assignment."),
        );
    } finally {
      setDeleting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Shift Assignments</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage shift and attendance policy assignments for this employee.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Assign Shift
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No shift assignments yet. Click <strong>Assign Shift</strong> to get
          started.
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Shift</th>
              <th>Attendance Policy</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="heading-text font-medium">
                    {a.shiftName}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {a.shiftCode}
                  </span>
                </td>
                <td>{a.attendancePolicyName}</td>
                <td>{fmt(a.effectiveFrom)}</td>
                <td>{fmt(a.effectiveTo)}</td>
                <td>
                  <span
                    className={`xp-badge ${a.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => promptDelete(a)}
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
            {editing ? "Edit Shift Assignment" : "Assign Shift"}
          </h5>

          <div className="space-y-4">
            <div>
              <label className="form-label">
                Shift <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.shiftId}
                onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
              >
                <option value="">Select shift…</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Attendance Policy <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={form.attendancePolicyId}
                onChange={(e) =>
                  setForm({ ...form, attendancePolicyId: e.target.value })
                }
              >
                <option value="">Select policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

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
                <span className="text-gray-400 text-xs ml-1">
                  (leave blank for open-ended)
                </span>
              </label>
              <Input
                type="date"
                value={form.effectiveTo}
                onChange={(e) =>
                  setForm({ ...form, effectiveTo: e.target.value })
                }
              />
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
                {editing ? "Update" : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Shift Assignment"
        message={
          deleteTarget
            ? `Are you sure you want to remove the "${deleteTarget.shiftName}" assignment? This action cannot be undone.`
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
