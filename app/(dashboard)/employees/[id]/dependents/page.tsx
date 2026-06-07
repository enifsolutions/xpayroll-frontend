'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useParams } from 'next/navigation'
import DependentsTab from '@/components/employees/DependentsTab'

export default function DependentsPage() {
  useRequirePermission('HR.Dependents.View')
  const { id } = useParams<{ id: string }>()
  return <DependentsTab employeeId={id} />
}
