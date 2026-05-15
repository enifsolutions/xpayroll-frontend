'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  User, Briefcase, CreditCard, Clock,
  Calendar, Mail, Phone, MapPin,
  Building2, Layers, BadgeCheck, Banknote,
} from 'lucide-react'
import api from '@/lib/axios'

// ── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  middleName: string | null
  email: string | null
  personalEmail: string | null
  phoneNumber: string | null
  nationalIdNumber: string | null
  bankAccountNumber: string | null
  bankName: string | null
  bankBranchCode: string | null
  dateOfBirth: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  branchName: string | null
  departmentName: string | null
  designationName: string | null
  joinDate: string
  terminationDate: string | null
  employmentType: string
  status: string
  basicSalary: number
  notes: string | null
}

interface Contract {
  id: string
  contractType: string
  payrollBasis: string
  basicSalary: number
  allowances: number
  currency: string
  startDate: string
  endDate: string | null
  isActive: boolean
}

interface ShiftAssignment {
  shiftName: string
  shiftCode: string
  attendancePolicyName: string
  effectiveFrom: string
  isActive: boolean
}

interface LeaveBalance {
  leaveTypeName: string
  entitled: number
  used: number
  remaining: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtMoney = (n: number) =>
  `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`

const CURRENT_YEAR = new Date().getFullYear()

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <h6 className="font-semibold text-gray-700 dark:text-gray-300">{title}</h6>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-sm font-medium heading-text text-right">{value || '—'}</span>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'primary' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    yellow:  'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    red:     'bg-red-50 text-red-500 dark:bg-red-900/20',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { id: employeeId } = useParams<{ id: string }>()
  const router = useRouter()
  const initialized = useRef(false)

