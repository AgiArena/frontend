'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Event types for recent bet feed
 */
export type BetEventType = 'placed' | 'matched' | 'won' | 'lost'

/**
 * Recent bet event interface matching backend API response
 */
export interface RecentBetEvent {
  /** Bet ID (string representation of bigint) */
  betId: string
  /** Wallet address (0x... format) */
  walletAddress: string
  /** Type of event (placed/matched/won/lost) */
  eventType: BetEventType
  /** Number of markets in portfolio */
  portfolioSize: number
  /** Bet amount in USDC */
  amount: string // Decimal as string from API
  /** P&L result for won/lost events (null for placed/matched) */
  result: string | null // Decimal as string from API
  /** ISO timestamp of event */
  timestamp: string
}

/**
 * Response from GET /api/bets/recent
 */
export interface RecentBetsResponse {
  events: RecentBetEvent[]
}

interface UseRecentBetsReturn {
  events: RecentBetEvent[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches recent bet events from backend API
 * Throws error if backend is unavailable - NO MOCK FALLBACKS IN PRODUCTION
 */
async function fetchRecentBets(limit: number = 20): Promise<RecentBetsResponse> {
  const backendUrl = getBackendUrl() // Throws if not configured

  const response = await fetch(`${backendUrl}/api/bets/recent?limit=${limit}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch recent bets: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Hook for fetching recent bet events
 * Auto-refreshes every 60 seconds (60000ms)
 * @param limit - Maximum number of events to fetch (default: 20)
 * @returns Recent bet events, loading state, and error state
 */
export function useRecentBets(limit: number = 20): UseRecentBetsReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['recent-bets', limit],
    queryFn: () => fetchRecentBets(limit),
    refetchInterval: 60000, // 60 seconds - SSE handles real-time updates
    staleTime: 30000 // Consider data stale after 30 seconds
  })

  return {
    events: data?.events ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}
