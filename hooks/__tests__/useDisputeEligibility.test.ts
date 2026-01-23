import { describe, test, expect } from 'bun:test'
import type { Resolution } from '../useResolution'
import type { BetRecord } from '../useBetHistory'
import { getDisputeTimeRemaining, DISPUTE_WINDOW_MS } from '../useResolution'

/**
 * Test implementation of dispute eligibility logic
 * This mirrors the actual useDisputeEligibility hook logic INCLUDING time window check
 */
function checkDisputeEligibility(
  resolution: Resolution | null,
  bet: BetRecord | null,
  userAddress: string | undefined
): {
  canDispute: boolean
  timeRemaining: number
  reason: string | null
} {
  // No resolution data yet
  if (!resolution) {
    return { canDispute: false, timeRemaining: 0, reason: 'No resolution data' }
  }

  // No bet data
  if (!bet) {
    return { canDispute: false, timeRemaining: 0, reason: 'No bet data' }
  }

  // User not connected
  if (!userAddress) {
    return { canDispute: false, timeRemaining: 0, reason: 'Wallet not connected' }
  }

  // Must have consensus but not settled
  if (!resolution.consensusReached) {
    return { canDispute: false, timeRemaining: 0, reason: 'Consensus not reached' }
  }

  if (resolution.settledAt) {
    return { canDispute: false, timeRemaining: 0, reason: 'Bet already settled' }
  }

  // Must not already be disputed
  if (resolution.isDisputed) {
    return { canDispute: false, timeRemaining: 0, reason: 'Bet is already disputed' }
  }

  // User must be creator or matcher
  const userAddressLower = userAddress.toLowerCase()
  const isCreator = bet.creatorAddress.toLowerCase() === userAddressLower
  const isMatcher = bet.counterParties?.some(
    cp => cp.toLowerCase() === userAddressLower
  ) ?? false

  if (!isCreator && !isMatcher) {
    return { canDispute: false, timeRemaining: 0, reason: 'You are not involved in this bet' }
  }

  // Must be within 2-hour dispute window
  const timeRemaining = getDisputeTimeRemaining(resolution.consensusAt)
  if (timeRemaining <= 0) {
    return { canDispute: false, timeRemaining: 0, reason: 'Dispute window has closed' }
  }

  return { canDispute: true, timeRemaining, reason: null }
}

// Mock data factories
function createMockResolution(overrides: Partial<Resolution> = {}): Resolution {
  return {
    betId: '1',
    consensusReached: true,
    consensusAt: new Date().toISOString(), // Now (within window)
    keeper1Score: 247,
    keeper2Score: 253,
    avgScore: 250,
    creatorWins: true,
    winnerAddress: '0x1111111111111111111111111111111111111111',
    loserAddress: '0x2222222222222222222222222222222222222222',
    totalPot: '200.000000',
    platformFee: '0.200000',
    winnerPayout: '199.800000',
    isDisputed: false,
    disputerAddress: null,
    disputeStake: null,
    disputeReason: null,
    disputeRaisedAt: null,
    disputeResolvedAt: null,
    outcomeChanged: null,
    correctedScore: null,
    settledAt: null,
    settlementTxHash: null,
    status: 'consensus_reached',
    ...overrides
  }
}

function createMockBet(overrides: Partial<BetRecord> = {}): BetRecord {
  return {
    betId: '1',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    betHash: '0xabc123',
    portfolioSize: 100,
    amount: '100000000', // 100 USDC
    matchedAmount: '100000000',
    remainingAmount: '0',
    status: 'fully_matched',
    createdAt: '2024-01-01T00:00:00Z',
    txHash: '0xdef456',
    counterParties: ['0x2222222222222222222222222222222222222222'],
    ...overrides
  }
}

