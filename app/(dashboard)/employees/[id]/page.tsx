import { redirect } from 'next/navigation'

export default function EmployeeProfileRoot({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/employees/${params.id}/overview`)
}
