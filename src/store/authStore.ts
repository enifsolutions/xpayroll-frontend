import { create } from 'zustand'

const STORAGE_KEY = 'xp_auth'

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
  permissions: string[]

  setAuth: (token: string, user: AuthUser, permissions: string[]) => void
  clearAuth: () => void
  hasPermission: (key: string) => boolean
}

// Read initial state from localStorage on store creation
function loadFromStorage(): { token: string | null; user: AuthUser | null; permissions: string[] } {
  if (typeof window === 'undefined') return { token: null, user: null, permissions: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null, permissions: [] }
    return JSON.parse(raw)
  } catch {
    return { token: null, user: null, permissions: [] }
  }
}

function saveToStorage(token: string | null, user: AuthUser | null, permissions: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, permissions }))
  } catch {}
}

const initial = loadFromStorage()

export const useAuthStore = create<AuthState>()((set, get) => ({
  token:       initial.token,
  user:        initial.user,
  permissions: initial.permissions,

  setAuth: (token, user, permissions) => {
    set({ token, user, permissions })
    localStorage.setItem('xp_access', token)
    saveToStorage(token, user, permissions)
  },

  clearAuth: () => {
    set({ token: null, user: null, permissions: [] })
    localStorage.removeItem('xp_access')
    localStorage.removeItem('xp_refresh')
    localStorage.removeItem(STORAGE_KEY)
  },

  hasPermission: (key: string) => {
    const { user, permissions } = get()
    if (user?.systemRole === 'SuperAdmin') return true
    return permissions.includes(key)
  },
}))
