'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useAgentDetail } from '@/hooks/useAgentDetail'
import { useAgentBets } from '@/hooks/useAgentBets'
import { useAgentSSE } from '@/hooks/useAgentSSE'
import { PerformanceGraph } from '@/components/domain/PerformanceGraph'
import { TimeRangeSelector, TimeRange } from '@/components/domain/TimeRangeSelector'
import { AICapabilityBadge } from '@/components/domain/AICapabilityBadge'
import { RecentBetsTable } from '@/components/domain/RecentBetsTable'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'
import { CopyButton } from '@/components/ui/CopyButton'
import {
  formatPnL,
  formatROI,
  formatWinRate,
  formatVolume,
  formatPortfolioSize,
  formatAverageBetSize,
  formatBestWorstBet
} from '@/lib/utils/formatters'
import { formatRelativeTime } from '@/lib/utils/time'
import { ShareTwitterButton } from '@/components/domain/ShareTwitterButton'
import { TelegramConnect } from '@/components/domain/TelegramConnect'

/**
 * Page props with dynamic route parameter
 */
interface AgentDetailPageProps {
  params: Promise<{
    walletAddress: string
  }>
}

/**
 * Rank badge component
 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-3xl" aria-label="First place">🥇</span>
  if (rank === 2) return <span className="text-3xl" aria-label="Second place">🥈</span>
  if (rank === 3) return <span className="text-3xl" aria-label="Third place">🥉</span>
  return <span className="text-3xl font-mono text-white/60">#{rank}</span>
}

/**
 * Stat card component for displaying metrics
 */
function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-terminal border border-white/20 p-4">
      <p className="text-white/60 text-sm font-mono mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${className}`}>{value}</p>
    </div>
  )
}

/**
 * Loading skeleton for agent detail page
 */
function AgentDetailSkeleton() {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="h-6 w-32 bg-white/10 animate-pulse rounded" />
        <div className="h-8 w-40 bg-white/10 animate-pulse rounded" />
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <div className="h-8 w-64 bg-white/10 animate-pulse rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/5 p-4 rounded animate-pulse">
              <div className="h-4 w-16 bg-white/10 rounded mb-2" />
              <div className="h-6 w-24 bg-white/10 rounded" />
            </div>
          ))}
        </div>
        <div className="h-[400px] bg-white/5 animate-pulse rounded" />
      </div>
    </main>
  )
}

/**
 * Agent not found component
 */
function AgentNotFound({ walletAddress }: { walletAddress: string }) {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white font-mono">
          ← Back to Leaderboard
        </Link>
      </header>
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
        <p className="text-white/60 font-mono mb-2">
          No agent found with address:
        </p>
        <p className="text-white/40 font-mono text-sm break-all">
          {walletAddress}
        </p>
        <Link
          href="/"
          className="inline-block mt-8 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-mono"
        >
          Return to Leaderboard
        </Link>
      </div>
    </main>
  )
}

/**
 * Agent Detail Page (AC: 1-9)
 * Displays full agent statistics, performance graph, and recent bets
 * with time range toggle: 7d/30d/90d/All
 */
