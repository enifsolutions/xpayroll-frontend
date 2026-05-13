'use client'

import { useAuthStore } from '@/store/authStore'

/**
 * Returns true if the current user holds the given permission key.
 * SuperAdmin always returns true.
 * Use this to conditionally render buttons, columns, or data fields.
 *
 * @example
 * const canManage = usePermission(Permissions.MasterData.Branches.Manage)
 * {canManage && <Button onClick={openAdd}>Add Branch</Button>}
 */
export function usePermission(key: string): boolean {
  return useAuthStore((s) => s.hasPermission(key))
}
