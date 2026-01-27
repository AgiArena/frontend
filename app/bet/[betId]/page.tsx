'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  FAVORABLE_ODDS_THRESHOLD,
  UNFAVORABLE_ODDS_THRESHOLD,
  DEFAULT_ODDS_BPS,
  PortfolioPositionWithPrices,
  PortfolioResponse,
  calculatePriceChange,
  formatPrice,
  formatPriceChange
} from '@/lib/types/bet'

interface BetDetailPageProps {
  params: Promise<{ betId: string }>
}

interface BetFill {
  fillerAddress: string
  fillAmount: string
  txHash: string
  blockNumber: number
  filledAt: string
}

interface BetTrade {
  tradeId: string
  ticker: string
  source: string
  method: string
  position: string
  entryPrice: string
  exitPrice?: string
  won?: boolean
  cancelled: boolean
}

interface BetTradesResponse {
  betId: string
  tradeCount: number
  trades: BetTrade[]
  pagination: { page: number; limit: number; total: number; hasMore: boolean }
}

interface BetData {
  betId: string
  creatorAddress: string
  betHash: string
  portfolioSize: number
  tradeCount?: number
  amount: string
  matchedAmount: string
  /** Required match amount - defaults to amount if not provided (1:1 odds) */
  requiredMatch?: string
  /** Odds in basis points: 10000 = 1.00x, 20000 = 2.00x */
  oddsBps?: number
  status: string
  txHash: string
  blockNumber: number
  createdAt: string
  updatedAt: string
  resolutionDeadline?: string
  /** Fills/counterparties for this bet */
  fills?: BetFill[]
  portfolioJson?: {
    expiry?: string
    portfolioSize?: number
    // Backend stores as 'positions', support both for compatibility
    positions?: Array<{
      marketId: string
      position: number | string  // 0=NO, 1=YES or "YES"/"NO"
      weight?: number
    }>
    markets?: Array<{
      conditionId: string
      position: string
      weight?: number
    }>
  }
}

function formatAddress(address: string | undefined | null): string {
  if (!address) return '-'
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '$0.00'
  return `$${num.toFixed(2)}`
}

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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Match'
    case 'partially_matched':
      return 'Partially Matched'
    case 'fully_matched':
      return 'Fully Matched - Awaiting Resolution'
    case 'resolved':
      return 'Resolved - Awaiting Settlement'
    case 'settled':
      return 'Settled'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

/**
 * Get odds display info from bet data
 */
function getOddsInfo(bet: BetData): {
  decimal: number
  display: string
  requiredMatch: string
  totalPot: string
  creatorReturn: string
  matcherReturn: string
  favorability: 'favorable' | 'even' | 'unfavorable'
  impliedProbability: string
} {
  const creatorStake = parseFloat(bet.amount)
  // Use requiredMatch if provided, otherwise fall back to amount (1:1 odds)
  const requiredMatch = bet.requiredMatch ? parseFloat(bet.requiredMatch) : creatorStake
  const oddsBps = bet.oddsBps && bet.oddsBps > 0 ? bet.oddsBps : DEFAULT_ODDS_BPS
  const oddsDecimal = oddsBps / 10000
  const totalPot = creatorStake + requiredMatch

  // Determine favorability using shared constants
  let favorability: 'favorable' | 'even' | 'unfavorable'
  if (oddsDecimal > FAVORABLE_ODDS_THRESHOLD) favorability = 'favorable'
  else if (oddsDecimal < UNFAVORABLE_ODDS_THRESHOLD) favorability = 'unfavorable'
  else favorability = 'even'

  const creatorReturn = creatorStake > 0 ? totalPot / creatorStake : 0
  const matcherReturn = requiredMatch > 0 ? totalPot / requiredMatch : 0
  const impliedProb = oddsDecimal / (oddsDecimal + 1)

  return {
    decimal: oddsDecimal,
    display: `${oddsDecimal.toFixed(2)}x`,
    requiredMatch: `$${requiredMatch.toFixed(2)}`,
    totalPot: `$${totalPot.toFixed(2)}`,
    creatorReturn: `${creatorReturn.toFixed(2)}x`,
    matcherReturn: `${matcherReturn.toFixed(2)}x`,
    favorability,
    impliedProbability: `${(impliedProb * 100).toFixed(0)}%`
  }
}

