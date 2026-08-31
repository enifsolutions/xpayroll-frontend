import api from './axios'

export interface OnboardingStatusRow {
  tourKey: string
  status: 'InProgress' | 'Completed' | 'Dismissed'
  currentStep: number
  completedAt: string | null
  dismissedAt: string | null
  updatedAt: string | null
}

// Admin Web hits /api/onboarding/*; ESS Portal / Mobile web-view would hit
// /api/portal/onboarding/* instead (pass base override if this hook is ever
// reused there — see XpayRoll_Onboarding_Tour_Plan.md Phase 3).
const ADMIN_BASE = '/onboarding'

export async function getOnboardingStatus(base: string = ADMIN_BASE): Promise<OnboardingStatusRow[]> {
  const { data } = await api.get<OnboardingStatusRow[]>(`${base}/status`)
  return data
}

export async function saveOnboardingProgress(
  tourKey: string,
  action: 'START' | 'STEP' | 'COMPLETE' | 'DISMISS',
  currentStep?: number,
  base: string = ADMIN_BASE,
): Promise<void> {
  // userId is intentionally omitted — the backend overwrites it from the
  // JWT claim regardless of what's sent (see OnboardingController.Save).
  await api.post(`${base}/save`, { tourKey, action, currentStep })
}

export async function resetOnboarding(tourKey: string, base: string = ADMIN_BASE): Promise<void> {
  await api.post(`${base}/reset`, { tourKey })
}
