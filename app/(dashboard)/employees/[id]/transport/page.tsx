'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useParams } from 'next/navigation'
import TransportTab from '@/components/employees/TransportTab'

export default function TransportPage() {
  useRequirePermission('HR.Transport.View')
  const { id } = useParams<{ id: string }>()
  return <TransportTab employeeId={id} />
}
