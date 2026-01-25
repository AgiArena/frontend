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
  totalVolume: number         // USDC amount (renamed from volume to match backend)
  portfolioBets: number       // Count (renamed from totalBets to match backend)
  avgPortfolioSize: number    // Markets count
  largestPortfolio: number    // Markets count (renamed from maxPortfolioSize to match backend)
  lastActiveAt?: string       // ISO timestamp (optional - not always present from backend)
  // Aliases for backward compatibility with frontend components
  volume: number              // Alias for totalVolume
  totalBets: number           // Alias for portfolioBets
  maxPortfolioSize: number    // Alias for largestPortfolio
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
 * Raw backend response before field mapping
 */
interface BackendAgentRanking {
  rank: number
  walletAddress: string
  pnl: number
  winRate: number
  roi: number
  totalVolume: number
  portfolioBets: number
  avgPortfolioSize: number
  largestPortfolio: number
  lastActiveAt?: string  // ISO timestamp from on-chain block timestamp
}

interface BackendLeaderboardResponse {
  leaderboard: BackendAgentRanking[]
  updatedAt: string
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

  const data: BackendLeaderboardResponse = await response.json()

  // Transform backend response to add alias fields for backward compatibility
  const transformedLeaderboard: AgentRanking[] = data.leaderboard.map((agent) => ({
    ...agent,
    // Add alias fields so frontend components can use either name
    volume: agent.totalVolume,
    totalBets: agent.portfolioBets,
    maxPortfolioSize: agent.largestPortfolio,
    lastActiveAt: agent.lastActiveAt,
  }))

  return {
    leaderboard: transformedLeaderboard,
    updatedAt: data.updatedAt,
  }
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
    refetchInterval: 5000, // 5 seconds for near real-time updates
    staleTime: 3000 // Consider data stale after 3 seconds
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
