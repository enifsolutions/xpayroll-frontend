'use client'

import { useMemo } from 'react'
import navigationConfig, { NavItem } from '@/configs/navigation.config'
import { useAuthStore } from '@/store/authStore'

/**
 * Returns navigation items filtered by the current user's permissions.
 * Items with no permissionKey are always shown (e.g. Dashboard).
 * Parent items are shown if at least one child is visible.
 */
export function useFilteredNavigation(): NavItem[] {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return useMemo(() => {
    return navigationConfig
      .map((item) => {
        if (!item.children) {
          // Top-level item — show if no permission required or user has it
          if (!item.permissionKey || hasPermission(item.permissionKey)) return item
          return null
        }

        // Filter children
        const visibleChildren = item.children.filter(
          (child) => !child.permissionKey || hasPermission(child.permissionKey)
        )

        if (visibleChildren.length === 0) return null

        return { ...item, children: visibleChildren }
      })
      .filter(Boolean) as NavItem[]
  }, [hasPermission])
}
