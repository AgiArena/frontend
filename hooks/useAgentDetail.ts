'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Bet summary interface for best/worst bet tracking
 */
export interface BetSummary {
  betId: string
  amount: number
  result: number
  portfolioSize: number
}

/**
 * Extended agent detail interface with all stats for detail page
 * Extends leaderboard data with additional metrics
 */
export interface AgentDetail {
  // From leaderboard (existing)
  rank: number
  walletAddress: string       // 0x... format
  pnl: number                 // Decimal, can be negative
  winRate: number             // 0-100 percentage
  roi: number                 // Percentage, can be negative
  volume: number              // USDC amount
  totalBets: number           // Count
  avgPortfolioSize: number    // Markets count
  maxPortfolioSize: number    // Markets count
  lastActiveAt: string        // ISO timestamp

  // New fields for detail page (AC2, AC3)
  minPortfolioSize: number       // Smallest portfolio (markets)
  totalMarketsAnalyzed: number   // Sum of all portfolio sizes
  avgBetSize: number             // volume / totalBets
  bestBet: BetSummary            // Highest P&L bet
  worstBet: BetSummary           // Lowest P&L bet
}

interface UseAgentDetailReturn {
  agent: AgentDetail | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generates deterministic mock data for a wallet address
 * Same input = same output for consistent UX
 */
function generateMockAgentDetail(walletAddress: string): AgentDetail {
  // Use wallet address to generate deterministic "random" values
  const hash = walletAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const seed = (hash % 1000) / 1000 // 0-1 deterministic value

  const totalBets = Math.floor(50 + seed * 200) // 50-250 bets
  const volume = Math.floor(5000 + seed * 50000) // $5k-$55k
  const avgBetSize = volume / totalBets
  const pnl = Math.floor(-5000 + seed * 20000) // -$5k to $15k
  const winRate = Math.floor(40 + seed * 35) // 40-75%
  const roi = (pnl / volume) * 100
  const avgPortfolioSize = Math.floor(5000 + seed * 20000) // 5K-25K markets
  const maxPortfolioSize = Math.floor(avgPortfolioSize * (1.2 + seed * 0.5)) // 120-170% of avg
  const minPortfolioSize = Math.floor(avgPortfolioSize * (0.3 + seed * 0.3)) // 30-60% of avg
  const totalMarketsAnalyzed = avgPortfolioSize * totalBets

  // Generate best/worst bet based on P&L performance
  const bestResult = Math.floor(100 + seed * 900) // $100-$1000
  const worstResult = -Math.floor(50 + seed * 500) // -$50 to -$550

  return {
    rank: Math.floor(1 + seed * 50),
    walletAddress,
    pnl,
    winRate,
    roi,
    volume,
    totalBets,
    avgPortfolioSize,
    maxPortfolioSize,
    minPortfolioSize,
    totalMarketsAnalyzed,
    avgBetSize,
    bestBet: {
      betId: `bet-${walletAddress.slice(2, 10)}-best`,
      amount: Math.floor(avgBetSize * (0.8 + seed * 0.4)),
      result: bestResult,
      portfolioSize: Math.floor(avgPortfolioSize * (1 + seed * 0.3))
    },
    worstBet: {
      betId: `bet-${walletAddress.slice(2, 10)}-worst`,
      amount: Math.floor(avgBetSize * (0.8 + seed * 0.4)),
      result: worstResult,
      portfolioSize: Math.floor(avgPortfolioSize * (0.7 + seed * 0.3))
    },
    lastActiveAt: new Date(Date.now() - Math.floor(seed * 24 * 60 * 60 * 1000)).toISOString()
  }
}

/**
 * Fetches agent detail data from backend API
 * Falls back to mock data if backend is unavailable
 */
async function fetchAgentDetail(walletAddress: string): Promise<AgentDetail> {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch {
    // Backend URL not configured - return mock data
    if (process.env.NODE_ENV === 'development') {
      console.debug('Backend URL not configured, using mock agent detail data')
    }
    return generateMockAgentDetail(walletAddress)
  }

  try {
    const response = await fetch(`${backendUrl}/api/agents/${walletAddress}`)

    if (!response.ok) {
      // Backend returned error - fall back to mock data
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Agent detail API returned ${response.status}, using mock data`)
      }
      return generateMockAgentDetail(walletAddress)
    }

    return response.json()
  } catch (error) {
    // Network error - fall back to mock data
    if (process.env.NODE_ENV === 'development') {
      console.debug('Failed to fetch agent detail, using mock data:', error)
    }
    return generateMockAgentDetail(walletAddress)
  }
}

/**
 * Hook for fetching detailed agent data
 * Used on agent detail page for extended stats (AC2, AC3)
 *
 * @param walletAddress - The wallet address of the agent
 * @returns Agent detail data, loading state, and error state
 */
export function useAgentDetail(walletAddress: string): UseAgentDetailReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['agent-detail', walletAddress],
    queryFn: () => fetchAgentDetail(walletAddress),
    enabled: !!walletAddress,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000 // Refetch every minute
  })

  return {
    agent: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}
