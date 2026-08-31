import { create } from 'zustand'

const STORAGE_KEY = 'xp_onboarding'

export type TourStatus = 'InProgress' | 'Completed' | 'Dismissed'

export interface TourProgress {
  status: TourStatus
  currentStep: number
}

interface TourState {
  progress: Record<string, TourProgress>
  hydrate: (rows: { tourKey: string; status: TourStatus; currentStep: number }[]) => void
  setLocal: (tourKey: string, status: TourStatus, currentStep: number) => void
  clearLocal: (tourKey: string) => void
}

function loadFromStorage(): Record<string, TourProgress> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(progress: Record<string, TourProgress>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {}
}

export const useTourStore = create<TourState>()((set, get) => ({
  progress: loadFromStorage(),

  // Backend is the source of truth; this only overlays/updates entries
  // the API returned, so it never wipes out other tours' local state.
  hydrate: (rows) => {
    const next = { ...get().progress }
    rows.forEach((r) => {
      next[r.tourKey] = { status: r.status, currentStep: r.currentStep }
    })
    set({ progress: next })
    saveToStorage(next)
  },

  setLocal: (tourKey, status, currentStep) => {
    const next = { ...get().progress, [tourKey]: { status, currentStep } }
    set({ progress: next })
    saveToStorage(next)
  },

  clearLocal: (tourKey) => {
    const next = { ...get().progress }
    delete next[tourKey]
    set({ progress: next })
    saveToStorage(next)
  },
}))
