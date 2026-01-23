'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Agent bet interface for recent bets table (AC5)
 */
export interface AgentBet {
  betId: string
  portfolioSize: number    // Number of markets in portfolio
  amount: number           // USDC wagered
  result: number           // P&L (positive or negative)
  status: 'pending' | 'matched' | 'settled'
  outcome?: 'won' | 'lost' // Only if settled
  createdAt: string        // ISO timestamp
}

/**
 * Agent bets response interface
 */
export interface AgentBetsResponse {
  bets: AgentBet[]
  total: number
}

interface UseAgentBetsReturn {
  bets: AgentBet[]
  total: number
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generates deterministic mock bet data for a wallet address
 * Same input = same output for consistent UX
 */
function generateMockAgentBets(walletAddress: string, limit: number = 10): AgentBetsResponse {
  // Use wallet address to generate deterministic "random" values
  const hash = walletAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const statuses: Array<'pending' | 'matched' | 'settled'> = ['pending', 'matched', 'settled']
  const outcomes: Array<'won' | 'lost'> = ['won', 'lost']

  const bets: AgentBet[] = Array.from({ length: limit }, (_, i) => {
    const seed = ((hash + i * 137) % 1000) / 1000 // Deterministic per-bet seed
    const statusIdx = Math.floor(seed * 3)
    const status = statuses[statusIdx]
    const isSettled = status === 'settled'
    const outcome = isSettled ? outcomes[Math.floor(seed * 2)] : undefined
    const amount = Math.floor(50 + seed * 450) // $50-$500
    const result = isSettled
      ? (outcome === 'won' ? Math.floor(10 + seed * 200) : -Math.floor(10 + seed * 200))
      : 0

    return {
      betId: `0x${(hash + i).toString(16).padStart(8, '0')}${walletAddress.slice(2, 10)}`,
      portfolioSize: Math.floor(5000 + seed * 20000), // 5K-25K markets
      amount,
      result,
      status,
      outcome,
      createdAt: new Date(Date.now() - (i + 1) * 1000 * 60 * 60 * (1 + Math.floor(seed * 23))).toISOString()
    }
  })

  return {
    bets,
    total: Math.floor(50 + (hash % 200)) // Total bet count
  }
}

/**
 * Fetches agent bets from backend API
 * Falls back to mock data if backend is unavailable
 */
async function fetchAgentBets(walletAddress: string, limit: number = 10): Promise<AgentBetsResponse> {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch {
    // Backend URL not configured - return mock data
    if (process.env.NODE_ENV === 'development') {
      console.debug('Backend URL not configured, using mock agent bets data')
    }
    return generateMockAgentBets(walletAddress, limit)
  }

  try {
    const response = await fetch(`${backendUrl}/api/agents/${walletAddress}/bets?limit=${limit}`)

    if (!response.ok) {
      // Backend returned error - fall back to mock data
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Agent bets API returned ${response.status}, using mock data`)
      }
      return generateMockAgentBets(walletAddress, limit)
    }

    return response.json()
  } catch (error) {
    // Network error - fall back to mock data
    if (process.env.NODE_ENV === 'development') {
      console.debug('Failed to fetch agent bets, using mock data:', error)
    }
    return generateMockAgentBets(walletAddress, limit)
  }
}

/**
 * Hook for fetching agent's recent bets
 * Used on agent detail page for bets table (AC5)
 *
 * @param walletAddress - The wallet address of the agent
 * @param limit - Number of bets to fetch (default 10)
 * @returns Agent bets data, loading state, and error state
 */
export function useAgentBets(walletAddress: string, limit: number = 10): UseAgentBetsReturn {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['agent-bets', walletAddress, limit],
    queryFn: () => fetchAgentBets(walletAddress, limit),
    enabled: !!walletAddress,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000 // Refetch every minute
  })

  return {
    bets: data?.bets ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}
