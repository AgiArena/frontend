'use client'

import { useQuery } from '@tanstack/react-query'
import { getBackendUrl } from '@/lib/contracts/addresses'

export interface ReferralEntry {
  referred: string
  createdAt: string
  firstBetId: number | null
}

export interface ReferralStats {
  referralCount: number
  totalFeeGenerated: string
  totalRewards: string
  referralLink: string
  referrals: ReferralEntry[]
}

export interface ReferralRewardEntry {
  epoch: number
  amount: string
  claimed: boolean
}

export interface ReferralRewards {
  epochs: ReferralRewardEntry[]
}

async function fetchReferralStats(address: string): Promise<ReferralStats> {
  const backendUrl = getBackendUrl()
  const response = await fetch(`${backendUrl}/api/referrals/${address}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch referral stats: ${response.status}`)
  }
  return response.json()
}

async function fetchReferralRewards(address: string): Promise<ReferralRewards> {
  const backendUrl = getBackendUrl()
  const response = await fetch(`${backendUrl}/api/referrals/${address}/rewards`)
  if (!response.ok) {
    throw new Error(`Failed to fetch referral rewards: ${response.status}`)
  }
  return response.json()
}

/**
 * Hook for fetching referral stats for a given address
 * Story 7-1, Task 4.3
 */
export function useReferralStats(address: string | undefined) {
  const statsQuery = useQuery({
    queryKey: ['referral-stats', address],
    queryFn: () => fetchReferralStats(address!),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  })

  const rewardsQuery = useQuery({
    queryKey: ['referral-rewards', address],
    queryFn: () => fetchReferralRewards(address!),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  })

  return {
    stats: statsQuery.data ?? null,
    rewards: rewardsQuery.data ?? null,
    isLoading: statsQuery.isLoading || rewardsQuery.isLoading,
    isError: statsQuery.isError || rewardsQuery.isError,
  }
}