  const [employee,       setEmployee]       = useState<Employee | null>(null)
  const [contract,       setContract]       = useState<Contract | null>(null)
  const [activeShift,    setActiveShift]    = useState<ShiftAssignment | null>(null)
  const [leaveBalances,  setLeaveBalances]  = useState<LeaveBalance[]>([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [empRes, contractRes, shiftRes, leaveRes] =
        await Promise.allSettled([
          api.get<Employee>(`/employees/${employeeId}`),
          api.get<Contract[]>(
            `/employees/contracts?employeeId=${employeeId}&isActive=true`,
          ),
          api.get<ShiftAssignment[]>(
            `shift-assignments?employeeId=${employeeId}`,
          ),
          api.get<LeaveBalance[]>(
            `employee-leave-balances/${employeeId}?year=${CURRENT_YEAR}`,
          ),
        ]);

      if (empRes.status === 'fulfilled') setEmployee(empRes.value.data)
      if (contractRes.status === 'fulfilled') setContract(contractRes.value.data?.[0] ?? null)
      if (shiftRes.status === 'fulfilled') {
        const active = shiftRes.value.data.find((s) => s.isActive) ?? null
        setActiveShift(active)
      }
      if (leaveRes.status === 'fulfilled') setLeaveBalances(leaveRes.value.data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!employee) return null

  // Days since joining
  const joinedDays = Math.floor(
    (Date.now() - new Date(employee.joinDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const joinedYears  = Math.floor(joinedDays / 365)
  const joinedMonths = Math.floor((joinedDays % 365) / 30)
  const tenureLabel  = joinedYears > 0
    ? `${joinedYears}y ${joinedMonths}m`
    : `${joinedMonths} months`

  // Total leave remaining
  const totalLeaveRemaining = leaveBalances.reduce((s, l) => s + l.remaining, 0)

  return (
    <div className="space-y-5">

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Basic Salary"
          value={`LKR ${Math.round(employee.basicSalary / 1000)}K`}
          sub={employee.employmentType}
          color="primary"
        />
        <StatCard
          label="Tenure"
          value={tenureLabel}
          sub={`Joined ${fmt(employee.joinDate)}`}
          color="green"
        />
        <StatCard
          label="Leave Remaining"
          value={totalLeaveRemaining}
          sub={`${CURRENT_YEAR} — ${leaveBalances.length} type${leaveBalances.length !== 1 ? 's' : ''}`}
          color={totalLeaveRemaining < 3 ? 'red' : 'yellow'}
        />
        <StatCard
          label="Active Shift"
          value={activeShift?.shiftCode ?? '—'}
          sub={activeShift?.shiftName ?? 'No shift assigned'}
          color="primary"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Personal Information */}
        <SectionCard icon={<User size={17} />} title="Personal Information">
          <InfoRow label="Full Name"     value={`${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''} ${employee.lastName}`} />
          <InfoRow label="Date of Birth" value={fmt(employee.dateOfBirth)} />
          <InfoRow label="Gender"        value={employee.gender} />
          <InfoRow label="Nationality"   value={employee.nationality} />
          <InfoRow label="National ID"   value={employee.nationalIdNumber} />
          <InfoRow label="Address"       value={employee.address} />
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={<Mail size={17} />} title="Contact">
          <InfoRow label="Work Email"     value={employee.email
            ? <a href={`mailto:${employee.email}`} className="text-primary hover:underline">{employee.email}</a>
            : null} />
          <InfoRow label="Personal Email" value={employee.personalEmail
            ? <a href={`mailto:${employee.personalEmail}`} className="text-primary hover:underline">{employee.personalEmail}</a>
            : null} />
          <InfoRow label="Phone"          value={employee.phoneNumber
            ? <a href={`tel:${employee.phoneNumber}`} className="text-primary hover:underline">{employee.phoneNumber}</a>
            : null} />
        </SectionCard>

        {/* Employment */}
        <SectionCard icon={<Briefcase size={17} />} title="Employment">
          <InfoRow label="Employee Code"    value={<code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{employee.employeeCode}</code>} />
          <InfoRow label="Branch"           value={employee.branchName} />
          <InfoRow label="Department"       value={employee.departmentName} />
          <InfoRow label="Designation"      value={employee.designationName} />
          <InfoRow label="Employment Type"  value={employee.employmentType} />
          <InfoRow label="Join Date"        value={fmt(employee.joinDate)} />
          {employee.terminationDate && (
            <InfoRow label="Termination Date" value={fmt(employee.terminationDate)} />
          )}
        </SectionCard>

        {/* Contract */}
        <SectionCard icon={<CreditCard size={17} />} title="Active Contract">
          {contract ? (
            <>
              <InfoRow label="Contract Type"  value={contract.contractType} />
              <InfoRow label="Payroll Basis"  value={contract.payrollBasis} />
              <InfoRow label="Basic Salary"   value={fmtMoney(contract.basicSalary)} />
              <InfoRow label="Allowances"     value={fmtMoney(contract.allowances)} />
              <InfoRow label="Currency"       value={contract.currency} />
              <InfoRow label="Start Date"     value={fmt(contract.startDate)} />
              <InfoRow label="End Date"       value={fmt(contract.endDate)} />
            </>
          ) : (
            <p className="text-sm text-gray-400 py-2">No active contract.</p>
          )}
        </SectionCard>

        {/* Bank Details */}
        <SectionCard icon={<Banknote size={17} />} title="Bank Details">
          <InfoRow label="Bank Name"       value={employee.bankName} />
          <InfoRow label="Account Number"  value={employee.bankAccountNumber} />
          <InfoRow label="Branch Code"     value={employee.bankBranchCode} />
        </SectionCard>

        {/* Leave Balances */}
        <SectionCard icon={<Calendar size={17} />} title={`Leave Balances (${CURRENT_YEAR})`}>
          {leaveBalances.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No leave balances for {CURRENT_YEAR}.</p>
          ) : (
            <div className="space-y-2">
              {leaveBalances.map((lb, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{lb.leaveTypeName}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>{lb.used} used</span>
                      <span>/</span>
                      <span>{lb.entitled} entitled</span>
                    </div>
                    <span className={`text-sm font-semibold min-w-[36px] text-right ${
                      lb.remaining <= 0 ? 'text-red-500' : 'text-primary'
                    }`}>
                      {lb.remaining}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

      </div>

      {/* Notes */}
      {employee.notes && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h6 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</h6>
          <p className="text-sm text-gray-500 whitespace-pre-line">{employee.notes}</p>
        </div>
      )}

    </div>
  )
}
