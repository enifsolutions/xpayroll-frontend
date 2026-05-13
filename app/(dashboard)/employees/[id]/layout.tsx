'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import api from '@/lib/axios'
import EmployeePhotoUpload from '@/components/employee/EmployeePhotoUpload'

interface EmployeeSummary {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  departmentName: string | null
  designationName: string | null
  status: string
  profilePictureUrl: string | null
}

const TABS = [
  { label: 'Overview',          href: 'overview' },
  { label: 'Shift Assignments', href: 'shift-assignments' },
  { label: 'Benefits',          href: 'benefits' },
  { label: 'Deductions',        href: 'deductions' },
  { label: 'Leave Balances',    href: 'leave-balances' },
  { label: 'Tax Profile',       href: 'tax-profile' },
  { label: 'Loans',             href: 'loans' },
]

const STATUS_BADGE: Record<string, string> = {
  Active:     'xp-badge-success',
  Inactive:   'xp-badge-neutral',
  OnLeave:    'xp-badge-warning',
  Suspended:  'xp-badge-danger',
  Terminated: 'xp-badge-danger',
}

export default function EmployeeProfileLayout({ children }: { children: React.ReactNode }) {
  const { id }   = useParams<{ id: string }>()
  const pathname = usePathname()
  const router   = useRouter()

  const [employee, setEmployee] = useState<EmployeeSummary | null>(null)

  useEffect(() => {
    api.get<EmployeeSummary>(`/employees/${id}`)
      .then((r) => setEmployee(r.data))
      .catch(() => router.replace('/employees'))
  }, [id])

  const activeTab = TABS.find((t) => pathname.endsWith(`/${t.href}`))?.href ?? 'overview'

  const initials = employee
    ? `${employee.firstName[0]}${employee.lastName[0]}`
    : ''

  return (
    <div>
      <div className="mb-4">
        <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
          <ArrowLeft size={15} />
          Back to Employees
        </Link>
      </div>

      <div className="card mb-0 rounded-b-none border-b-0">
        <div className="card-body py-5">
          {employee ? (
            <div className="flex items-center gap-4">

              {/* Photo upload component handles avatar + camera + crop */}
              <div className="relative">
                <EmployeePhotoUpload
                  employeeId={id}
                  currentUrl={employee.profilePictureUrl}
                  onUploaded={(url) =>
                    setEmployee((prev) => prev ? { ...prev, profilePictureUrl: url } : prev)
                  }
                />
                {/* Initials fallback rendered inside the component slot */}
                {!employee.profilePictureUrl && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
                    <span className="text-primary font-semibold text-lg select-none">{initials}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="h5 mb-0">{employee.firstName} {employee.lastName}</h5>
                  <span className={`xp-badge ${STATUS_BADGE[employee.status] ?? 'xp-badge-neutral'}`}>
                    {employee.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {employee.designationName ?? ''}
                  {employee.departmentName ? ` · ${employee.departmentName}` : ''}
                  <span className="ml-2 font-mono text-xs text-gray-400">{employee.employeeCode}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-0 border-t border-gray-200 dark:border-gray-700 overflow-x-auto px-4">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={`/employees/${id}/${tab.href}`}
              className={[
                'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.href
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card rounded-t-none">
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}
