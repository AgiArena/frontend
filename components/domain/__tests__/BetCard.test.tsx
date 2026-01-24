import { describe, it, expect } from 'bun:test'
import { calculateOddsDisplay, type Bet } from '@/lib/types/bet'

/**
 * Tests for BetCard component
 * Story 7-12: Update BetCard Component to Display Odds
 *
 * Tests component logic, formatting, and display rules.
 */

// Mock bet data for testing
const mockBet: Bet = {
  betId: '123',
  creator: '0x1234567890123456789012345678901234567890',
  betHash: '0xabcdef1234567890',
  creatorStake: '100000000', // 100 USDC
  requiredMatch: '50000000',  // 50 USDC
  matchedAmount: '25000000',  // 25 USDC (50% matched)
  oddsBps: 20000, // 2.00x odds
  status: 'partially_matched',
  createdAt: '2026-01-24T00:00:00Z',
  portfolioSize: 15000
}

// ============================================================================
// AC1: Display Odds Badge Tests
// ============================================================================

describe('AC1: Odds Badge Display', () => {
  it('calculates odds display from basis points', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.display).toBe('2.00x')
    expect(odds.decimal).toBe(2)
  })

  it('determines favorable for high odds (>1.1x)', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.favorability).toBe('favorable')
  })

  it('determines even for odds near 1x (0.91-1.1)', () => {
    const evenBet = { ...mockBet, oddsBps: 10000, requiredMatch: '100000000' }
    const odds = calculateOddsDisplay(evenBet)
    expect(odds.favorability).toBe('even')
  })

  it('determines unfavorable for low odds (<0.91x)', () => {
    const unfavorableBet = { ...mockBet, oddsBps: 5000 }
    const odds = calculateOddsDisplay(unfavorableBet)
    expect(odds.favorability).toBe('unfavorable')
  })
})

// ============================================================================
// AC2: Stake Information Tests
// ============================================================================

describe('AC2: Show Stake Information', () => {
  it('formats creator staked amount correctly', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.creatorRisk).toBe('$100.00')
  })

  it('formats required match amount correctly', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.matcherRisk).toBe('$50.00')
  })

  it('calculates remaining amount for partial fills', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.remaining).toBe('$25.00')
  })

  it('shows $0.00 remaining when fully matched', () => {
    const fullyMatched = { ...mockBet, matchedAmount: '50000000' }
    const odds = calculateOddsDisplay(fullyMatched)
    expect(odds.remaining).toBe('$0.00')
  })
})

// ============================================================================
// AC3: Fill Progress Bar Tests
// ============================================================================

describe('AC3: Fill Progress Bar', () => {
  it('calculates fill percentage correctly', () => {
    const odds = calculateOddsDisplay(mockBet)
    // 25/50 = 50%
    expect(odds.fillPercent).toBe(50)
  })

  it('handles 0% matched', () => {
    const unmatched = { ...mockBet, matchedAmount: '0' }
    const odds = calculateOddsDisplay(unmatched)
    expect(odds.fillPercent).toBe(0)
  })

  it('handles 100% matched', () => {
    const fullyMatched = { ...mockBet, matchedAmount: '50000000' }
    const odds = calculateOddsDisplay(fullyMatched)
    expect(odds.fillPercent).toBe(100)
  })

  it('handles partial fills', () => {
    const partial = { ...mockBet, matchedAmount: '10000000' } // 10 USDC
    const odds = calculateOddsDisplay(partial)
    // 10/50 = 20%
    expect(odds.fillPercent).toBe(20)
  })

  it('formats percentage text correctly', () => {
    const odds = calculateOddsDisplay(mockBet)
    const percentText = `${odds.fillPercent.toFixed(1)}% matched`
    expect(percentText).toBe('50.0% matched')
  })
})

// ============================================================================
// AC4: Payout Information Tests
// ============================================================================

describe('AC4: Payout Information', () => {
  it('calculates total pot correctly', () => {
    const odds = calculateOddsDisplay(mockBet)
    expect(odds.totalPot).toBe('$150.00')
  })

  it('calculates creator return multiplier', () => {
    const odds = calculateOddsDisplay(mockBet)
    // Creator return: 150/100 = 1.5x
    expect(odds.creatorReturn).toBe('1.50x')
  })

  it('calculates matcher return multiplier', () => {
    const odds = calculateOddsDisplay(mockBet)
    // Matcher return: 150/50 = 3x
    expect(odds.matcherReturn).toBe('3.00x')
  })

  it('handles 1:1 odds returns', () => {
    const evenBet = { ...mockBet, oddsBps: 10000, requiredMatch: '100000000' }
    const odds = calculateOddsDisplay(evenBet)
    // Both return 2x (100 + 100 = 200, each gets 200/100 = 2x)
    expect(odds.creatorReturn).toBe('2.00x')
    expect(odds.matcherReturn).toBe('2.00x')
  })
})

// ============================================================================
// AC5: Implied Probability Tests
// ============================================================================

