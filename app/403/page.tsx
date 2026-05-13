'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex flex-col items-center gap-3">
        <span className="text-7xl font-bold text-error opacity-30">403</span>
        <h3 className="heading-text">Access Denied</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="solid" onClick={() => router.back()}>
          Go Back
        </Button>
        <Button variant="plain" onClick={() => router.replace('/dashboard')}>
          Dashboard
        </Button>
      </div>
    </div>
  )
}
