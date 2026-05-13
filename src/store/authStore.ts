import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  systemRole: string
  permHash: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  permissions: Set<string>

  setAuth: (token: string, user: AuthUser, permissions: string[]) => void
  clearAuth: () => void
  hasPermission: (key: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:       null,
      user:        null,
      permissions: new Set<string>(),

      setAuth: (token, user, permissionsArray) => {
        set({
          token,
          user,
          permissions: new Set(permissionsArray),
        })
        // Also write token to xp_access key for axios interceptor compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('xp_access', token)
        }
      },

      clearAuth: () => {
        set({ token: null, user: null, permissions: new Set() })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('xp_access')
        }
      },

      hasPermission: (key: string) => {
        const { user, permissions } = get()
        // SuperAdmin bypasses all checks (mirrors backend short-circuit)
        if (user?.systemRole === 'SuperAdmin') return true
        return permissions.has(key)
      },
    }),
    {
      name: 'xp_auth',
      // Custom serializer — Set is not JSON-serializable by default
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          // Re-hydrate permissions as Set
          if (parsed?.state?.permissions) {
            parsed.state.permissions = new Set(parsed.state.permissions)
          }
          return parsed
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              // Serialize Set to array for storage
              permissions: Array.from(value.state.permissions ?? []),
            },
          }
          localStorage.setItem(name, JSON.stringify(toStore))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
