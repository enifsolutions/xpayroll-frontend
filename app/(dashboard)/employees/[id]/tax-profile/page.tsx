'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlusIcon, Pencil, Trash2, ShieldCheck } from 'lucide-react'
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
  EmployeeTaxProfile, EmployeeTaxExemption,
  TaxConfigOption, TaxProfileForm, ExemptionForm,
  RESIDENCY_STATUSES, defaultProfileForm, defaultExemptionForm,
} from './tax-profile.types'
import { getErrorMessage } from "@/lib/apiError";

const CURRENT_YEAR = new Date().getFullYear()
const fmt = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2 })

export default function TaxProfilePage() {
  useRequirePermission('HR.Employee.View');
  const { id: employeeId } = useParams<{ id: string }>()
  const initialized = useRef(false)
  const canManage = usePermission(Permissions.HR.Employee.Update);


  const [profiles,     setProfiles]     = useState<EmployeeTaxProfile[]>([])
  const [exemptions,   setExemptions]   = useState<EmployeeTaxExemption[]>([])
  const [taxConfigs,   setTaxConfigs]   = useState<TaxConfigOption[]>([])
  const [loading,      setLoading]      = useState(true)
  const [yearFilter,   setYearFilter]   = useState(CURRENT_YEAR)

  // Profile dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileSaving,     setProfileSaving]     = useState(false)
  const [editingProfile,    setEditingProfile]    = useState<EmployeeTaxProfile | null>(null)
  const [profileForm,       setProfileForm]       = useState<TaxProfileForm>(defaultProfileForm(CURRENT_YEAR))

  // Exemption dialog
  const [exemptionDialogOpen, setExemptionDialogOpen] = useState(false)
  const [exemptionSaving,     setExemptionSaving]     = useState(false)
  const [editingExemption,    setEditingExemption]    = useState<EmployeeTaxExemption | null>(null)
  const [exemptionForm,       setExemptionForm]       = useState<ExemptionForm>(defaultExemptionForm(CURRENT_YEAR))

  // Confirm delete
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; name: string; type: 'profile' | 'exemption' } | null>(null)

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

  const load = async (year = yearFilter) => {
    try {
      const [pRes, eRes, tcRes] = await Promise.all([
        api.get(`employee-tax-profiles?employeeId=${employeeId}&year=${year}`),
        api.get(
          `employee-tax-profiles/exemptions?employeeId=${employeeId}&year=${year}`,
        ),
        api.get("tax-configs"),
      ]);
      setProfiles(pRes.data)
      setExemptions(eRes.data)
      setTaxConfigs(tcRes.data)
    } catch (err){
      showError(
              "Load Failed",
              getErrorMessage(err, "Could not load tax profile."),
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

  const handleYearChange = (y: number) => {
    setYearFilter(y); setLoading(true); load(y)
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  const openAddProfile = () => {
    setEditingProfile(null)
    setProfileForm(defaultProfileForm(yearFilter))
    setProfileDialogOpen(true)
  }

  const openEditProfile = (p: EmployeeTaxProfile) => {
    setEditingProfile(p)
    setProfileForm({
      taxConfigId:             p.taxConfigId,
      residencyStatus:         p.residencyStatus,
      cumulativeTaxPaid:       p.cumulativeTaxPaid.toString(),
      cumulativeTaxableIncome: p.cumulativeTaxableIncome.toString(),
      year:                    p.year.toString(),
    })
    setProfileDialogOpen(true)
  }

  const handleProfileSave = async () => {
    if (!profileForm.taxConfigId) { showError('Validation', 'Tax config is required.'); return }
    setProfileSaving(true)
    try {
      await api.post('employee-tax-profiles/save', {
        action:                  editingProfile ? 'UPDATE' : 'ADD',
        id:                      editingProfile?.id,
        employeeId,
        taxConfigId:             profileForm.taxConfigId,
        residencyStatus:         profileForm.residencyStatus,
        cumulativeTaxPaid:       parseFloat(profileForm.cumulativeTaxPaid) || 0,
        cumulativeTaxableIncome: parseFloat(profileForm.cumulativeTaxableIncome) || 0,
        year:                    parseInt(profileForm.year),
      })
      setProfileDialogOpen(false)
      await load()
      showSuccess(editingProfile ? 'Profile Updated' : 'Profile Added', 'Tax profile saved.')
    } catch (e: unknown) {
      showError(
        "Save Failed",
        getErrorMessage(e, "Could not save tax profile."),
      );
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Exemptions ─────────────────────────────────────────────────────────────
  const openAddExemption = () => {
    setEditingExemption(null)
    setExemptionForm(defaultExemptionForm(yearFilter))
    setExemptionDialogOpen(true)
  }

  const openEditExemption = (e: EmployeeTaxExemption) => {
    setEditingExemption(e)
    setExemptionForm({
      exemptionType: e.exemptionType,
      description:   e.description ?? '',
      annualAmount:  e.annualAmount.toString(),
      year:          e.year.toString(),
      isApproved:    e.isApproved,
    })
    setExemptionDialogOpen(true)
  }

  const handleExemptionSave = async () => {
    if (!exemptionForm.exemptionType) { showError('Validation', 'Exemption type is required.'); return }
    if (!exemptionForm.annualAmount)  { showError('Validation', 'Annual amount is required.'); return }
    setExemptionSaving(true)
    try {
      await api.post('employee-tax-profiles/exemptions/save', {
        action:        editingExemption ? 'UPDATE' : 'ADD',
        id:            editingExemption?.id,
        employeeId,
        exemptionType: exemptionForm.exemptionType,
        description:   exemptionForm.description || null,
        annualAmount:  parseFloat(exemptionForm.annualAmount),
        year:          parseInt(exemptionForm.year),
        isApproved:    exemptionForm.isApproved,
      })
      setExemptionDialogOpen(false)
      await load()
      showSuccess(editingExemption ? 'Exemption Updated' : 'Exemption Added', 'Tax exemption saved.')
    } catch (e: unknown) {
      showError("Save Failed", getErrorMessage(e, "Could not save exemption."));
    } finally {
      setExemptionSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const promptDelete = (id: string, name: string, type: 'profile' | 'exemption') => {
    setDeleteTarget({ id, name, type }); setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const endpoint = deleteTarget.type === 'profile'
        ? 'employee-tax-profiles/save'
        : 'employee-tax-profiles/exemptions/save'
      await api.post(endpoint, { action: 'DELETE', id: deleteTarget.id })
      setConfirmOpen(false); setDeleteTarget(null)
      await load()
      showSuccess('Removed', `${deleteTarget.name} has been removed.`)
    } catch (err){
      showError(
          "Delete Failed",
          getErrorMessage(err, "Could not remove record."),
        );
    } finally {
      setDeleting(false)
    }
  }

  const profile = profiles[0] ?? null
  const totalExemptions = exemptions.reduce((s, e) => s + e.annualAmount, 0)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Tax Profile</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Tax configuration and exemptions for this employee.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Tax Profile Section ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h6 className="font-semibold text-gray-700 dark:text-gray-300">
                Tax Configuration
              </h6>
              {!profile && canManage && (
                <Button
                  variant="solid"
                  icon={<PlusIcon size={15} />}
                  onClick={openAddProfile}
                >
                  Set Tax Profile
                </Button>
              )}
            </div>

            {profile ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold heading-text">
                      {profile.taxConfigName}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {profile.regime} · Tax Year {profile.taxYear}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEditProfile(profile)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() =>
                          promptDelete(
                            profile.id,
                            profile.taxConfigName,
                            "profile",
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Residency Status
                    </p>
                    <p className="font-semibold heading-text">
                      {profile.residencyStatus}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Cumulative Tax Paid
                    </p>
                    <p className="font-semibold heading-text">
                      LKR {fmt(profile.cumulativeTaxPaid)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Cumulative Taxable Income
                    </p>
                    <p className="font-semibold heading-text">
                      LKR {fmt(profile.cumulativeTaxableIncome)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No tax profile for {yearFilter}. Click{" "}
                <strong>Set Tax Profile</strong> to configure.
              </div>
            )}
          </div>

          {/* ── Exemptions Section ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h6 className="font-semibold text-gray-700 dark:text-gray-300">
                  Tax Exemptions
                </h6>
                {exemptions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total: LKR {fmt(totalExemptions)} / year
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="solid"
                  icon={<PlusIcon size={15} />}
                  onClick={openAddExemption}
                >
                  Add Exemption
                </Button>
              )}
            </div>

            {exemptions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No exemptions for {yearFilter}.
              </div>
            ) : (
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Exemption Type</th>
                    <th>Description</th>
                    <th className="text-right">Annual Amount</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exemptions.map((ex) => (
                    <tr key={ex.id}>
                      <td>
                        <span className="heading-text font-medium">
                          {ex.exemptionType}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {ex.description ?? "—"}
                      </td>
                      <td className="text-right font-medium">
                        LKR {fmt(ex.annualAmount)}
                      </td>
                      <td>
                        {ex.isApproved ? (
                          <span className="xp-badge xp-badge-success flex items-center gap-1 w-fit">
                            <ShieldCheck size={12} /> Approved
                          </span>
                        ) : (
                          <span className="xp-badge xp-badge-warning">
                            Pending
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => openEditExemption(ex)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() =>
                                promptDelete(
                                  ex.id,
                                  ex.exemptionType,
                                  "exemption",
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
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
          </div>
        </div>
      )}

      {/* Tax Profile Dialog */}
      <Dialog
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        onRequestClose={() => setProfileDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-4">
            {editingProfile ? "Edit Tax Profile" : "Set Tax Profile"}
          </h5>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Tax Configuration <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={profileForm.taxConfigId}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    taxConfigId: e.target.value,
                  })
                }
                disabled={!!editingProfile}
              >
                <option value="">Select tax config…</option>
                {taxConfigs.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name} · {tc.regime} ({tc.taxYear})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Residency Status</label>
              <select
                className="input w-full"
                value={profileForm.residencyStatus}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    residencyStatus: e.target.value,
                  })
                }
              >
                {RESIDENCY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={profileForm.year}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, year: e.target.value })
                  }
                  disabled={!!editingProfile}
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => CURRENT_YEAR - 2 + i,
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Cumulative Tax Paid</label>
                <Input
                  type="number"
                  step="0.01"
                  value={profileForm.cumulativeTaxPaid}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      cumulativeTaxPaid: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Cumulative Taxable Income</label>
                <Input
                  type="number"
                  step="0.01"
                  value={profileForm.cumulativeTaxableIncome}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      cumulativeTaxableIncome: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="plain"
                onClick={() => setProfileDialogOpen(false)}
                disabled={profileSaving}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={profileSaving}
                onClick={handleProfileSave}
              >
                {editingProfile ? "Update" : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Exemption Dialog */}
      <Dialog
        isOpen={exemptionDialogOpen}
        onClose={() => setExemptionDialogOpen(false)}
        onRequestClose={() => setExemptionDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-4">
            {editingExemption ? "Edit Exemption" : "Add Exemption"}
          </h5>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Exemption Type <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Medical, EPF, Housing Loan"
                value={exemptionForm.exemptionType}
                onChange={(e) =>
                  setExemptionForm({
                    ...exemptionForm,
                    exemptionType: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="form-label">Description</label>
              <Input
                placeholder="Optional description"
                value={exemptionForm.description}
                onChange={(e) =>
                  setExemptionForm({
                    ...exemptionForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Annual Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={exemptionForm.annualAmount}
                  onChange={(e) =>
                    setExemptionForm({
                      ...exemptionForm,
                      annualAmount: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Year</label>
                <select
                  className="input w-full"
                  value={exemptionForm.year}
                  onChange={(e) =>
                    setExemptionForm({ ...exemptionForm, year: e.target.value })
                  }
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => CURRENT_YEAR - 2 + i,
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="form-label mb-0">Approved</label>
              <Switcher
                checked={exemptionForm.isApproved}
                onChange={(val: boolean) =>
                  setExemptionForm({ ...exemptionForm, isApproved: val })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="plain"
                onClick={() => setExemptionDialogOpen(false)}
                disabled={exemptionSaving}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={exemptionSaving}
                onClick={handleExemptionSave}
              >
                {editingExemption ? "Update" : "Add Exemption"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Record"
        message={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.name}"?`
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
