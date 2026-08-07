import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermission'

export interface AttendancePendingCount {
  forReview: number
  myPending: number
}

export function useAttendancePendingCount() {
  const [counts, setCounts] = useState<AttendancePendingCount>({ forReview: 0, myPending: 0 })
  const userId = useAuthStore((s) => s.user?.userId);
  const canView     = usePermission('Attendance.Adjustment.View')

  useEffect(() => {
    if (!canView || !userId) return
    const fetch = async () => {
      try {
        const res = await api.get('/attendance-adjustments/pending-count', {
          params: { requestedBy: userId }
        })
        setCounts(res.data)
      } catch { /* silent */ }
    }
    fetch()
    const interval = setInterval(fetch, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [canView, userId])

  return counts
}
