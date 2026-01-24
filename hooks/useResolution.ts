'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Resolution status types matching backend API response
 */
export type ResolutionStatus =
  | 'pending_votes'
  | 'consensus_reached'
  | 'disputed'
  | 'settled'

/**
 * Resolution data interface matching backend API response
 */
export interface Resolution {
  betId: string
  consensusReached: boolean
  consensusAt: string | null        // ISO timestamp
  keeper1Score: number | null       // Basis points: 247 = +2.47%
  keeper2Score: number | null
  avgScore: number | null
  creatorWins: boolean | null
  winnerAddress: string | null
  loserAddress: string | null
  totalPot: string                  // "200.000000" (USDC 6 decimals as string)
  platformFee: string               // "0.200000"
  winnerPayout: string              // "199.800000"
  isDisputed: boolean
  disputerAddress: string | null
  disputeStake: string | null
  disputeReason: string | null
  disputeRaisedAt: string | null
  disputeResolvedAt: string | null
  outcomeChanged: boolean | null
  correctedScore: number | null
  settledAt: string | null
  settlementTxHash: string | null
  status: ResolutionStatus
}

/**
 * Keeper vote interface matching backend API response
 */
export interface KeeperVote {
  voteId: number
  betId: string
  keeperAddress: string
  aggregateScore: number            // Basis points
  creatorWins: boolean
  votedAt: string
  txHash: string
  blockNumber: number
}

/**
 * Fetches resolution data for a specific bet
 */
async function fetchResolution(betId: string): Promise<Resolution | null> {
  const backendUrl = getBackendUrl()
  const response = await fetch(`${backendUrl}/api/resolutions/${betId}`)

  if (!response.ok) {
    if (response.status === 404) {
      return null // No resolution data yet
    }
    throw new Error(`Failed to fetch resolution: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches keeper votes for a specific bet's resolution
 */
async function fetchResolutionVotes(betId: string): Promise<KeeperVote[]> {
  const backendUrl = getBackendUrl()
  const response = await fetch(`${backendUrl}/api/resolutions/${betId}/votes`)

  if (!response.ok) {
    if (response.status === 404) {
      return [] // No votes yet
    }
    throw new Error(`Failed to fetch resolution votes: ${response.statusText}`)
  }

  return response.json()
}

interface UseResolutionOptions {
  betId: string | null
  enabled?: boolean
}

interface UseResolutionReturn {
  resolution: Resolution | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching resolution data for a bet
 * Auto-refreshes every 30 seconds for live updates
 * @param options - Configuration including betId
 * @returns Resolution data, loading state, and error state
 */
export function useResolution({ betId, enabled = true }: UseResolutionOptions): UseResolutionReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['resolution', betId],
    queryFn: () => fetchResolution(betId!),
    enabled: enabled && !!betId,
    refetchInterval: 30000, // Refetch every 30s for live updates
    staleTime: 10000
  })

  return {
    resolution: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}

interface UseResolutionVotesOptions {
  betId: string | null
  enabled?: boolean
}

interface UseResolutionVotesReturn {
  votes: KeeperVote[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching keeper votes for a bet's resolution
 * @param options - Configuration including betId
 * @returns Keeper votes array, loading state, and error state
 */
export function useResolutionVotes({ betId, enabled = true }: UseResolutionVotesOptions): UseResolutionVotesReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['resolution', 'votes', betId],
    queryFn: () => fetchResolutionVotes(betId!),
    enabled: enabled && !!betId,
    refetchInterval: 30000,
    staleTime: 10000
  })

  return {
    votes: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}

// ============ Score Formatting Utilities ============

/**
 * Formats a score from basis points to percentage string
 * @param score - Score in basis points (247 = +2.47%, -123 = -1.23%)
 * @returns Formatted string like "+2.47%" or "-1.23%"
 */
export function formatScore(score: number | null): string {
  if (score === null) return '--'
  const percentage = score / 100
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}

/**
 * Returns Tailwind CSS class for score color
 * @param score - Score in basis points
 * @returns CSS class: 'text-white' for positive/zero, 'text-accent' for negative
 */
export function getScoreColorClass(score: number | null): string {
  if (score === null) return 'text-white/60'
  return score >= 0 ? 'text-white' : 'text-accent'
}

// ============ Dispute Window Utilities ============

/**
 * Dispute window duration in milliseconds (2 hours)
 */
export const DISPUTE_WINDOW_MS = 2 * 60 * 60 * 1000

/**
 * Calculate time remaining in dispute window
 * @param consensusAt - ISO timestamp when consensus was reached
 * @returns Time remaining in milliseconds (0 if window closed)
 */
export function getDisputeTimeRemaining(consensusAt: string | null): number {
  if (!consensusAt) return 0
  const consensusTime = new Date(consensusAt).getTime()
  const deadline = consensusTime + DISPUTE_WINDOW_MS
  return Math.max(0, deadline - Date.now())
}

/**
 * Format time remaining as human-readable string
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string like "1h 45m" or "23m 15s"
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired'

  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}
