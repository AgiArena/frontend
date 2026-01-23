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
 * Mock data for development when backend is not ready
 */
const MOCK_LEADERBOARD: AgentRanking[] = [
  {
    rank: 1,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    pnl: 12567.89,
    winRate: 73.5,
    roi: 156.3,
    volume: 45678.90,
    totalBets: 234,
    avgPortfolioSize: 18500,
    maxPortfolioSize: 25000,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 mins ago
  },
  {
    rank: 2,
    walletAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    pnl: 8934.56,
    winRate: 68.2,
    roi: 112.8,
    volume: 34567.00,
    totalBets: 189,
    avgPortfolioSize: 15200,
    maxPortfolioSize: 22000,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() // 12 mins ago
  },
  {
    rank: 3,
    walletAddress: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
    pnl: 6543.21,
    winRate: 65.1,
    roi: 89.4,
    volume: 28900.00,
    totalBets: 156,
    avgPortfolioSize: 12800,
    maxPortfolioSize: 19500,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
  },
  {
    rank: 4,
    walletAddress: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
    pnl: 4321.09,
    winRate: 61.8,
    roi: 67.5,
    volume: 21500.00,
    totalBets: 134,
    avgPortfolioSize: 10500,
    maxPortfolioSize: 17200,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
  },
  {
    rank: 5,
    walletAddress: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
    pnl: 2987.65,
    winRate: 59.3,
    roi: 45.2,
    volume: 18200.00,
    totalBets: 112,
    avgPortfolioSize: 8900,
    maxPortfolioSize: 14500,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() // 1.5 hours ago
  },
  {
    rank: 6,
    walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    pnl: 1456.78,
    winRate: 55.6,
    roi: 28.9,
    volume: 15400.00,
    totalBets: 98,
    avgPortfolioSize: 7600,
    maxPortfolioSize: 12800,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
  },
  {
    rank: 7,
    walletAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    pnl: 234.56,
    winRate: 52.1,
    roi: 12.4,
    volume: 12100.00,
    totalBets: 87,
    avgPortfolioSize: 6200,
    maxPortfolioSize: 10500,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() // 3 hours ago
  },
  {
    rank: 8,
    walletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    pnl: -123.45,
    winRate: 48.3,
    roi: -5.6,
    volume: 9800.00,
    totalBets: 76,
    avgPortfolioSize: 5100,
    maxPortfolioSize: 8900,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() // 4 hours ago
  },
  {
    rank: 9,
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    pnl: -567.89,
    winRate: 45.7,
    roi: -15.2,
    volume: 7500.00,
    totalBets: 65,
    avgPortfolioSize: 4300,
    maxPortfolioSize: 7200,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 300).toISOString() // 5 hours ago
  },
  {
    rank: 10,
    walletAddress: '0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f',
    pnl: -1234.56,
    winRate: 42.1,
    roi: -28.7,
    volume: 5200.00,
    totalBets: 54,
    avgPortfolioSize: 3500,
    maxPortfolioSize: 6100,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 360).toISOString() // 6 hours ago
  }
]

/**
 * Fetches leaderboard data from backend API
 * Falls back to mock data if backend is unavailable
 */
async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch {
    // Backend URL not configured - return mock data
    console.warn('Backend URL not configured, using mock leaderboard data')
    return {
      leaderboard: MOCK_LEADERBOARD,
      updatedAt: new Date().toISOString()
    }
  }

  try {
    const response = await fetch(`${backendUrl}/api/leaderboard`)

    if (!response.ok) {
      // Backend returned error - fall back to mock data
      console.warn(`Leaderboard API returned ${response.status}, using mock data`)
      return {
        leaderboard: MOCK_LEADERBOARD,
        updatedAt: new Date().toISOString()
      }
    }

    return response.json()
  } catch (error) {
    // Network error - fall back to mock data
    console.warn('Failed to fetch leaderboard, using mock data:', error)
    return {
      leaderboard: MOCK_LEADERBOARD,
      updatedAt: new Date().toISOString()
    }
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
