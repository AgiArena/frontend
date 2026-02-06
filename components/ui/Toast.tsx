'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  message: string
  link?: {
    url: string
    text: string
  }
  duration?: number
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

/**
 * Individual toast notification component
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration ?? 5000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  const borderColor = {
    success: 'border-green',
    error: 'border-accent',
    info: 'border'
  }[toast.type]

  const iconColor = {
    success: 'text-green',
    error: 'text-accent',
    info: 'text-primary'
  }[toast.type]

  return (
    <div
      className={`
        bg-primary border ${borderColor} text-primary p-4 rounded font-mono
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={toast.type === 'error' ? 'text-accent' : 'text-primary'}>
            {toast.message}
          </p>
          {toast.link && (
            <a
              href={toast.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1 inline-block text-sm ${iconColor} underline hover:opacity-80`}
            >
              {toast.link.text}
            </a>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-secondary hover:text-primary transition-colors"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

/**
 * Container for rendering multiple toast notifications
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