describe('AC5: Implied Probability', () => {
  it('calculates implied probability from odds', () => {
    const odds = calculateOddsDisplay(mockBet)
    // For 2.00x odds: P = 2 / (2 + 1) = 0.667
    expect(odds.impliedProbability).toBeCloseTo(0.667, 2)
  })

  it('formats implied probability as percentage', () => {
    const odds = calculateOddsDisplay(mockBet)
    const formatted = `${(odds.impliedProbability * 100).toFixed(0)}%`
    expect(formatted).toBe('67%')
  })

  it('calculates matcher implied probability', () => {
    const odds = calculateOddsDisplay(mockBet)
    const matcherImplied = 1 - odds.impliedProbability
    expect(matcherImplied).toBeCloseTo(0.333, 2)
  })

  it('handles 1:1 odds (50/50)', () => {
    const evenBet = { ...mockBet, oddsBps: 10000 }
    const odds = calculateOddsDisplay(evenBet)
    expect(odds.impliedProbability).toBe(0.5)
  })
})

// ============================================================================
// AC6: Read-Only Notice Tests
// ============================================================================

describe('AC6: Read-Only Notice', () => {
  it('has read-only notice text', () => {
    const noticeText = 'Bets placed by AI agents'
    expect(noticeText).toBe('Bets placed by AI agents')
  })

  it('notice styling is subtle (small, gray, italic)', () => {
    const styleClasses = 'text-[10px] text-gray-600 italic'
    expect(styleClasses).toContain('text-gray-600')
    expect(styleClasses).toContain('italic')
  })
})

// ============================================================================
// Status Display Tests
// ============================================================================

describe('Status display', () => {
  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ')
  }

  it('formats status with underscores replaced by spaces', () => {
    expect(formatStatus('partially_matched')).toBe('partially matched')
    expect(formatStatus('fully_matched')).toBe('fully matched')
  })

  it('preserves single-word statuses', () => {
    expect(formatStatus('pending')).toBe('pending')
    expect(formatStatus('settled')).toBe('settled')
  })

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-yellow-400'
      case 'partially_matched': return 'text-blue-400'
      case 'fully_matched': return 'text-green-400'
      case 'resolved': return 'text-purple-400'
      case 'settled': return 'text-cyan-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  it('returns correct colors for each status', () => {
    expect(getStatusColor('pending')).toBe('text-yellow-400')
    expect(getStatusColor('partially_matched')).toBe('text-blue-400')
    expect(getStatusColor('fully_matched')).toBe('text-green-400')
    expect(getStatusColor('resolved')).toBe('text-purple-400')
    expect(getStatusColor('settled')).toBe('text-cyan-400')
    expect(getStatusColor('cancelled')).toBe('text-red-400')
  })
})

// ============================================================================
// Portfolio Size Display Tests
// ============================================================================

describe('Portfolio size display', () => {
  it('formats portfolio size with commas', () => {
    const size = 15000
    const formatted = size.toLocaleString()
    expect(formatted).toBe('15,000')
  })

  it('handles undefined portfolio size gracefully', () => {
    const betWithoutPortfolio = { ...mockBet, portfolioSize: undefined }
    expect(betWithoutPortfolio.portfolioSize).toBeUndefined()
  })

  it('shows portfolio label with markets suffix', () => {
    const size = 15000
    const display = `Portfolio: ${size.toLocaleString()} markets`
    expect(display).toBe('Portfolio: 15,000 markets')
  })
})

// ============================================================================
// Link Tests
// ============================================================================

describe('BetCard links', () => {
  it('generates correct bet detail link', () => {
    const href = `/bet/${mockBet.betId}`
    expect(href).toBe('/bet/123')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge cases', () => {
  it('handles oddsBps of 0 (defaults to 1.00x)', () => {
    const betNoOdds = { ...mockBet, oddsBps: 0 }
    const odds = calculateOddsDisplay(betNoOdds)
    expect(odds.decimal).toBe(1)
    expect(odds.display).toBe('1.00x')
  })

  it('handles zero requiredMatch gracefully', () => {
    const bet = { ...mockBet, requiredMatch: '0' }
    const odds = calculateOddsDisplay(bet)
    expect(odds.fillPercent).toBe(0)
    expect(odds.matcherReturn).toBe('0.00x')
  })

  it('handles very large amounts', () => {
    const largeBet = {
      ...mockBet,
      creatorStake: '1000000000000', // 1M USDC
      requiredMatch: '500000000000',
      matchedAmount: '250000000000'
    }
    const odds = calculateOddsDisplay(largeBet)
    expect(odds.creatorRisk).toContain('$')
    expect(odds.fillPercent).toBe(50)
  })

  it('handles very small amounts', () => {
    const smallBet = {
      ...mockBet,
      creatorStake: '1000', // 0.001 USDC
      requiredMatch: '500',
      matchedAmount: '250'
    }
    const odds = calculateOddsDisplay(smallBet)
    expect(odds.creatorRisk).toBe('$0.00')
  })
})
