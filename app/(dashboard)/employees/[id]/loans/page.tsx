'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { PlusIcon, Pencil, Trash2, TrendingDown } from 'lucide-react'
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
  LoanRecord, ExternalLiability, DsrData,
  LoanForm, LiabilityForm,
  LOAN_STATUSES, LIABILITY_TYPES,
  defaultLoanForm, defaultLiabilityForm,
} from './loans.types'

const DSR_THRESHOLD = 40  // block new loans above this %

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtMoney = (n: number) =>
  `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

const LOAN_STATUS_BADGE: Record<string, string> = {
  Active: 'xp-badge-success', Completed: 'xp-badge-info', Cancelled: 'xp-badge-neutral',
}
const LIABILITY_TYPE_BADGE: Record<string, string> = {
  BankLoan: 'xp-badge-danger', Leasing: 'xp-badge-warning', CreditCard: 'xp-badge-info',
  Mortgage: 'xp-badge-danger', PersonalLoan: 'xp-badge-warning', Other: 'xp-badge-neutral',
}

// ── DSR Gauge ─────────────────────────────────────────────────────────────────
function DsrGauge({ dsr }: { dsr: DsrData }) {
  const pct   = Math.min(dsr.dsrPercentage, 100)
  const color = dsr.dsrStatus === 'Critical' ? '#ef4444'
              : dsr.dsrStatus === 'Warning'  ? '#f59e0b'
              : '#10b981'
  const statusClass = dsr.dsrStatus === 'Critical' ? 'text-red-500'
                    : dsr.dsrStatus === 'Warning'  ? 'text-yellow-500'
                    : 'text-emerald-500'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={17} className="text-primary" />
        <h6 className="font-semibold text-gray-700 dark:text-gray-300">Debt Service Ratio (DSR)</h6>
        <span className={`xp-badge ml-auto ${
          dsr.dsrStatus === 'Critical' ? 'xp-badge-danger' :
          dsr.dsrStatus === 'Warning'  ? 'xp-badge-warning' : 'xp-badge-success'
        }`}>{dsr.dsrStatus}</span>
      </div>

      {/* Gauge bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>0%</span>
          <span className="text-yellow-500">40% Warning</span>
          <span className="text-red-500">50% Critical</span>
          <span>100%</span>
        </div>
        <div className="relative h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          {/* Zone markers */}
          <div className="absolute left-[40%] top-0 bottom-0 w-px bg-yellow-400 opacity-60" />
          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-red-400 opacity-60" />
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            Total monthly: {fmtMoney(dsr.totalMonthlyCommitment)}
          </span>
          <span className={`text-2xl font-bold ${statusClass}`}>
            {dsr.dsrPercentage}%
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Gross Salary</p>
          <p className="font-semibold heading-text">{fmtMoney(dsr.grossSalary)}</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Internal Loans</p>
          <p className="font-semibold text-primary">{fmtMoney(dsr.internalMonthly)}/mo</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">External Liabilities</p>
          <p className="font-semibold text-orange-500">{fmtMoney(dsr.externalMonthly)}/mo</p>
        </div>
      </div>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-emerald-400' : pct >= 60 ? 'bg-primary' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoansPage() {
  useRequirePermission('HR.Employee.View');
  const { id: employeeId } = useParams<{ id: string }>()
  const initialized = useRef(false)
  const canManage = usePermission(Permissions.Payroll.Loan.Manage);


  const [loans,        setLoans]        = useState<LoanRecord[]>([])
  const [liabilities,  setLiabilities]  = useState<ExternalLiability[]>([])
  const [dsr,          setDsr]          = useState<DsrData | null>(null)
  const [loading,      setLoading]      = useState(true)

  // Loan dialog
  const [loanDialogOpen,  setLoanDialogOpen]  = useState(false)
  const [loanSaving,      setLoanSaving]      = useState(false)
  const [editingLoan,     setEditingLoan]     = useState<LoanRecord | null>(null)
  const [loanForm,        setLoanForm]        = useState<LoanForm>(defaultLoanForm())

  // Liability dialog
  const [liabDialogOpen,  setLiabDialogOpen]  = useState(false)
  const [liabSaving,      setLiabSaving]      = useState(false)
  const [editingLiab,     setEditingLiab]     = useState<ExternalLiability | null>(null)
  const [liabForm,        setLiabForm]        = useState<LiabilityForm>(defaultLiabilityForm())

  // Confirm delete
  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [deleteTarget,  setDeleteTarget]  = useState<{ id: string; label: string; type: 'loan' | 'liability' } | null>(null)

  // Loan computed values
  const principal   = parseFloat(loanForm.principalAmount)    || 0
  const installment = parseFloat(loanForm.monthlyInstallment) || 0
  const totalInst   = parseInt(loanForm.totalInstallments)    || 0
  const paidInst    = parseInt(loanForm.paidInstallments)     || 0
  const outstanding = Math.max(principal - (paidInst * installment), 0)
  const totalRepayment = totalInst * installment

  const load = async () => {
    try {
      const [lRes, elRes, dsrRes] = await Promise.all([
        api.get(`loan-records?employeeId=${employeeId}`),
        api.get(`employee-external-liabilities?employeeId=${employeeId}`),
        api.get(`employee-external-liabilities/dsr?employeeId=${employeeId}`),
      ]);
      setLoans(lRes.data)
      setLiabilities(elRes.data)
      setDsr(dsrRes.data)
    } catch {
      showError('Load Failed', 'Could not load loan data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    load()
  }, [])

  // ── Loan CRUD ────────────────────────────────────────────────────────────────
  const openAddLoan = () => {
    setEditingLoan(null); setLoanForm(defaultLoanForm()); setLoanDialogOpen(true)
  }
  const openEditLoan = (l: LoanRecord) => {
    setEditingLoan(l)
    setLoanForm({
      principalAmount:    l.principalAmount.toString(),
      monthlyInstallment: l.monthlyInstallment.toString(),
      totalInstallments:  l.totalInstallments.toString(),
      paidInstallments:   l.paidInstallments.toString(),
      startDate:          l.startDate,
      status:             l.status,
      notes:              l.notes ?? '',
    })
    setLoanDialogOpen(true)
  }

  const validateLoan = (): boolean => {
    // DSR block — only for new loans
    if (!editingLoan && dsr && dsr.grossSalary > 0) {
      const projectedMonthly = dsr.internalMonthly + dsr.externalMonthly + installment
      const projectedDsr     = (projectedMonthly / dsr.grossSalary) * 100
      if (projectedDsr > DSR_THRESHOLD) {
        showError(
          'DSR Limit Exceeded',
          `Adding this loan would push DSR to ${projectedDsr.toFixed(1)}% (limit: ${DSR_THRESHOLD}%). ` +
          `Current DSR: ${dsr.dsrPercentage}%. Gross salary: ${fmtMoney(dsr.grossSalary)}.`
        )
        return false
      }
    }
    if (!loanForm.principalAmount || principal <= 0)      { showError('Validation', 'Principal amount must be greater than zero.'); return false }
    if (!loanForm.monthlyInstallment || installment <= 0) { showError('Validation', 'Monthly installment must be greater than zero.'); return false }
    if (!loanForm.totalInstallments || totalInst <= 0)    { showError('Validation', 'Total installments must be greater than zero.'); return false }
    if (installment > principal)                          { showError('Validation', 'Monthly installment cannot exceed principal amount.'); return false }
    if (!loanForm.startDate)                              { showError('Validation', 'Start date is required.'); return false }
    if (paidInst > totalInst)                             { showError('Validation', 'Paid installments cannot exceed total installments.'); return false }
    if (totalRepayment > principal)                       {
      showError('Validation', `Total repayment (${fmtMoney(totalRepayment)}) exceeds principal (${fmtMoney(principal)}). Reduce installments or monthly amount.`)
      return false
    }
    return true
  }

  const handleLoanSave = async () => {
    if (!validateLoan()) return
    setLoanSaving(true)
    try {
      await api.post('loan-records/save', {
        action: editingLoan ? 'UPDATE' : 'ADD',
        id: editingLoan?.id, employeeId,
        principalAmount: principal, monthlyInstallment: installment,
        totalInstallments: totalInst, paidInstallments: paidInst,
        startDate: loanForm.startDate, status: loanForm.status || null,
        notes: loanForm.notes || null,
      })
      setLoanDialogOpen(false)
      await load()
      showSuccess(editingLoan ? 'Loan Updated' : 'Loan Added', 'Loan record saved.')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showError('Save Failed', msg ?? 'Could not save loan.')
    } finally {
      setLoanSaving(false)
    }
  }

  // ── Liability CRUD ────────────────────────────────────────────────────────────
  const openAddLiab = () => {
    setEditingLiab(null); setLiabForm(defaultLiabilityForm()); setLiabDialogOpen(true)
  }
  const openEditLiab = (l: ExternalLiability) => {
    setEditingLiab(l)
    setLiabForm({
      liabilityType:      l.liabilityType,
      lenderName:         l.lenderName,
      monthlyCommitment:  l.monthlyCommitment.toString(),
      outstandingBalance: l.outstandingBalance.toString(),
      startDate:          l.startDate,
      endDate:            l.endDate ?? '',
      isActive:           l.isActive,
      notes:              l.notes ?? '',
    })
    setLiabDialogOpen(true)
  }

  const validateLiab = (): boolean => {
    if (!liabForm.lenderName)                            { showError('Validation', 'Lender name is required.'); return false }
    if (!liabForm.monthlyCommitment || parseFloat(liabForm.monthlyCommitment) <= 0) {
      showError('Validation', 'Monthly commitment must be greater than zero.'); return false
    }
    if (!liabForm.startDate)                             { showError('Validation', 'Start date is required.'); return false }
    return true
  }

  const handleLiabSave = async () => {
    if (!validateLiab()) return
    setLiabSaving(true)
    try {
      await api.post('employee-external-liabilities/save', {
        action:             editingLiab ? 'UPDATE' : 'ADD',
        id:                 editingLiab?.id, employeeId,
        liabilityType:      liabForm.liabilityType,
        lenderName:         liabForm.lenderName,
        monthlyCommitment:  parseFloat(liabForm.monthlyCommitment),
        outstandingBalance: parseFloat(liabForm.outstandingBalance) || 0,
        startDate:          liabForm.startDate,
        endDate:            liabForm.endDate || null,
        isActive:           liabForm.isActive,
        notes:              liabForm.notes || null,
      })
      setLiabDialogOpen(false)
      await load()
      showSuccess(editingLiab ? 'Liability Updated' : 'Liability Added', 'External liability saved.')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showError('Save Failed', msg ?? 'Could not save liability.')
    } finally {
      setLiabSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  const promptDelete = (id: string, label: string, type: 'loan' | 'liability') => {
    setDeleteTarget({ id, label, type }); setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const endpoint = deleteTarget.type === 'loan' ? 'loan-records/save' : 'employee-external-liabilities/save'
      await api.post(endpoint, { action: 'DELETE', id: deleteTarget.id })
      setConfirmOpen(false); setDeleteTarget(null)
      await load()
      showSuccess('Removed', `${deleteTarget.label} has been removed.`)
    } catch {
      showError('Delete Failed', 'Could not remove record.')
    } finally {
      setDeleting(false)
    }
  }

  const activeLoans      = loans.filter(l => l.status === 'Active')
  const activeLiabilities = liabilities.filter(l => l.isActive)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Loans & Liabilities</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Internal loans, external liabilities, and DSR analysis.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* DSR Gauge */}
          {dsr && <DsrGauge dsr={dsr} />}

          {/* ── Internal Loans ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h6 className="font-semibold text-gray-700 dark:text-gray-300">
                  Company Loans
                </h6>
                {activeLoans.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeLoans.length} active ·{" "}
                    {fmtMoney(
                      activeLoans.reduce((s, l) => s + l.monthlyInstallment, 0),
                    )}
                    /mo
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="solid"
                  icon={<PlusIcon size={15} />}
                  onClick={openAddLoan}
                >
                  Add Loan
                </Button>
              )}
            </div>

            {loans.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No company loans recorded.
              </div>
            ) : (
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Principal</th>
                    <th className="text-right">Monthly</th>
                    <th>Installments</th>
                    <th className="text-right">Outstanding</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span className="heading-text font-medium">
                          {fmtMoney(l.principalAmount)}
                        </span>
                        <p className="text-xs text-gray-400">
                          {fmt(l.startDate)}
                        </p>
                      </td>
                      <td className="text-right font-medium">
                        {fmtMoney(l.monthlyInstallment)}
                      </td>
                      <td className="text-sm">
                        {l.paidInstallments} / {l.totalInstallments}
                      </td>
                      <td className="text-right font-medium">
                        <span
                          className={
                            l.outstandingBalance === 0
                              ? "text-emerald-500"
                              : "heading-text"
                          }
                        >
                          {l.outstandingBalance === 0
                            ? "Cleared"
                            : fmtMoney(l.outstandingBalance)}
                        </span>
                      </td>
                      <td>
                        <ProgressBar pct={l.progressPct} />
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${LOAN_STATUS_BADGE[l.status] ?? "xp-badge-neutral"}`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => openEditLoan(l)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() =>
                                promptDelete(
                                  l.id,
                                  `Loan of ${fmtMoney(l.principalAmount)}`,
                                  "loan",
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

          {/* ── External Liabilities ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h6 className="font-semibold text-gray-700 dark:text-gray-300">
                  External Liabilities
                </h6>
                {activeLiabilities.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeLiabilities.length} active ·{" "}
                    {fmtMoney(
                      activeLiabilities.reduce(
                        (s, l) => s + l.monthlyCommitment,
                        0,
                      ),
                    )}
                    /mo
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="solid"
                  icon={<PlusIcon size={15} />}
                  onClick={openAddLiab}
                >
                  Add Liability
                </Button>
              )}
            </div>

            {liabilities.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No external liabilities recorded.
              </div>
            ) : (
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Lender</th>
                    <th>Type</th>
                    <th className="text-right">Monthly</th>
                    <th className="text-right">Outstanding</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liabilities.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span className="heading-text font-medium">
                          {l.lenderName}
                        </span>
                        {l.notes && (
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">
                            {l.notes}
                          </p>
                        )}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${LIABILITY_TYPE_BADGE[l.liabilityType] ?? "xp-badge-neutral"}`}
                        >
                          {l.liabilityType}
                        </span>
                      </td>
                      <td className="text-right font-medium">
                        {fmtMoney(l.monthlyCommitment)}
                      </td>
                      <td className="text-right heading-text">
                        {fmtMoney(l.outstandingBalance)}
                      </td>
                      <td className="text-sm text-gray-500">
                        {fmt(l.startDate)}
                        {l.endDate ? ` → ${fmt(l.endDate)}` : " → Open"}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${l.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                        >
                          {l.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => openEditLiab(l)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() =>
                                promptDelete(
                                  l.id,
                                  `${l.liabilityType} — ${l.lenderName}`,
                                  "liability",
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

      {/* ── Loan Dialog ── */}
      <Dialog
        isOpen={loanDialogOpen}
        onClose={() => setLoanDialogOpen(false)}
        onRequestClose={() => setLoanDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-4">
            {editingLoan ? "Edit Loan" : "Add Company Loan"}
          </h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Principal Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100000"
                  value={loanForm.principalAmount}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      principalAmount: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">
                  Monthly Installment <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="8333"
                  value={loanForm.monthlyInstallment}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      monthlyInstallment: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Total Installments <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="12"
                  value={loanForm.totalInstallments}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      totalInstallments: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Paid Installments</label>
                <Input
                  type="number"
                  min="0"
                  value={loanForm.paidInstallments}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      paidInstallments: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Live summary */}
            {principal > 0 && installment > 0 && totalInst > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Repayment</span>
                  <span
                    className={`font-semibold ${totalRepayment > principal ? "text-red-500" : "heading-text"}`}
                  >
                    {fmtMoney(totalRepayment)}
                    {totalRepayment > principal && " ⚠"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Outstanding Balance</span>
                  <span className="font-semibold text-primary">
                    {fmtMoney(outstanding)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={loanForm.startDate}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select
                  className="input w-full"
                  value={loanForm.status}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, status: e.target.value })
                  }
                >
                  {LOAN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <Input
                placeholder="Optional"
                value={loanForm.notes}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="plain"
                onClick={() => setLoanDialogOpen(false)}
                disabled={loanSaving}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={loanSaving}
                onClick={handleLoanSave}
              >
                {editingLoan ? "Update" : "Add Loan"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ── External Liability Dialog ── */}
      <Dialog
        isOpen={liabDialogOpen}
        onClose={() => setLiabDialogOpen(false)}
        onRequestClose={() => setLiabDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-4">
            {editingLiab ? "Edit Liability" : "Add External Liability"}
          </h5>
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Liability Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={liabForm.liabilityType}
                onChange={(e) =>
                  setLiabForm({ ...liabForm, liabilityType: e.target.value })
                }
              >
                {LIABILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Lender Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Commercial Bank"
                value={liabForm.lenderName}
                onChange={(e) =>
                  setLiabForm({ ...liabForm, lenderName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Monthly Commitment <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="15000"
                  value={liabForm.monthlyCommitment}
                  onChange={(e) =>
                    setLiabForm({
                      ...liabForm,
                      monthlyCommitment: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Outstanding Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={liabForm.outstandingBalance}
                  onChange={(e) =>
                    setLiabForm({
                      ...liabForm,
                      outstandingBalance: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={liabForm.startDate}
                  onChange={(e) =>
                    setLiabForm({ ...liabForm, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">
                  End Date{" "}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={liabForm.endDate}
                  onChange={(e) =>
                    setLiabForm({ ...liabForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="form-label mb-0">Active</label>
              <Switcher
                checked={liabForm.isActive}
                onChange={(val: boolean) =>
                  setLiabForm({ ...liabForm, isActive: val })
                }
              />
            </div>
            <div>
              <label className="form-label">Notes</label>
              <Input
                placeholder="Optional"
                value={liabForm.notes}
                onChange={(e) =>
                  setLiabForm({ ...liabForm, notes: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="plain"
                onClick={() => setLiabDialogOpen(false)}
                disabled={liabSaving}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={liabSaving}
                onClick={handleLiabSave}
              >
                {editingLiab ? "Update" : "Add Liability"}
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
            ? `Are you sure you want to remove "${deleteTarget.label}"?`
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