/**
 * Get badge color based on favorability
 */
function getOddsBadgeColor(favorability: 'favorable' | 'even' | 'unfavorable'): string {
  switch (favorability) {
    case 'favorable':
      return 'bg-green-900/80 text-green-300 border-green-700'
    case 'even':
      return 'bg-yellow-900/80 text-yellow-300 border-yellow-700'
    case 'unfavorable':
      return 'bg-red-900/80 text-red-300 border-red-700'
  }
}

/**
 * Loading skeleton for bet detail page
 */
function BetDetailSkeleton() {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="h-6 w-32 bg-white/10 animate-pulse rounded" />
        <div className="h-8 w-40 bg-white/10 animate-pulse rounded" />
        <div className="w-20" />
      </header>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white/5 p-6 rounded animate-pulse">
          <div className="h-6 w-32 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                <div className="h-6 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Bet not found component
 */
function BetNotFound({ betId }: { betId: string }) {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white font-mono">
          ← Back to Home
        </Link>
      </header>
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Bet Not Found</h1>
        <p className="text-white/60 font-mono mb-2">
          No bet found with ID: {betId}
        </p>
        <Link
          href="/"
          className="inline-block mt-8 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-mono"
        >
          Return to Home
        </Link>
      </div>
    </main>
  )
}

/**
 * Bet Detail Page
 *
 * Shows full bet details including:
 * - Portfolio positions and market details
 * - Bet amount and matched status
 * - Transaction history
 */
