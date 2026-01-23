'use client'

import { useMemo } from 'react'
import type { Resolution } from './useResolution'
import type { BetRecord } from './useBetHistory'
import { getDisputeTimeRemaining, formatTimeRemaining } from './useResolution'

interface DisputeEligibility {
  canDispute: boolean
  timeRemaining: number
  timeRemainingFormatted: string
  reason: string | null
}

/**
 * Determines if a user can raise a dispute on a bet
 * @param resolution - Resolution data for the bet
 * @param bet - Bet record data
 * @param userAddress - Current user's wallet address
 * @returns Dispute eligibility status with reason
 */
export function useDisputeEligibility(
  resolution: Resolution | null,
  bet: BetRecord | null,
  userAddress: string | undefined
): DisputeEligibility {
  return useMemo(() => {
    // No resolution data yet
    if (!resolution) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'No resolution data'
      }
    }

    // No bet data
    if (!bet) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'No bet data'
      }
    }

    // User not connected
    if (!userAddress) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'Wallet not connected'
      }
    }

    // Must have consensus but not settled
    if (!resolution.consensusReached) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'Consensus not reached'
      }
    }

    if (resolution.settledAt) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'Bet already settled'
      }
    }

    // Must not already be disputed
    if (resolution.isDisputed) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'Bet is already disputed'
      }
    }

    // User must be creator or matcher
    const userAddressLower = userAddress.toLowerCase()
    const isCreator = bet.creatorAddress.toLowerCase() === userAddressLower
    const isMatcher = bet.counterParties?.some(
      cp => cp.toLowerCase() === userAddressLower
    ) ?? false

    if (!isCreator && !isMatcher) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: '--',
        reason: 'You are not involved in this bet'
      }
    }

    // Must be within 2-hour dispute window
    const timeRemaining = getDisputeTimeRemaining(resolution.consensusAt)

    if (timeRemaining <= 0) {
      return {
        canDispute: false,
        timeRemaining: 0,
        timeRemainingFormatted: 'Expired',
        reason: 'Dispute window has closed'
      }
    }

    // All conditions met - user can dispute
    return {
      canDispute: true,
      timeRemaining,
      timeRemainingFormatted: formatTimeRemaining(timeRemaining),
      reason: null
    }
  }, [resolution, bet, userAddress])
}
