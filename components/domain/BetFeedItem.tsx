'use client'

import Link from 'next/link'
import { Tooltip } from '@/components/ui/Tooltip'
import type { RecentBetEvent, BetEventType } from '@/hooks/useRecentBets'
import { truncateAddress } from '@/lib/utils/address'
import { formatRelativeTime } from '@/lib/utils/time'

/**
 * Format USDC amount string for display
 * @param amount - Amount as string (decimal from API)
 * @returns Formatted USD string like "$1,234.56"
 */
function formatAmount(amount: string): string {
  if (!amount) {
    return '$-.--'
  }
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return '$-.--'
  }
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format result (P&L) with sign
 */
function formatResult(result: string | null): string {
  if (!result) return ''
  const num = parseFloat(result)
  if (isNaN(num)) return ''
  const sign = num >= 0 ? '+' : ''
  return `${sign}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format portfolio size with comma separators
 */
function formatPortfolioSize(size: number | undefined | null): string {
  if (size === undefined || size === null) {
    return '0'
  }
  return size.toLocaleString('en-US')
}

/**
 * Get styling classes based on event type
 */
function getEventStyles(eventType: BetEventType): { textColor: string; icon: string } {
  switch (eventType) {
    case 'won':
      return { textColor: 'text-green-400', icon: '' }
    case 'lost':
      return { textColor: 'text-accent', icon: '' }
    case 'matched':
      return { textColor: 'text-white', icon: '' }
    case 'placed':
    default:
      return { textColor: 'text-white', icon: '' }
  }
}

/**
 * Get event description based on type
 */
function getEventDescription(event: RecentBetEvent): string {
  switch (event.eventType) {
    case 'placed':
      return 'placed portfolio bet'
    case 'matched':
      return 'portfolio bet matched'
    case 'won':
      return 'won portfolio bet'
    case 'lost':
      return 'portfolio bet settled'
    default:
      return 'portfolio bet'
  }
}

interface BetFeedItemProps {
  /** The bet event to display */
  event: RecentBetEvent
}

/**
 * MegaPortfolioBadge component
 * AC3: Displays fire emoji prefix and "MEGA" badge text for portfolios >= 20K markets
 */
function MegaPortfolioBadge() {
  return (
    <Tooltip content="Mega Portfolio - Only AI can manage this scale">
      <span className="inline-flex items-center gap-1 text-accent animate-pulse cursor-help" role="img" aria-label="Mega Portfolio">
        <span>🔥</span>
        <span className="text-[10px] font-bold uppercase tracking-wide">MEGA</span>
      </span>
    </Tooltip>
  )
}

/**
 * BetFeedItem component
 * Displays a single bet event in the recent bets feed
 *
 * AC2: Event format - wallet, event type, portfolio size, amount, timestamp, link
 * AC3: Event type variants with distinct styling
 * AC6: Clickable bet ID navigates to /bet/{betId}
 * AC7: Mega Portfolio badge for portfolioSize > 20000
 */
export function BetFeedItem({ event }: BetFeedItemProps) {
  const { textColor } = getEventStyles(event.eventType)
  const description = getEventDescription(event)
  const isMegaPortfolio = event.portfolioSize >= 20000
  const showResult = event.eventType === 'won' || event.eventType === 'lost'

  return (
    <div
      className="px-4 py-3 border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"
      role="listitem"
    >
      {/* Main row: wallet + description */}
      <div className="flex items-center gap-2 mb-1">
        <Link
          href={`/agent/${event.walletAddress}`}
          className="font-mono text-sm text-white/80 hover:text-white transition-colors"
          title={event.walletAddress}
        >
          {truncateAddress(event.walletAddress)}
        </Link>
        <span className={`text-sm ${textColor}`}>
          {description}
        </span>
      </div>

      {/* Secondary row: details */}
      <div className="flex items-center justify-between text-xs text-white/60 font-mono">
        <div className="flex items-center gap-3">
          {/* Result for won/lost - show P&L prominently */}
          {showResult && event.result && (
            <span className={`font-bold ${textColor}`}>
              {formatResult(event.result)}
            </span>
          )}

          {/* Amount - always show for context (AC3 format includes amount) */}
          <span className={showResult ? 'text-white/40' : ''}>
            {formatAmount(event.amount)}
          </span>

          {/* Portfolio size */}
          <span className="flex items-center gap-1">
            {formatPortfolioSize(event.portfolioSize)} markets
            {isMegaPortfolio && <MegaPortfolioBadge />}
          </span>

          {/* Timestamp */}
          <span>{formatRelativeTime(event.timestamp)}</span>
        </div>

        {/* View Details link */}
        <Link
          href={`/bet/${event.betId}`}
          className="text-white/40 hover:text-white transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
