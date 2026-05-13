'use client'

import { useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import Button from '@/components/ui/Button'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_STYLES = {
  danger: {
    icon:       <Trash2 size={22} className="text-red-500" />,
    iconBg:     'bg-red-50 dark:bg-red-900/20',
    button:     'bg-red-500 hover:bg-red-600 text-white',
  },
  warning: {
    icon:       <AlertTriangle size={22} className="text-yellow-500" />,
    iconBg:     'bg-yellow-50 dark:bg-yellow-900/20',
    button:     'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  info: {
    icon:       <AlertTriangle size={22} className="text-primary" />,
    iconBg:     'bg-primary/10',
    button:     'bg-primary hover:bg-primary/90 text-white',
  },
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const styles = VARIANT_STYLES[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon + text */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div>
            <h5 className="h5 mb-1">{title}</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${styles.button}`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
