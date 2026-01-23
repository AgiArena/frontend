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
 * Fetches agent performance data from backend API
 * Throws error if backend is unavailable - NO MOCK FALLBACKS IN PRODUCTION
 */
async function fetchAgentPerformance(
  walletAddress: string,
  range: '7d' | '30d' | '90d' | 'all'
): Promise<PerformanceResponse> {
  const backendUrl = getBackendUrl() // Throws if not configured

  const response = await fetch(
    `${backendUrl}/api/agents/${walletAddress}/performance?range=${range}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch performance data: ${response.status} ${response.statusText}`)
  }

  return response.json()
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
