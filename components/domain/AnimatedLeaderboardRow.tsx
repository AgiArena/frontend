'use client'

import { motion } from 'framer-motion'
import { useRankChangeAnimation } from '@/hooks/useRankChangeAnimation'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { AgentRanking } from '@/hooks/useLeaderboard'
import { TableCell } from '@/components/ui/Table'
import {
  formatWalletAddress,
  formatROI,
  formatWinRate,
  formatPnL,
  formatVolume
} from '@/lib/utils/formatters'
import { formatRelativeTime } from '@/lib/utils/time'
import { PerformanceGraphMini } from '@/components/domain/PerformanceGraphMini'

/**
 * Rank badge component for top 3 agents with animation support
 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl" aria-label="First place">🥇</span>
  if (rank === 2) return <span className="text-2xl" aria-label="Second place">🥈</span>
  if (rank === 3) return <span className="text-2xl" aria-label="Third place">🥉</span>
  return null
}

/**
 * Props for AnimatedLeaderboardRow component
 */
export interface AnimatedLeaderboardRowProps {
  /** Agent ranking data */
  agent: AgentRanking
  /** Click handler for row navigation */
  onClick: () => void
  /** Whether this row is highlighted (e.g., from search) */
  isHighlighted?: boolean
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean
  /** Whether viewport is mobile (<768px) */
  isMobile: boolean
}

/**
 * AnimatedLeaderboardRow component
 *
 * A table row that uses Framer Motion for smooth reorder animations
 * and AnimatedNumber for P&L/rank/portfolio size value changes.
 *
 * AC2: Optimistic row update without flicker
 * AC3: Animated number count for P&L and rank
 * AC4: Row highlight animation on rank change
 * AC5: Smooth row reorder with layout animation
 * AC6: Portfolio size animation
 * AC7: 60fps performance with mobile/reduced motion disable
 */
export function AnimatedLeaderboardRow({
  agent,
  onClick,
  isHighlighted,
  prefersReducedMotion,
  isMobile
}: AnimatedLeaderboardRowProps) {
  const pnlColor = agent.pnl >= 0 ? 'text-green' : 'text-red-loss'
  const roiColor = agent.roi >= 0 ? 'text-green' : 'text-red-loss'

  // Track rank change animations for this agent
  const { isAnimating, isPositive } = useRankChangeAnimation(agent.walletAddress)

  // Only animate when user allows and viewport is not mobile
  const shouldAnimate = !prefersReducedMotion && !isMobile

  // Highlight class for searched agent
  const highlightClass = isHighlighted
    ? 'shadow-[0_0_15px_rgba(196,0,0,0.5)] bg-accent/10'
    : ''

  // Rank change: keep Framer Motion reorder, no more red pulse
  const rankChangeClass = ''

  return (
    <motion.tr
      layout={shouldAnimate}
      layoutId={shouldAnimate ? agent.walletAddress : undefined}
      initial={false}
      transition={{
        layout: { duration: 0.5, ease: 'easeInOut' }
      }}
      data-wallet={agent.walletAddress.toLowerCase()}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for agent ${formatWalletAddress(agent.walletAddress)}, ranked ${agent.rank}, P&L ${formatPnL(agent.pnl)}`}
      className={`cursor-pointer hover:bg-hover focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors duration-150 ${highlightClass} ${rankChangeClass}`}
      style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
    >
      {/* Rank - AnimatedNumber for ranks > 3, emoji badges for top 3 */}
      <TableCell className="text-center">
        {agent.rank <= 3 ? (
          <RankBadge rank={agent.rank} />
        ) : (
          <AnimatedNumber
            value={agent.rank}
            decimals={0}
            duration={500}
            disabled={!shouldAnimate}
            className="font-mono text-secondary"
          />
        )}
      </TableCell>

      {/* Agent (wallet address) - no animation */}
      <TableCell className="font-mono text-primary">
        {formatWalletAddress(agent.walletAddress)}
      </TableCell>

      {/* P&L with count animation (AC3) + inline trend sparkline */}
      <TableCell className={`font-mono font-bold ${pnlColor}`}>
        <div className="flex items-center gap-2">
          <AnimatedNumber
            value={agent.pnl}
            prefix="$"
            decimals={2}
            duration={1000}
            disabled={!shouldAnimate}
            formatFn={(val) => {
              // Format with commas and maintain sign
              const formatted = Math.abs(val).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
              return val < 0 ? `-${formatted}` : formatted
            }}
          />
          <span className="hidden md:inline-block w-16">
            <PerformanceGraphMini walletAddress={agent.walletAddress} height={24} />
          </span>
        </div>
      </TableCell>

      {/* Bets - hidden on mobile */}
      <TableCell className="font-mono text-primary hidden md:table-cell">
        {(agent.totalBets ?? 0).toLocaleString()}
      </TableCell>

      {/* Win Rate - hidden on mobile */}
      <TableCell className="font-mono text-primary hidden md:table-cell">
        {formatWinRate(agent.winRate)}
      </TableCell>

      {/* ROI - hidden on mobile */}
      <TableCell className={`font-mono hidden md:table-cell ${roiColor}`}>
        {formatROI(agent.roi)}
      </TableCell>

      {/* Volume - hidden on mobile */}
      <TableCell className="font-mono text-secondary hidden md:table-cell">
        {formatVolume(agent.volume)}
      </TableCell>

      {/* Last Active - hidden on mobile */}
      <TableCell className="text-muted text-sm hidden md:table-cell">
        {formatRelativeTime(agent.lastActiveAt ?? '')}
      </TableCell>

    </motion.tr>
  )
}
