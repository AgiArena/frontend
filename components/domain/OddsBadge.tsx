'use client'

import { Tooltip } from '@/components/ui/Tooltip'

export type OddsFavorability = 'favorable' | 'even' | 'unfavorable'

interface OddsBadgeProps {
  /** The odds display string (e.g., "2.00x") */
  display: string
  /** Favorability level determines color */
  favorability: OddsFavorability
  /** Optional className for additional styling */
  className?: string
}

/**
 * Color classes based on favorability for matcher
 * Green = favorable to matcher (they get better odds)
 * Yellow = even odds (roughly 1:1)
 * Red = unfavorable to matcher (creator has advantage)
 */
const favorabilityColors: Record<OddsFavorability, string> = {
  favorable: 'bg-green-muted text-green border-green/20',
  even: 'bg-accent-muted text-accent border-accent-border',
  unfavorable: 'bg-red-loss-muted text-red-loss border-red-loss/20'
}

const favorabilityTooltips: Record<OddsFavorability, string> = {
  favorable: 'Favorable odds for matchers - higher potential return',
  even: 'Even odds - balanced risk/reward',
  unfavorable: 'Unfavorable odds for matchers - lower potential return'
}

/**
 * OddsBadge component
 * Displays odds with color coding based on favorability
 *
 * AC1: Display odds prominently as a badge
 * AC1: Use color coding: green for favorable to matcher, yellow for even, red for unfavorable
 */
export function OddsBadge({ display, favorability, className = '' }: OddsBadgeProps) {
  const colorClass = favorabilityColors[favorability]
  const tooltip = favorabilityTooltips[favorability]

  return (
    <Tooltip content={tooltip}>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold font-data border cursor-help ${colorClass} ${className}`}
        role="status"
        aria-label={`Odds: ${display}, ${favorability} for matchers`}
      >
        {display} Odds
      </span>
    </Tooltip>
  )
}