describe('checkDisputeEligibility', () => {
  describe('basic validation', () => {
    test('returns false with null resolution', () => {
      const result = checkDisputeEligibility(null, createMockBet(), '0x1111111111111111111111111111111111111111')
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('No resolution data')
    })

    test('returns false with null bet', () => {
      const result = checkDisputeEligibility(createMockResolution(), null, '0x1111111111111111111111111111111111111111')
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('No bet data')
    })

    test('returns false with undefined user address', () => {
      const result = checkDisputeEligibility(createMockResolution(), createMockBet(), undefined)
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('Wallet not connected')
    })
  })

  describe('consensus validation', () => {
    test('returns false when consensus not reached', () => {
      const resolution = createMockResolution({ consensusReached: false })
      const result = checkDisputeEligibility(resolution, createMockBet(), '0x1111111111111111111111111111111111111111')
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('Consensus not reached')
    })

    test('returns false when already settled', () => {
      const resolution = createMockResolution({ settledAt: '2024-01-02T00:00:00Z' })
      const result = checkDisputeEligibility(resolution, createMockBet(), '0x1111111111111111111111111111111111111111')
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('Bet already settled')
    })
  })

  describe('dispute state validation', () => {
    test('returns false when already disputed', () => {
      const resolution = createMockResolution({ isDisputed: true })
      const result = checkDisputeEligibility(resolution, createMockBet(), '0x1111111111111111111111111111111111111111')
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('Bet is already disputed')
    })
  })

  describe('time window validation', () => {
    test('returns false when dispute window has expired', () => {
      // Consensus reached 3 hours ago (past the 2-hour window)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const resolution = createMockResolution({ consensusAt: threeHoursAgo })
      const result = checkDisputeEligibility(
        resolution,
        createMockBet(),
        '0x1111111111111111111111111111111111111111'
      )
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('Dispute window has closed')
    })

    test('returns true with time remaining when within window', () => {
      // Consensus reached 1 hour ago (within 2-hour window)
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      const resolution = createMockResolution({ consensusAt: oneHourAgo })
      const result = checkDisputeEligibility(
        resolution,
        createMockBet(),
        '0x1111111111111111111111111111111111111111'
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(3500000) // > 58 minutes
      expect(result.timeRemaining).toBeLessThanOrEqual(3600000) // <= 60 minutes
      expect(result.reason).toBe(null)
    })

    test('returns true at exactly 2 hours window', () => {
      // Consensus just reached (full 2-hour window available)
      const now = new Date().toISOString()
      const resolution = createMockResolution({ consensusAt: now })
      const result = checkDisputeEligibility(
        resolution,
        createMockBet(),
        '0x1111111111111111111111111111111111111111'
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(DISPUTE_WINDOW_MS - 5000) // Within 5 seconds
      expect(result.reason).toBe(null)
    })
  })

  describe('user involvement validation', () => {
    test('returns true for bet creator', () => {
      const result = checkDisputeEligibility(
        createMockResolution(),
        createMockBet(),
        '0x1111111111111111111111111111111111111111' // Creator address
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(0)
      expect(result.reason).toBe(null)
    })

    test('returns true for bet matcher (counter-party)', () => {
      const result = checkDisputeEligibility(
        createMockResolution(),
        createMockBet(),
        '0x2222222222222222222222222222222222222222' // Counter-party address
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(0)
      expect(result.reason).toBe(null)
    })

    test('returns false for uninvolved user', () => {
      const result = checkDisputeEligibility(
        createMockResolution(),
        createMockBet(),
        '0x9999999999999999999999999999999999999999' // Random address
      )
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('You are not involved in this bet')
    })

    test('handles case-insensitive address comparison', () => {
      const result = checkDisputeEligibility(
        createMockResolution(),
        createMockBet(),
        '0x1111111111111111111111111111111111111111'.toUpperCase() // Same address, uppercase
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(0)
    })
  })

  describe('bet without counter-parties', () => {
    test('returns false for non-creator when no counter-parties', () => {
      const bet = createMockBet({ counterParties: undefined })
      const result = checkDisputeEligibility(
        createMockResolution(),
        bet,
        '0x2222222222222222222222222222222222222222'
      )
      expect(result.canDispute).toBe(false)
      expect(result.timeRemaining).toBe(0)
      expect(result.reason).toBe('You are not involved in this bet')
    })

    test('returns true for creator when no counter-parties', () => {
      const bet = createMockBet({ counterParties: undefined })
      const result = checkDisputeEligibility(
        createMockResolution(),
        bet,
        '0x1111111111111111111111111111111111111111'
      )
      expect(result.canDispute).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(0)
    })
  })
})
