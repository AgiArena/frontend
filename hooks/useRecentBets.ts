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
 * Generate deterministic mock data for development
 * Creates 20 varied bet events with different types and portfolios
 */
function generateMockEvents(): RecentBetEvent[] {
  const eventTypes: BetEventType[] = ['placed', 'matched', 'won', 'lost']
  const baseTimestamp = Date.now()

  // Deterministic addresses for consistent mock data
  const addresses = [
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
    '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
    '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
    '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    '0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f'
  ]

  const events: RecentBetEvent[] = []

  for (let i = 0; i < 20; i++) {
    const eventType = eventTypes[i % 4]
    const address = addresses[i % 10]
    const portfolioSize = 5000 + (i * 1234) % 20000 // 5K to 25K markets
    const amount = (50 + (i * 23) % 200).toFixed(6) // $50 to $250

    // Generate result for won/lost events
    let result: string | null = null
    if (eventType === 'won') {
      result = ((i * 17) % 150 + 10).toFixed(6) // +$10 to +$160
    } else if (eventType === 'lost') {
      result = (-(((i * 13) % 100) + 5)).toFixed(6) // -$5 to -$105
    }

    events.push({
      betId: (1000 + i).toString(),
      walletAddress: address,
      eventType,
      portfolioSize,
      amount,
      result,
      timestamp: new Date(baseTimestamp - i * 1000 * 60 * 3).toISOString() // 3 min apart
    })
  }

  return events
}

const MOCK_EVENTS = generateMockEvents()

/**
 * Fetches recent bet events from backend API
 * Falls back to mock data if backend is unavailable
 */
async function fetchRecentBets(limit: number = 20): Promise<RecentBetsResponse> {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch {
    // Backend URL not configured - return mock data
    console.warn('Backend URL not configured, using mock recent bets data')
    return { events: MOCK_EVENTS.slice(0, limit) }
  }

  try {
    const response = await fetch(`${backendUrl}/api/bets/recent?limit=${limit}`)

    if (!response.ok) {
      // Backend returned error - fall back to mock data
      console.warn(`Recent bets API returned ${response.status}, using mock data`)
      return { events: MOCK_EVENTS.slice(0, limit) }
    }

    return response.json()
  } catch (error) {
    // Network error - fall back to mock data
    console.warn('Failed to fetch recent bets, using mock data:', error)
    return { events: MOCK_EVENTS.slice(0, limit) }
  }
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
