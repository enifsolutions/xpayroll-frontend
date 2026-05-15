import api from './axios'
import { useAuthStore } from '@/store/authStore'

// Matches C# AuthResponse record exactly:
// AuthResponse(UserId, Email, FirstName, LastName, Role, Tokens, PermHash, Permissions)
// TokenPair(AccessToken, RefreshToken, ExpiresAt, RefreshTokenExpiresAt)
interface TokenPair {
  accessToken:            string
  refreshToken:           string
  expiresAt:              string
  refreshTokenExpiresAt:  string
}

export interface LoginResponse {
  userId:      number       // comes as number from JSON — we stringify it
  email:       string
  firstName:   string | null
  lastName:    string | null
  role:        string       // "Role" in C# record
  tokens:      TokenPair    // nested TokenPair object
  permHash:    string
  permissions: string[]
}

// -------------------------------------------------------
// Token helpers — used by axios.ts interceptors
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

  console.log('LOGIN RESPONSE:', data)

  // Persist tokens for axios interceptor
  setTokens(data.tokens.accessToken, data.tokens.refreshToken)

  // Hydrate Zustand store
  useAuthStore.getState().setAuth(
    data.tokens.accessToken,
    {
      userId:     String(data.userId),
      email:      data.email,
      firstName:  data.firstName ?? '',
      lastName:   data.lastName ?? '',
      systemRole: data.role,
      permHash:   data.permHash,
    },
    data.permissions ?? []
  )

  return data
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout') } catch { /* best-effort */ }
  clearTokens()
}
