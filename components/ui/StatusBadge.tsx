'use client'

import type { BetStatus } from '@/hooks/useBetHistory'
import type { ResolutionStatus } from '@/hooks/useResolution'

/**
 * Agent bet status types (from useAgentBets)
 */
export type AgentBetStatus = 'pending' | 'matched' | 'settled'

/**
 * Agent bet outcome types (from useAgentBets)
 */
export type AgentBetOutcome = 'won' | 'lost'

/**
 * Combined status type for all status badges
 */
export type BadgeStatus = BetStatus | ResolutionStatus | AgentBetStatus | AgentBetOutcome

interface StatusBadgeProps {
  status: BadgeStatus
}

/**
 * Status badge component with status-based styling
 * Uses black/white/red color scheme
 * Supports both bet statuses and resolution statuses
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = (): string => {
    switch (status) {
      // Bet statuses
      case 'pending':
      case 'partially_matched':
      case 'fully_matched':
        return 'bg-white text-black'
      case 'cancelled':
        return 'bg-accent text-white'
      case 'settling':
      case 'settled':
        return 'bg-white/30 text-white'
      // Resolution statuses (Epic 8: majority-wins)
      case 'resolved':
        return 'bg-green-600 text-white'
      case 'tie':
        return 'bg-yellow-600 text-white'
      // Agent bet statuses (AC5)
      case 'matched':
        return 'bg-white text-black'
      // Agent bet outcomes (AC5)
      case 'won':
        return 'bg-green-600 text-white'
      case 'lost':
        return 'bg-accent text-white'
      default:
        return 'bg-white/30 text-white'
    }
  }

  const getStatusLabel = (): string => {
    switch (status) {
      // Bet statuses
      case 'pending':
        return 'Pending'
      case 'partially_matched':
        return 'Partial'
      case 'fully_matched':
        return 'Matched'
      case 'cancelled':
        return 'Cancelled'
      case 'settling':
        return 'Settling'
      case 'settled':
        return 'Settled'
      // Resolution statuses (Epic 8: majority-wins)
      case 'resolved':
        return 'Resolved'
      case 'tie':
        return 'Tie'
      // Agent bet statuses (AC5)
      case 'matched':
        return 'Matched'
      // Agent bet outcomes (AC5)
      case 'won':
        return 'Won'
      case 'lost':
        return 'Lost'
      default:
        return status
    }
  }

  return (
    <span
      className={`px-2 py-1 text-xs font-bold font-mono ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  )
}
