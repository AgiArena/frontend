'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  PortfolioPositionWithPrices,
  PortfolioResponse,
  calculatePriceChange,
  formatPrice,
  formatPriceChange
} from '@/lib/types/bet'
import {
  BetData,
  BetTrade,
  formatAddress,
  formatAmount,
  getStatusColor,
  getStatusLabel,
  getOddsInfo,
  getOddsBadgeColor
} from './types'
// VirtualTradeList removed - trades shown in Portfolio section

interface BetDetailPageProps {
  params: Promise<{ betId: string }>
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
  const [isLoadingPositions, setIsLoadingPositions] = useState(true)
  const [tradesError, setTradesError] = useState(false)
  const [hasMoreTrades, setHasMoreTrades] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tradesPage, setTradesPage] = useState(1)
  const TRADES_PER_PAGE = 100

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

  // Fetch portfolio positions from trades endpoint
  useEffect(() => {
    if (!bet) return

    async function fetchPortfolioPositions() {
      setIsLoadingPositions(true)
      setTradesError(false)
      try {
        const res = await fetch(`/api/bets/${betId}/trades?limit=${TRADES_PER_PAGE}`)
        if (!res.ok) {
          console.error('Failed to fetch trades:', res.status)
          setTradesError(true)
          return
        }
        const data = await res.json()
        // Map trades to portfolio position format
        const positionsArray: PortfolioPositionWithPrices[] = (data.trades ?? []).map((trade: BetTrade) => {
          const ticker = trade.ticker || trade.tradeId.split('/')[0]
          const position: 'YES' | 'NO' = trade.position === 'LONG' ? 'YES' : 'NO'
          return {
            marketId: ticker,
            position,
            startingPrice: parseFloat(trade.entryPrice) || undefined,
            currentPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
          }
        })
        setPortfolioPositions(positionsArray)
        setHasMoreTrades(data.pagination?.hasMore ?? false)
      } catch (err) {
        console.error('Error fetching portfolio positions:', err)
        setTradesError(true)
      } finally {
        setIsLoadingPositions(false)
      }
    }

    fetchPortfolioPositions()
  }, [bet, betId])

  // Load more trades
  const loadMoreTrades = async () => {
    if (loadingMore || !hasMoreTrades) return
    setLoadingMore(true)
    try {
      const nextPage = tradesPage + 1
      const res = await fetch(`/api/bets/${betId}/trades?limit=${TRADES_PER_PAGE}&page=${nextPage}`)
      if (res.ok) {
        const data = await res.json()
        const newPositions: PortfolioPositionWithPrices[] = (data.trades ?? []).map((trade: BetTrade) => {
          const ticker = trade.ticker || trade.tradeId.split('/')[0]
          const position: 'YES' | 'NO' = trade.position === 'LONG' ? 'YES' : 'NO'
          return {
            marketId: ticker,
            position,
            startingPrice: parseFloat(trade.entryPrice) || undefined,
            currentPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : undefined,
          }
        })
        setPortfolioPositions(prev => [...prev, ...newPositions])
        setHasMoreTrades(data.pagination?.hasMore ?? false)
        setTradesPage(nextPage)
      }
    } finally {
      setLoadingMore(false)
    }
  }

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

        {/* Trades Card - positions with prices */}
        {((bet.tradeCount ?? 0) > 0 || portfolioPositions.length > 0 || bet.portfolioJson?.positions?.length || bet.portfolioJson?.markets?.length) && (
          <Card className="border-white/20">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-lg">
                  Trades ({portfolioPositions.length || bet.portfolioJson?.positions?.length || bet.portfolioJson?.markets?.length || 0})
                </CardTitle>
                {isLoadingPositions && (
                  <span className="text-white/40 font-mono text-xs animate-pulse">Loading...</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Column headers */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/20 text-xs text-white/40 font-mono mb-2">
                <span className="w-20">Ticker</span>
                <div className="flex items-center gap-4 text-right flex-1 justify-end">
                  <span className="w-16">Position</span>
                  <span className="w-20">Entry</span>
                  <span className="w-20">Current</span>
                  <span className="w-16">Change</span>
                </div>
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {/* Loading skeleton */}
                {isLoadingPositions && portfolioPositions.length === 0 && (
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded border border-white/10 animate-pulse">
                      <div className="w-16 h-4 bg-white/10 rounded" />
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-4 bg-white/10 rounded" />
                        <div className="w-16 h-4 bg-white/10 rounded" />
                        <div className="w-16 h-4 bg-white/10 rounded" />
                        <div className="w-12 h-4 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))
                )}
                {/* Use portfolio positions with prices if available */}
                {!isLoadingPositions && portfolioPositions.length > 0 ? (
                  portfolioPositions.map((pos, index) => {
                    const ticker = pos.marketId
                    const priceChange = calculatePriceChange(pos)
                    const changeColor = priceChange.direction === 'up' ? 'text-green-400'
                      : priceChange.direction === 'down' ? 'text-red-400'
                      : 'text-white/40'

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 bg-white/5 rounded border border-white/10 hover:bg-white/10"
                      >
                        <span className="w-20 text-white font-mono text-sm font-bold">
                          {ticker}
                        </span>
                        <div className="flex items-center gap-4 text-right flex-1 justify-end">
                          <span className={`font-mono text-sm font-bold w-16 ${
                            pos.position === 'YES' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {pos.position === 'YES' ? 'LONG' : 'SHORT'}
                          </span>
                          <span className="text-white/60 font-mono text-sm w-20">
                            {pos.startingPrice ? `$${pos.startingPrice.toLocaleString()}` : '—'}
                          </span>
                          <span className="text-white font-mono text-sm w-20">
                            {pos.currentPrice ? `$${pos.currentPrice.toLocaleString()}` : '—'}
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
                {/* Show error message if trades failed to load */}
                {tradesError && (
                  <div className="text-center py-4 text-red-400 font-mono text-sm">
                    Failed to load {bet.tradeCount ?? 0} trades. <button onClick={() => window.location.reload()} className="underline hover:text-white">Retry</button>
                  </div>
                )}
                {/* Fallback to 'markets' format for backwards compatibility */}
                {!isLoadingPositions && !portfolioPositions.length && !bet.portfolioJson?.positions && bet.portfolioJson?.markets?.map((market, index) => {
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
                {/* Load More button */}
                {hasMoreTrades && !loadingMore && (
                  <button
                    onClick={loadMoreTrades}
                    className="w-full py-2 mt-2 text-center text-accent font-mono text-sm border border-accent/30 hover:bg-accent/10 rounded"
                  >
                    Load More ({portfolioPositions.length} of {bet.tradeCount ?? '?'})
                  </button>
                )}
                {loadingMore && (
                  <div className="w-full py-2 mt-2 text-center text-white/40 font-mono text-sm animate-pulse">
                    Loading more...
                  </div>
                )}
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
