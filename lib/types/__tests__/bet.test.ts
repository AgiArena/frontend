import { describe, it, expect } from 'bun:test'
import { calculateOddsDisplay, formatImpliedProbability, type Bet } from '../bet'

describe('calculateOddsDisplay', () => {
  const baseBet: Bet = {
    betId: '1',
    creator: '0x1234567890123456789012345678901234567890',
    betHash: '0xabcdef',
    creatorStake: '100000000', // 100 USDC (6 decimals)
    requiredMatch: '50000000',  // 50 USDC
    matchedAmount: '25000000',  // 25 USDC
    oddsBps: 20000, // 2.00x
    status: 'partially_matched',
    createdAt: '2026-01-24T00:00:00Z'
  }

  it('calculates decimal odds from basis points', () => {
    const result = calculateOddsDisplay(baseBet)
    expect(result.decimal).toBe(2)
    expect(result.display).toBe('2.00x')
  })

  it('handles 1:1 odds (10000 bps)', () => {
    const bet = { ...baseBet, oddsBps: 10000, requiredMatch: '100000000' }
    const result = calculateOddsDisplay(bet)
    expect(result.decimal).toBe(1)
    expect(result.display).toBe('1.00x')
  })

  it('defaults to 1.00x when oddsBps is 0', () => {
    const bet = { ...baseBet, oddsBps: 0 }
    const result = calculateOddsDisplay(bet)
    expect(result.decimal).toBe(1)
  })

  it('defaults to 1.00x when oddsBps is negative (invalid data)', () => {
    const bet = { ...baseBet, oddsBps: -5000 }
    const result = calculateOddsDisplay(bet)
    expect(result.decimal).toBe(1)
    expect(result.display).toBe('1.00x')
  })

  it('calculates creator and matcher risk correctly', () => {
    const result = calculateOddsDisplay(baseBet)
    expect(result.creatorRisk).toBe('$100.00')
    expect(result.matcherRisk).toBe('$50.00')
  })

  it('calculates total pot correctly', () => {
    const result = calculateOddsDisplay(baseBet)
    expect(result.totalPot).toBe('$150.00')
  })

  it('calculates return multipliers correctly', () => {
    const result = calculateOddsDisplay(baseBet)
    // Creator: 150/100 = 1.5x
    expect(result.creatorReturn).toBe('1.50x')
    // Matcher: 150/50 = 3x
    expect(result.matcherReturn).toBe('3.00x')
  })

  it('calculates fill percentage correctly', () => {
    const result = calculateOddsDisplay(baseBet)
    // 25/50 = 50%
    expect(result.fillPercent).toBe(50)
  })

  it('handles 0% fill', () => {
    const bet = { ...baseBet, matchedAmount: '0' }
    const result = calculateOddsDisplay(bet)
    expect(result.fillPercent).toBe(0)
  })

  it('handles 100% fill', () => {
    const bet = { ...baseBet, matchedAmount: '50000000' }
    const result = calculateOddsDisplay(bet)
    expect(result.fillPercent).toBe(100)
  })

  it('calculates remaining amount correctly', () => {
    const result = calculateOddsDisplay(baseBet)
    expect(result.remaining).toBe('$25.00')
  })

  it('determines favorable odds correctly', () => {
    // 2.00x odds = favorable for matcher
    const result = calculateOddsDisplay(baseBet)
    expect(result.favorability).toBe('favorable')
  })

  it('determines even odds correctly', () => {
    const bet = { ...baseBet, oddsBps: 10000 }
    const result = calculateOddsDisplay(bet)
    expect(result.favorability).toBe('even')
  })

  it('determines unfavorable odds correctly', () => {
    const bet = { ...baseBet, oddsBps: 5000 } // 0.5x
    const result = calculateOddsDisplay(bet)
    expect(result.favorability).toBe('unfavorable')
  })

  it('calculates implied probability correctly', () => {
    // For 2.00x odds: P = 2 / (2 + 1) = 0.667
    const result = calculateOddsDisplay(baseBet)
    expect(result.impliedProbability).toBeCloseTo(0.667, 2)
  })

  it('handles zero requiredMatch gracefully', () => {
    const bet = { ...baseBet, requiredMatch: '0' }
    const result = calculateOddsDisplay(bet)
    expect(result.fillPercent).toBe(0)
    expect(result.matcherReturn).toBe('0.00x')
  })

  it('handles zero creatorStake gracefully (no Infinity)', () => {
    const bet = { ...baseBet, creatorStake: '0' }
    const result = calculateOddsDisplay(bet)
    expect(result.creatorReturn).toBe('0.00x')
    expect(result.creatorReturn).not.toBe('Infinity')
  })
})

describe('formatImpliedProbability', () => {
  it('formats probability as percentage', () => {
    expect(formatImpliedProbability(0.667)).toBe('67%')
  })

  it('handles 0', () => {
    expect(formatImpliedProbability(0)).toBe('0%')
  })

  it('handles 1', () => {
    expect(formatImpliedProbability(1)).toBe('100%')
  })

  it('rounds to nearest integer', () => {
    expect(formatImpliedProbability(0.5555)).toBe('56%')
  })
})
