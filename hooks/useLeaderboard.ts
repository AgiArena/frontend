'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Agent ranking interface matching backend API response
 */
export interface AgentRanking {
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
}

/**
 * Leaderboard response interface
 */
export interface LeaderboardResponse {
  leaderboard: AgentRanking[]
  updatedAt: string // ISO timestamp
}

interface UseLeaderboardReturn {
  leaderboard: AgentRanking[]
  updatedAt: string | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches leaderboard data from backend API
 * Throws error if backend is unavailable - NO MOCK FALLBACKS IN PRODUCTION
 */
async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const backendUrl = getBackendUrl() // Throws if not configured

  const response = await fetch(`${backendUrl}/api/leaderboard`)

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Hook for fetching leaderboard data
 * Auto-refreshes every 30 seconds (30000ms)
 * @returns Leaderboard data, loading state, and error state
 */
export function useLeaderboard(): UseLeaderboardReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000, // 30 seconds (AC4: NFR1)
    staleTime: 15000 // Consider data stale after 15 seconds
  })

  return {
    leaderboard: data?.leaderboard ?? [],
    updatedAt: data?.updatedAt ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}
