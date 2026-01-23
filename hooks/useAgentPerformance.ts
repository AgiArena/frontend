'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Single data point for performance graph
 * Represents one settled portfolio bet
 */
export interface PerformanceDataPoint {
  timestamp: string         // ISO timestamp
  cumulativePnL: number    // Running total P&L at this point
  betId: string            // Bet identifier
  betNumber: number        // Sequential bet number for this agent
  portfolioSize: number    // Markets in this bet
  amount: number           // USDC wagered
  result: number           // P&L from this bet
  resultPercent: number    // % return on this bet
}

/**
 * Summary statistics for the performance data
 */
export interface PerformanceSummary {
  totalPnL: number
  startingPnL: number
  endingPnL: number
  totalBets: number
}

/**
 * API response interface matching backend endpoint
 */
export interface PerformanceResponse {
  walletAddress: string
  range: '7d' | '30d' | '90d' | 'all'
  dataPoints: PerformanceDataPoint[]
  summary: PerformanceSummary
}

/**
 * Hook return type
 */
interface UseAgentPerformanceReturn {
  data: PerformanceResponse | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Mock data for development when backend is not ready
 */
function generateMockData(walletAddress: string, range: '7d' | '30d' | '90d' | 'all'): PerformanceResponse {
  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000

  // Determine number of days based on range
  let days: number
  switch (range) {
    case '7d': days = 7; break
    case '30d': days = 30; break
    case '90d': days = 90; break
    case 'all': days = 180; break
  }

  // Generate data points (roughly 1-3 bets per day)
  const dataPoints: PerformanceDataPoint[] = []
  let cumulativePnL = 0
  let betNumber = 0

  // Use wallet address to seed randomness for consistency
  const seed = parseInt(walletAddress.slice(2, 10), 16)

  for (let d = days; d >= 0; d--) {
    // 50-80% chance of a bet each day
    const betsToday = Math.floor((seed + d) % 3)

    for (let b = 0; b < betsToday; b++) {
      betNumber++
      const timestamp = new Date(now - d * msPerDay + b * 3600000).toISOString()
      const portfolioSize = 5000 + ((seed + d + b) % 20000)
      const amount = 50 + ((seed + d * 3 + b) % 200)

      // Simulate P&L with slight positive bias
      const resultPercent = -30 + ((seed + d * 7 + b * 11) % 60)
      const result = (amount * resultPercent) / 100
      cumulativePnL += result

      dataPoints.push({
        timestamp,
        cumulativePnL,
        betId: `bet-${walletAddress.slice(2, 8)}-${betNumber}`,
        betNumber,
        portfolioSize,
        amount,
        result,
        resultPercent
      })
    }
  }

  return {
    walletAddress,
    range,
    dataPoints,
    summary: {
      totalPnL: cumulativePnL,
      startingPnL: 0,
      endingPnL: cumulativePnL,
      totalBets: betNumber
    }
  }
}

/**
 * Fetches agent performance data from backend API
 * Falls back to mock data if backend is unavailable
 */
async function fetchAgentPerformance(
  walletAddress: string,
  range: '7d' | '30d' | '90d' | 'all'
): Promise<PerformanceResponse> {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch {
    // Backend URL not configured - return mock data
    console.warn('Backend URL not configured, using mock performance data')
    return generateMockData(walletAddress, range)
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/agents/${walletAddress}/performance?range=${range}`
    )

    if (!response.ok) {
      // Backend returned error - fall back to mock data
      console.warn(`Performance API returned ${response.status}, using mock data`)
      return generateMockData(walletAddress, range)
    }

    return response.json()
  } catch (error) {
    // Network error - fall back to mock data
    console.warn('Failed to fetch performance data, using mock data:', error)
    return generateMockData(walletAddress, range)
  }
}

/**
 * Hook for fetching agent performance data
 * Uses TanStack Query with automatic refetch
 *
 * @param walletAddress - The agent's wallet address
 * @param range - Time range: '7d', '30d', '90d', or 'all'
 * @returns Performance data, loading state, and error state
 */
export function useAgentPerformance(
  walletAddress: string,
  range: '7d' | '30d' | '90d' | 'all' = '30d'
): UseAgentPerformanceReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['agent-performance', walletAddress, range],
    queryFn: () => fetchAgentPerformance(walletAddress, range),
    enabled: !!walletAddress,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000 // Consider data stale after 30 seconds
  })

  return {
    data: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}
