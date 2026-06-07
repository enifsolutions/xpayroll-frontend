'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useParams } from 'next/navigation'
import QualificationsTab from '@/components/employees/QualificationsTab'

export default function QualificationsPage() {
  useRequirePermission('HR.Qualifications.View')
  const { id } = useParams<{ id: string }>()
  return <QualificationsTab employeeId={id} />
}
