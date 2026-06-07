'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useParams } from 'next/navigation'
import DocumentsTab from '@/components/employees/DocumentsTab'

export default function DocumentsPage() {
  useRequirePermission('HR.Documents.View')
  const { id } = useParams<{ id: string }>()
  return <DocumentsTab employeeId={id} />
}