export default function BetDetailPage({ params }: BetDetailPageProps) {
  const { betId } = use(params)
  const [bet, setBet] = useState<BetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketNames, setMarketNames] = useState<Record<string, string>>({})
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPositionWithPrices[]>([])
  const [isLoadingPositions, setIsLoadingPositions] = useState(false)
  const [trades, setTrades] = useState<BetTrade[]>([])
  const [tradeCount, setTradeCount] = useState(0)
  const [isLoadingTrades, setIsLoadingTrades] = useState(false)

  useEffect(() => {
    async function fetchBet() {
      try {
        setIsLoading(true)
        // Use relative URL to go through Vercel's proxy rewrite
        const res = await fetch(`/api/bets/${betId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setBet(null)
          } else {
            throw new Error(`Failed to fetch bet: ${res.statusText}`)
          }
        } else {
          const data = await res.json()
          setBet(data)
        }
      } catch (err) {
        console.error('Error fetching bet:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBet()
  }, [betId])

  // Fetch portfolio positions with prices from new endpoint
  useEffect(() => {
    if (!bet) return

    async function fetchPortfolioPositions() {
      setIsLoadingPositions(true)
      try {
        const res = await fetch(`/api/bets/${betId}/portfolio?limit=1000`)
        if (res.ok) {
          const data: PortfolioResponse = await res.json()
          const positionsArray = data.positions ?? []
          setPortfolioPositions(positionsArray)

          // Also fetch market names for these positions
          const names: Record<string, string> = {}
          await Promise.all(
            positionsArray.slice(0, 50).map(async (pos) => { // Limit to first 50 for performance
              try {
                const marketRes = await fetch(`/api/markets/${pos.marketId}`)
                if (marketRes.ok) {
                  const marketData = await marketRes.json()
                  names[pos.marketId] = marketData.market?.question || pos.marketId
                }
              } catch {
                names[pos.marketId] = pos.marketId
              }
            })
          )
          setMarketNames(names)
        }
      } catch (err) {
        console.error('Error fetching portfolio positions:', err)
      } finally {
        setIsLoadingPositions(false)
      }
    }

    fetchPortfolioPositions()
  }, [bet, betId])

  // Fallback: Fetch market names from portfolioJson if portfolio endpoint returns empty
  useEffect(() => {
    const positions = bet?.portfolioJson?.positions
    const markets = bet?.portfolioJson?.markets
    if (!positions && !markets) return
    if (portfolioPositions.length > 0) return // Already have positions with prices

    async function fetchMarketNames() {
      const names: Record<string, string> = {}

      // Get market IDs from either format
      const marketIds = positions
        ? positions.map(p => p.marketId)
        : (markets ?? []).map(m => m.conditionId)

      // Fetch market names in parallel
      await Promise.all(
        (marketIds ?? []).slice(0, 50).map(async (marketId) => { // Limit for performance
          try {
            const res = await fetch(`/api/markets/${marketId}`)
            if (res.ok) {
              const data = await res.json()
              names[marketId] = data.market?.question || marketId
            }
          } catch {
            // Fall back to marketId if fetch fails
            names[marketId] = marketId
          }
        })
      )

      setMarketNames(names)
    }

    fetchMarketNames()
  }, [bet, portfolioPositions.length])

  // Fetch individual trades (sub-bets) for this bet
  useEffect(() => {
    if (!bet) return

    async function fetchTrades() {
      setIsLoadingTrades(true)
      try {
        const res = await fetch(`/api/bets/${betId}/trades?limit=1000`)
        if (res.ok) {
          const data: BetTradesResponse = await res.json()
          setTrades(data.trades ?? [])
          setTradeCount(data.tradeCount ?? 0)
        }
      } catch (err) {
        console.error('Error fetching trades:', err)
      } finally {
        setIsLoadingTrades(false)
      }
    }

    fetchTrades()
  }, [bet, betId])

  if (isLoading) {
    return <BetDetailSkeleton />
  }

  if (error || !bet) {
    return <BetNotFound betId={betId} />
  }

  // Calculate match percentage based on required match (not creator stake)
  const requiredMatchNum = bet.requiredMatch ? parseFloat(bet.requiredMatch) : parseFloat(bet.amount)
  const matchPercentage = requiredMatchNum !== 0
    ? (parseFloat(bet.matchedAmount) / requiredMatchNum * 100).toFixed(0)
    : '0'

  const odds = getOddsInfo(bet)

  return (
    <main className="min-h-screen bg-terminal">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white transition-colors font-mono text-sm">
          ← Back to Home
        </Link>
        <h1 className="text-xl font-bold text-white font-mono">Bet Details</h1>
        <div className="w-20" />
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Main Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CardTitle className="font-mono">Bet #{bet.betId}</CardTitle>
                {/* Odds Badge (AC1) */}
                <span className={`px-3 py-1 rounded text-sm font-bold font-mono border ${getOddsBadgeColor(odds.favorability)}`}>
                  {odds.display} Odds
                </span>
              </div>
              <span className={`font-mono text-sm ${getStatusColor(bet.status)}`}>
                {getStatusLabel(bet.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stake Info (AC2) */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Creator Staked</p>
                <p className="text-white font-mono text-lg">{formatAmount(bet.amount)}</p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Required Match</p>
                <p className="text-white font-mono text-lg">{odds.requiredMatch}</p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Matched</p>
                <p className="text-white font-mono text-lg">
                  {formatAmount(bet.matchedAmount)}
                  <span className="text-white/40 text-sm ml-2">({matchPercentage}%)</span>
                </p>
              </div>
            </div>

            {/* Fill Progress Bar (AC3) */}
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${matchPercentage}%` }}
              />
            </div>
            <p className="text-white/40 font-mono text-xs text-right">
              {matchPercentage}% matched
            </p>

            {/* Creator */}
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Creator</p>
              <Link
                href={`/agent/${bet.creatorAddress}`}
                className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
              >
                {formatAddress(bet.creatorAddress)}
              </Link>
            </div>

            {/* Payout Info (AC4) */}
            <div className="bg-white/5 p-4 rounded border border-white/10">
              <p className="text-white/40 font-mono text-xs uppercase mb-3">Payout Info</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-white/40 font-mono text-xs">Total Pot</p>
                  <p className="text-white font-mono">{odds.totalPot}</p>
                </div>
                <div>
                  <p className="text-white/40 font-mono text-xs">Creator Return</p>
                  <p className="text-green-400 font-mono">{odds.creatorReturn}</p>
                </div>
                <div>
                  <p className="text-white/40 font-mono text-xs">Matcher Return</p>
                  <p className="text-green-400 font-mono">{odds.matcherReturn}</p>
                </div>
              </div>
            </div>

            {/* Implied Probability (AC5) */}
            <div className="bg-white/5 p-3 rounded border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/40 font-mono text-xs">Creator implied probability:</span>
                <span className="text-white font-mono text-sm">{odds.impliedProbability}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Created</p>
                <p className="text-white/80 font-mono">
                  {new Date(bet.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Resolution Date</p>
                <p className="text-white/80 font-mono">
                  {bet.resolutionDeadline
                    ? new Date(bet.resolutionDeadline).toLocaleString()
                    : 'Not set'}
                </p>
              </div>
            </div>

            {/* Counterparties / Fills */}
            {bet.fills && bet.fills.length > 0 && (
              <div className="bg-white/5 p-4 rounded border border-white/10">
                <p className="text-white/40 font-mono text-xs uppercase mb-3">
                  Counterparties ({bet.fills.length})
                </p>
                <div className="space-y-2">
                  {bet.fills.map((fill, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-white/5 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/agent/${fill.fillerAddress}`}
                          className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                        >
                          {formatAddress(fill.fillerAddress)}
                        </Link>
                        <span className="text-white/40 font-mono text-xs">
                          {new Date(fill.filledAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-mono text-sm">
                          {formatAmount(fill.fillAmount)}
                        </span>
                        <a
                          href={`https://basescan.org/tx/${fill.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-white/60 font-mono text-xs"
                        >
                          tx↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Read-only notice (AC6) */}
            <p className="text-[11px] text-white/30 italic text-center pt-2 border-t border-white/10">
              Bets are placed by AI agents, not via this UI
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Card - with entry and current prices */}
        {(portfolioPositions.length > 0 || bet.portfolioJson?.positions?.length || bet.portfolioJson?.markets?.length) && (
          <Card className="border-white/20">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-lg">Portfolio Positions</CardTitle>
                {isLoadingPositions && (
                  <span className="text-white/40 font-mono text-xs animate-pulse">Loading prices...</span>
                )}
              </div>
              {bet.portfolioJson?.expiry && (
                <p className="text-white/40 font-mono text-xs">
                  Expiry: {new Date(bet.portfolioJson.expiry).toLocaleString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {/* Column headers */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/20 text-xs text-white/40 font-mono mb-2">
                <span className="flex-1">Market</span>
                <div className="flex items-center gap-3 text-right">
                  <span className="w-14">Position</span>
                  <span className="w-16">Entry</span>
                  <span className="w-16">Current</span>
                  <span className="w-16">Change</span>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Use portfolio positions with prices if available */}
                {portfolioPositions.length > 0 ? (
                  portfolioPositions.map((pos, index) => {
                    const marketName = marketNames[pos.marketId] || pos.marketId
                    const priceChange = calculatePriceChange(pos)
                    const changeColor = priceChange.direction === 'up' ? 'text-green-400'
                      : priceChange.direction === 'down' ? 'text-red-400'
                      : 'text-white/40'

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-white font-mono text-sm truncate" title={marketName}>
                            {marketName}
                          </p>
                          {pos.isClosed && (
                            <span className="text-xs text-purple-400 font-mono">Resolved</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                          <span className={`font-mono text-sm font-bold w-14 ${
                            pos.position === 'YES' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {pos.position}
                          </span>
                          <span className="text-white/60 font-mono text-sm w-16">
                            {formatPrice(pos.startingPrice)}
                          </span>
                          <span className="text-white font-mono text-sm w-16">
                            {formatPrice(pos.currentPrice)}
                          </span>
                          <span className={`font-mono text-sm w-16 ${changeColor}`}>
                            {formatPriceChange(priceChange.change)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  /* Fallback to portfolioJson if positions not loaded */
                  bet.portfolioJson?.positions?.map((pos, index) => {
                    const positionStr = typeof pos.position === 'number'
                      ? (pos.position === 1 ? 'YES' : 'NO')
                      : String(pos.position).toUpperCase()
                    const marketName = marketNames[pos.marketId] || pos.marketId
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-white font-mono text-sm truncate" title={marketName}>
                            {marketName}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                          <span className={`font-mono text-sm font-bold w-14 ${
                            positionStr === 'YES' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {positionStr}
                          </span>
                          <span className="text-white/40 font-mono text-sm w-16">—</span>
                          <span className="text-white/40 font-mono text-sm w-16">—</span>
                          <span className="text-white/40 font-mono text-sm w-16">—</span>
                        </div>
                      </div>
                    )
                  })
                )}
                {/* Fallback to 'markets' format for backwards compatibility */}
                {!portfolioPositions.length && !bet.portfolioJson?.positions && bet.portfolioJson?.markets?.map((market, index) => {
                  const marketName = marketNames[market.conditionId] || market.conditionId
                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-white font-mono text-sm truncate" title={marketName}>
                          {marketName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <span className={`font-mono text-sm font-bold w-14 ${
                          market.position.toUpperCase() === 'YES'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {market.position.toUpperCase()}
                        </span>
                        <span className="text-white/40 font-mono text-sm w-16">—</span>
                        <span className="text-white/40 font-mono text-sm w-16">—</span>
                        <span className="text-white/40 font-mono text-sm w-16">—</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Trades (Sub-Bets) */}
        {(trades.length > 0 || isLoadingTrades) && (
          <Card className="border-white/20">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-lg">
                  Trades ({tradeCount})
                </CardTitle>
                {isLoadingTrades && (
                  <span className="text-white/40 font-mono text-xs animate-pulse">Loading...</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Column headers */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/20 text-xs text-white/40 font-mono mb-2">
                <span className="w-40">Ticker</span>
                <span className="w-20">Source</span>
                <span className="w-14 text-center">Position</span>
                <span className="w-20 text-right">Entry</span>
                <span className="w-20 text-right">Exit</span>
                <span className="w-14 text-center">Result</span>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {trades.map((trade) => {
                  const entryNum = parseFloat(trade.entryPrice)
                  const exitNum = trade.exitPrice ? parseFloat(trade.exitPrice) : null
                  const isCoingecko = trade.source === 'coingecko'
                  const formatTradePrice = (n: number) =>
                    isCoingecko ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${(n * 100).toFixed(1)}%`

                  return (
                    <div
                      key={trade.tradeId}
                      className={`flex items-center justify-between px-3 py-2 rounded text-sm font-mono ${
                        trade.cancelled ? 'bg-white/5 opacity-50' : 'bg-white/5'
                      }`}
                    >
                      <span className="w-40 text-white truncate" title={trade.ticker}>
                        {trade.ticker}
                      </span>
                      <span className="w-20 text-white/50 text-xs">
                        {trade.source}
                      </span>
                      <span className={`w-14 text-center font-bold ${
                        trade.position.toUpperCase() === 'YES' || trade.position === '1'
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.position.toUpperCase() === '1' ? 'YES' : trade.position.toUpperCase() === '0' ? 'NO' : trade.position.toUpperCase()}
                      </span>
                      <span className="w-20 text-right text-white/60">
                        {!isNaN(entryNum) ? formatTradePrice(entryNum) : '—'}
                      </span>
                      <span className="w-20 text-right text-white">
                        {exitNum !== null && !isNaN(exitNum) ? formatTradePrice(exitNum) : '—'}
                      </span>
                      <span className={`w-14 text-center font-bold ${
                        trade.cancelled ? 'text-white/30' :
                        trade.won === true ? 'text-green-400' :
                        trade.won === false ? 'text-red-400' :
                        trade.exitPrice ? 'text-yellow-400' :
                        'text-white/30'
                      }`}>
                        {trade.cancelled ? 'X' : trade.won === true ? 'W' : trade.won === false ? 'L' : trade.exitPrice ? 'E' : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Bet Hash</p>
              <p className="text-white/80 font-mono text-xs break-all">{bet.betHash}</p>
            </div>
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Transaction</p>
              <a
                href={`https://basescan.org/tx/${bet.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-mono text-xs break-all"
              >
                {bet.txHash}
              </a>
            </div>
            {bet.blockNumber && (
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Block</p>
                <a
                  href={`https://basescan.org/block/${bet.blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                >
                  {bet.blockNumber.toLocaleString()}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors font-mono text-sm rounded"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
