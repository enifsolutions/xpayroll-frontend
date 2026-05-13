import api from './axios'
import { useAuthStore } from '@/store/authStore'

export interface LoginResponse {
  accessToken:  string
  refreshToken: string
  userId:       string
  email:        string
  firstName:    string
  lastName:     string
  systemRole:   string
  permHash:     string
  permissions:  string[]
}

// -------------------------------------------------------
// Token helpers — used by axios.ts interceptors
// All reads/writes go through localStorage so the axios
// interceptor (which runs outside React) can access them.
// The Zustand store is also kept in sync on login/logout.
// -------------------------------------------------------

const ACCESS_KEY  = 'xp_access'
const REFRESH_KEY = 'xp_refresh'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  useAuthStore.getState().clearAuth()
}

// -------------------------------------------------------
// Auth actions
// -------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })

  // Persist tokens for axios interceptor
  setTokens(data.accessToken, data.refreshToken)

  // Hydrate Zustand store with user + permission set
  useAuthStore.getState().setAuth(
    data.accessToken,
    {
      userId:     data.userId,
      email:      data.email,
      firstName:  data.firstName,
      lastName:   data.lastName,
      systemRole: data.systemRole,
      permHash:   data.permHash,
    },
    data.permissions
  )

  return data
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout') } catch { /* best-effort */ }
  clearTokens()
}
