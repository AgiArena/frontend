import { describe, test, expect } from 'bun:test'
import {
  formatScore,
  getScoreColorClass,
  getDisputeTimeRemaining,
  formatTimeRemaining,
  DISPUTE_WINDOW_MS
} from '../useResolution'

describe('formatScore', () => {
  test('formats positive score correctly', () => {
    // 247 bps = +2.47%
    expect(formatScore(247)).toBe('+2.47%')
  })

  test('formats negative score correctly', () => {
    // -123 bps = -1.23%
    expect(formatScore(-123)).toBe('-1.23%')
  })

  test('formats zero score correctly', () => {
    expect(formatScore(0)).toBe('+0.00%')
  })

  test('formats large positive score', () => {
    // 10000 bps = +100%
    expect(formatScore(10000)).toBe('+100.00%')
  })

  test('formats large negative score', () => {
    // -10000 bps = -100%
    expect(formatScore(-10000)).toBe('-100.00%')
  })

  test('formats null as --', () => {
    expect(formatScore(null)).toBe('--')
  })
})

describe('getScoreColorClass', () => {
  test('returns white for positive scores', () => {
    expect(getScoreColorClass(100)).toBe('text-white')
  })

  test('returns white for zero', () => {
    expect(getScoreColorClass(0)).toBe('text-white')
  })

  test('returns accent for negative scores', () => {
    expect(getScoreColorClass(-100)).toBe('text-accent')
  })

  test('returns muted color for null', () => {
    expect(getScoreColorClass(null)).toBe('text-white/60')
  })
})

describe('DISPUTE_WINDOW_MS', () => {
  test('equals 2 hours in milliseconds', () => {
    // 2 hours = 2 * 60 * 60 * 1000 = 7,200,000 ms
    expect(DISPUTE_WINDOW_MS).toBe(7200000)
  })
})

describe('getDisputeTimeRemaining', () => {
  test('returns 0 for null consensusAt', () => {
    expect(getDisputeTimeRemaining(null)).toBe(0)
  })

  test('returns 0 for expired window', () => {
    // 3 hours ago (past the 2-hour window)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(getDisputeTimeRemaining(threeHoursAgo)).toBe(0)
  })

  test('returns positive value for open window', () => {
    // 1 hour ago (still within 2-hour window)
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    const remaining = getDisputeTimeRemaining(oneHourAgo)
    // Should be approximately 1 hour remaining (with some tolerance for test execution time)
    expect(remaining).toBeGreaterThan(3500000) // > 58 minutes
    expect(remaining).toBeLessThanOrEqual(3600000) // <= 60 minutes
  })
})

describe('formatTimeRemaining', () => {
  test('formats expired time', () => {
    expect(formatTimeRemaining(0)).toBe('Expired')
    expect(formatTimeRemaining(-1000)).toBe('Expired')
  })

  test('formats hours and minutes', () => {
    // 1 hour 45 minutes = 6,300,000 ms
    expect(formatTimeRemaining(6300000)).toBe('1h 45m')
  })

  test('formats minutes only (under 1 hour)', () => {
    // 45 minutes 30 seconds = 2,730,000 ms
    expect(formatTimeRemaining(2730000)).toBe('45m 30s')
  })

  test('formats short durations', () => {
    // 30 seconds = 30,000 ms
    expect(formatTimeRemaining(30000)).toBe('0m 30s')
  })

  test('formats exactly 2 hours', () => {
    // 2 hours = 7,200,000 ms
    expect(formatTimeRemaining(7200000)).toBe('2h 0m')
  })
})
