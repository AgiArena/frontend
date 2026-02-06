'use client'

import { useMemo } from 'react'
import { useResolutionSignatures } from '@/hooks/useResolutionSignatures'
import {
  calculateSignatureProgress,
  isThresholdMet,
  type SignatureStatus,
} from '@/lib/types/resolution'

/**
 * Props for SignatureProgress component
 */
export interface SignatureProgressProps {
  /** Bet ID to show signature progress for */
  betId: number
  /** Compact mode for list views (default: false) */
  compact?: boolean
  /** Whether to show the component (default: true) */
  enabled?: boolean
}

/**
 * Get status badge configuration
 */
function getStatusBadge(status: SignatureStatus['status']): {
  label: string
  bgColor: string
  textColor: string
} {
  switch (status) {
    case 'collecting':
      return {
        label: 'Collecting',
        bgColor: 'bg-accent-muted',
        textColor: 'text-yellow',
      }
    case 'ready':
      return {
        label: 'Ready',
        bgColor: 'bg-green-muted',
        textColor: 'text-green',
      }
    case 'submitted':
      return {
        label: 'Submitted',
        bgColor: 'bg-accent-muted',
        textColor: 'text-accent',
      }
    case 'expired':
      return {
        label: 'Expired',
        bgColor: 'bg-red-loss-muted',
        textColor: 'text-red-loss',
      }
    default:
      return {
        label: 'Unknown',
        bgColor: 'bg-hover',
        textColor: 'text-secondary',
      }
  }
}

/**
 * Get progress bar color based on percentage
 */
function getProgressColor(percentage: number, thresholdMet: boolean): string {
  if (thresholdMet) {
    return 'bg-green'
  }
  if (percentage >= 75) {
    return 'bg-yellow'
  }
  if (percentage >= 50) {
    return 'bg-yellow'
  }
  return 'bg-red-loss'
}

/**
 * SignatureProgress component
 *
 * Story 14.3, Task 9: Signature progress display
 *
 * Features:
 * - Progress bar showing collected/required signatures
 * - Threshold indicator
 * - Color coding based on progress
 * - Animated progress updates
 * - Compact mode for list views
 *
 * @param props - Component props
 */
export function SignatureProgress({
  betId,
  compact = false,
  enabled = true,
}: SignatureProgressProps) {
  const { data, isLoading, error } = useResolutionSignatures(betId, enabled)

  // Calculate progress values
  const progress = useMemo(() => {
    if (!data) {
      return {
        percentage: 0,
        thresholdMet: false,
        signedCount: 0,
        requiredCount: 0,
        totalKeepers: 0,
      }
    }

    const percentage = calculateSignatureProgress(data.signedCount, data.requiredCount)
    const thresholdMet = isThresholdMet(data.signedCount, data.requiredCount)

    return {
      percentage,
      thresholdMet,
      signedCount: data.signedCount,
      requiredCount: data.requiredCount,
      totalKeepers: data.totalKeepers,
    }
  }, [data])

  // Don't render if no data or loading
  if (!enabled) {
    return null
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <div className={`font-mono ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="text-muted">Loading signatures...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return null // Silently fail - signature tracking may not be available
  }

  // No data - no signature collection in progress
  if (!data) {
    return (
      <div className={`font-mono ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="text-muted">Awaiting resolution...</span>
      </div>
    )
  }

  const statusBadge = getStatusBadge(data.status)
  const progressColor = getProgressColor(progress.percentage, progress.thresholdMet)

  // Compact mode - single line
  if (compact) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className={`px-1.5 py-0.5 rounded ${statusBadge.bgColor} ${statusBadge.textColor}`}>
          {statusBadge.label}
        </span>
        <span className="text-secondary">
          {progress.signedCount}/{progress.requiredCount}
        </span>
        {data.status === 'collecting' && (
          <div className="w-16 h-1.5 bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all duration-500 ease-out`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <div className="border border rounded-lg p-3 bg-surface font-mono">
      {/* Header with status badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted uppercase">Resolution Signatures</span>
        <span className={`px-2 py-1 rounded text-xs ${statusBadge.bgColor} ${statusBadge.textColor}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500 ease-out`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Progress text */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-primary">
          {progress.signedCount}/{progress.totalKeepers} keepers signed
        </span>
        <span className={progress.thresholdMet ? 'text-green' : 'text-muted'}>
          Need {progress.requiredCount} (51%)
        </span>
      </div>

      {/* Submitted transaction link */}
      {data.status === 'submitted' && data.txHash && (
        <div className="mt-2 pt-2 border-t border">
          <span className="text-xs text-muted">Tx: </span>
          <span className="text-xs text-accent">
            {data.txHash.slice(0, 10)}...{data.txHash.slice(-8)}
          </span>
        </div>
      )}
    </div>
  )
}
