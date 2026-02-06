'use client'

import type { BetStatus } from '@/hooks/useBetHistory'

/**
 * Resolution status types (defined locally after legacy hook removal)
 */
export type ResolutionStatus = 'pending' | 'resolving' | 'resolved' | 'tie'

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

/**
 * Status configuration — pill badges with semantic colors
 */
const STATUS_CONFIG: Record<string, { icon: string; label: string; badgeClass: string }> = {
  // Bet statuses
  pending: { icon: '○', label: 'Awaiting match', badgeClass: 'bg-accent-muted text-accent border-accent-border' },
  matched: { icon: '●', label: 'Position active', badgeClass: 'bg-accent-muted text-accent border-accent-border' },
  settling: { icon: '◐', label: 'Keepers voting', badgeClass: 'bg-surface text-secondary border' },
  settled: { icon: '●', label: 'Settled', badgeClass: 'bg-surface text-secondary border' },
  early_exit: { icon: '⊗', label: 'Early exit', badgeClass: 'bg-surface text-secondary border' },
  // Resolution statuses
  resolved: { icon: '✓', label: 'Resolved', badgeClass: 'bg-green-muted text-green border-green/20' },
  resolving: { icon: '◐', label: 'Keepers voting', badgeClass: 'bg-surface text-secondary border' },
  tie: { icon: '≈', label: 'Tie', badgeClass: 'bg-surface text-secondary border' },
  // Agent bet outcomes
  won: { icon: '✓', label: 'Won', badgeClass: 'bg-green-muted text-green border-green/20' },
  lost: { icon: '✗', label: 'Lost', badgeClass: 'bg-red-loss-muted text-red-loss border-red-loss/20' },
}

interface StatusBadgeProps {
  status: BadgeStatus
  /** Optional P&L to display inline for won/lost statuses */
  pnl?: number
  /** Size variant */
  size?: 'sm' | 'md'
}

/**
 * Status badge — pill style with semantic colors
 */
export function StatusBadge({ status, pnl, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { icon: '?', label: status, badgeClass: 'bg-surface text-secondary border' }

  const formatPnL = (amount: number): string => {
    const sign = amount >= 0 ? '+' : ''
    return `${sign}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  let displayLabel = config.label
  if (pnl !== undefined && (status === 'won' || status === 'lost')) {
    displayLabel = `${config.label} ${formatPnL(pnl)}`
  }

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 font-data font-medium rounded-full border ${config.badgeClass} ${sizeClasses}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{displayLabel}</span>
    </span>
  )
}

/**
 * StatusBadgeOld - Legacy badge style (kept for backward compatibility)
 */
export function StatusBadgeOld({ status }: { status: BadgeStatus }) {
  const getStatusStyles = (): string => {
    switch (status) {
      case 'pending':
        return 'bg-accent-muted text-accent border-accent-border'
      case 'matched':
        return 'bg-accent-muted text-accent border-accent-border'
      case 'settling':
      case 'settled':
        return 'bg-surface text-secondary border'
      case 'resolved':
      case 'won':
        return 'bg-green-muted text-green border-green/20'
      case 'tie':
        return 'bg-surface text-secondary border'
      case 'lost':
        return 'bg-red-loss-muted text-red-loss border-red-loss/20'
      default:
        return 'bg-surface text-secondary border'
    }
  }

  const getStatusLabel = (): string => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'matched': return 'Matched'
      case 'settling': return 'Settling'
      case 'settled': return 'Settled'
      case 'resolved': return 'Resolved'
      case 'tie': return 'Tie'
      case 'won': return 'Won'
      case 'lost': return 'Lost'
      default: return status
    }
  }

  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-data font-medium rounded-full border ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  )
}