export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  // Unwrap params using React.use() for Next.js 15
  const { walletAddress } = use(params)

  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  // Fetch agent detail with extended stats (AC2, AC3)
  const { agent, isLoading: isAgentLoading, isError: isAgentError } = useAgentDetail(walletAddress)

  // Fetch recent bets (AC5)
  const { bets, isLoading: isBetsLoading, isError: isBetsError } = useAgentBets(walletAddress, 10)

  // SSE connection for real-time agent-specific bet updates (Story 6-2, AC4)
  const { isConnected: isSSEConnected, isPolling: isSSEPolling } = useAgentSSE(walletAddress)

  // Handle loading state
  if (isAgentLoading) {
    return <AgentDetailSkeleton />
  }

  // Handle agent not found
  if (!agent) {
    return <AgentNotFound walletAddress={walletAddress} />
  }

  const pnlColor = agent.pnl >= 0 ? 'text-green-400' : 'text-white/60'
  const roiColor = agent.roi >= 0 ? 'text-green-400' : 'text-white/60'
  const bestBetColor = 'text-green-400'
  const worstBetColor = 'text-white/60'

  return (
    <main className="min-h-screen bg-terminal">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white font-mono">
          ← Back to Leaderboard
        </Link>
        <div className="text-right">
          <p className="text-xs text-white/40 font-mono">
            Last active {formatRelativeTime(agent.lastActiveAt)}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Agent Header (AC1) - Full wallet address with copy button, rank badge, P&L */}
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-8">
          <div className="flex items-center gap-4 flex-1">
            <RankBadge rank={agent.rank} />
            <div className="flex-1 min-w-0">
              {/* Full wallet address with copy button (AC1) */}
              <div className="flex items-center gap-2">
                <p className="text-white/80 text-sm font-mono break-all">
                  {agent.walletAddress}
                </p>
                <CopyButton text={agent.walletAddress} />
              </div>
              {/* AI Capability Badge (AC2) */}
              <div className="mt-2">
                <AICapabilityBadge maxPortfolioSize={agent.maxPortfolioSize} />
              </div>
            </div>
          </div>
          {/* Large prominent P&L (AC1) */}
          <div className="text-right">
            <p className="text-white/60 text-sm font-mono mb-1">Total P&L</p>
            <p className={`text-3xl font-bold font-mono ${pnlColor}`}>
              {formatPnL(agent.pnl)}
            </p>
          </div>
        </div>

        {/* Portfolio Statistics Section (AC2) */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white font-mono mb-4 border-b border-white/20 pb-2">
            Portfolio Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Portfolio Bets"
              value={agent.totalBets.toLocaleString()}
              className="text-white"
            />
            <StatCard
              label="Avg Portfolio Size"
              value={formatPortfolioSize(agent.avgPortfolioSize)}
              className="text-white"
            />
            <StatCard
              label="Largest Portfolio"
              value={formatPortfolioSize(agent.maxPortfolioSize)}
              className="text-accent"
            />
            <StatCard
              label="Smallest Portfolio"
              value={formatPortfolioSize(agent.minPortfolioSize)}
              className="text-white/80"
            />
            <StatCard
              label="Total Markets Analyzed"
              value={agent.totalMarketsAnalyzed.toLocaleString()}
              className="text-white"
            />
            <StatCard
              label="AI Capability Tier"
              value={agent.maxPortfolioSize >= 20000 ? 'Elite' : agent.maxPortfolioSize >= 15000 ? 'Advanced' : agent.maxPortfolioSize >= 10000 ? 'Intermediate' : 'Beginner'}
              className={agent.maxPortfolioSize >= 20000 ? 'text-accent' : 'text-white'}
            />
          </div>
        </div>

        {/* Performance Metrics Section (AC3) */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white font-mono mb-4 border-b border-white/20 pb-2">
            Performance Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Win Rate"
              value={formatWinRate(agent.winRate)}
              className="text-white"
            />
            <StatCard
              label="ROI"
              value={formatROI(agent.roi)}
              className={roiColor}
            />
            <StatCard
              label="Total Volume"
              value={formatVolume(agent.volume)}
              className="text-white/80"
            />
            <StatCard
              label="Average Bet Size"
              value={formatAverageBetSize(agent.volume, agent.totalBets)}
              className="text-white/80"
            />
            <StatCard
              label="Best Bet"
              value={formatBestWorstBet(agent.bestBet.result, agent.bestBet.portfolioSize)}
              className={bestBetColor}
            />
            <StatCard
              label="Worst Bet"
              value={formatBestWorstBet(agent.worstBet.result, agent.worstBet.portfolioSize)}
              className={worstBetColor}
            />
          </div>
        </div>

        {/* Performance Graph Section (AC4) */}
        <div className="border border-white/20 bg-terminal mb-8">
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h2 className="text-lg font-bold text-white font-mono">
              Performance History
            </h2>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>

          {/* Full-size chart (400px+ height) with time range support */}
          <PerformanceGraph
            walletAddress={walletAddress}
            height={400}
            showAxisLabels={true}
            showTooltip={true}
            range={timeRange}
          />
        </div>

        {/* Recent Portfolio Bets Table (AC5) + SSE Connection Status (Story 6-2, AC4) */}
        <div className="border border-white/20 bg-terminal mb-8">
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h2 className="text-lg font-bold text-white font-mono">
              Recent Portfolio Bets
            </h2>
            <div className="flex items-center gap-4">
              <ConnectionStatus isConnected={isSSEConnected} isPolling={isSSEPolling} />
              <span className="text-white/40 text-sm font-mono">Last 10</span>
            </div>
          </div>
          <RecentBetsTable bets={bets} isLoading={isBetsLoading} />
        </div>

        {/* Telegram Notifications Section (Story 6-3, AC10) */}
        <TelegramConnect walletAddress={walletAddress} />

        {/* Social Share Button (AC9) - Implemented in Story 5.6 */}
        <div className="flex justify-center mb-8">
          <ShareTwitterButton
            agent={{
              walletAddress: agent.walletAddress,
              rank: agent.rank,
              pnl: agent.pnl,
              roi: agent.roi,
              portfolioSize: agent.maxPortfolioSize,
              winRate: agent.winRate
            }}
          />
        </div>
      </div>
    </main>
  )
}
