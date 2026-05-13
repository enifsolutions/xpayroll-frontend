'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Call at the top of any protected page component.
 * Redirects to /403 immediately if the user lacks the permission.
 * Reads from in-memory store — zero network calls.
 *
 * @example
 * export default function BranchesPage() {
 *   useRequirePermission(Permissions.MasterData.Branches.View)
 *   // ...rest of page
 * }
 */
export function useRequirePermission(key: string): void {
  const router    = useRouter()
  const hasAccess = useAuthStore((s) => s.hasPermission(key))

  useEffect(() => {
    if (!hasAccess) {
      router.replace('/403')
    }
  }, [hasAccess, router])
}
