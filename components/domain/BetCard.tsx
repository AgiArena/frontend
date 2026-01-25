'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OddsBadge } from './OddsBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import { type Bet, calculateOddsDisplay, formatImpliedProbability } from '@/lib/types/bet'

interface BetCardProps {
  /** The bet to display */
  bet: Bet
  /** Optional className for container */
  className?: string
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

/**
 * Get status color class
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-400'
    case 'partially_matched':
      return 'text-blue-400'
    case 'fully_matched':
      return 'text-green-400'
    case 'resolved':
      return 'text-purple-400'
    case 'settled':
      return 'text-cyan-400'
    case 'cancelled':
      return 'text-red-400'
    default:
      return 'text-white/60'
  }
}

/**
 * BetCard component
 * Displays a bet with full odds information
 *
 * AC1: Display odds prominently as badge with color coding
 * AC2: Show creator and matcher stakes, remaining for partial fills
 * AC3: Fill progress bar with percentage
 * AC4: Payout information with return multipliers
 * AC5: Implied probability (collapsible)
 * AC6: Read-only notice - no action buttons
 */
export function BetCard({ bet, className = '' }: BetCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const odds = calculateOddsDisplay(bet)

  return (
    <div className={`border border-gray-700 rounded-lg p-4 bg-black/50 ${className}`}>
      {/* Header with odds badge and status */}
      <div className="flex justify-between items-center mb-4">
        <OddsBadge display={odds.display} favorability={odds.favorability} />
        <span className={`text-xs font-mono ${getStatusColor(bet.status)}`}>
          {formatStatus(bet.status)}
        </span>
      </div>

      {/* Stake information (AC2) */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <div className="text-gray-400 text-xs uppercase font-mono mb-1">Creator Staked</div>
          <div className="font-mono text-white">{odds.creatorRisk}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs uppercase font-mono mb-1">Required Match</div>
          <div className="font-mono text-white">{odds.matcherRisk}</div>
        </div>
      </div>

      {/* Fill progress bar (AC3) */}
      <div className="mb-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, odds.fillPercent)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 font-mono">
          <span>{odds.fillPercent.toFixed(1)}% matched</span>
          <span>{odds.remaining} remaining</span>
        </div>
      </div>

      {/* Payout info (AC4) */}
      <div className="bg-gray-900/60 p-3 rounded border border-gray-800 mb-4">
        <div className="text-gray-400 text-xs uppercase font-mono mb-2">Payout Info</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Total Pot:</span>
            <span className="text-white">{odds.totalPot}</span>
          </div>
          <div className="flex justify-between font-mono">
            <Tooltip content="Return multiplier if creator wins">
              <span className="text-gray-400 cursor-help">Creator Return:</span>
            </Tooltip>
            <span className="text-green-400">{odds.creatorReturn}</span>
          </div>
          <div className="flex justify-between font-mono">
            <Tooltip content="Return multiplier if matcher wins">
              <span className="text-gray-400 cursor-help">Matcher Return:</span>
            </Tooltip>
            <span className="text-green-400">{odds.matcherReturn}</span>
          </div>
        </div>
      </div>

      {/* Implied probability toggle (AC5) */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 font-mono"
      >
        {showAdvanced ? '▼ Hide' : '▶ Show'} implied probability
      </button>

      {showAdvanced && (
        <div className="bg-gray-900/40 p-3 rounded border border-gray-800 mb-4 text-sm">
          <div className="flex justify-between font-mono">
            <Tooltip content="Probability implied by the odds that creator wins">
              <span className="text-gray-400 cursor-help">Creator implied:</span>
            </Tooltip>
            <span className="text-white">{formatImpliedProbability(odds.impliedProbability)}</span>
          </div>
          <div className="flex justify-between font-mono mt-1">
            <Tooltip content="Probability implied by the odds that matcher wins">
              <span className="text-gray-400 cursor-help">Matcher implied:</span>
            </Tooltip>
            <span className="text-white">{formatImpliedProbability(1 - odds.impliedProbability)}</span>
          </div>
        </div>
      )}

      {/* Portfolio size - default to 5 when not yet synced */}
      <div className="text-xs text-gray-500 font-mono mb-3">
        Portfolio: {(bet.portfolioSize || 5).toLocaleString()} markets
      </div>

      {/* View details link */}
      <div className="flex justify-between items-center">
        <Link
          href={`/bet/${bet.betId}`}
          className="text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-colors"
        >
          View Details →
        </Link>

        {/* Read-only notice (AC6) */}
        <span className="text-[10px] text-gray-600 italic">
          Bets placed by AI agents
        </span>
      </div>
    </div>
  )
}
