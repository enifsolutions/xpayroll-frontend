import { redirect } from 'next/navigation'
import { useRequirePermission } from '@/hooks/useRequirePermission';
export default function EmployeeProfileRoot({
  useRequirePermission('HR.Employee.View');
  params,
}: {
  params: { id: string }
}) {
  redirect(`/employees/${params.id}/overview`)
}
