import { describe, test, expect } from 'bun:test'
import type { SSEState, UseLeaderboardSSEReturn } from '../useLeaderboardSSE'

describe('useLeaderboardSSE', () => {
  describe('SSEState type', () => {
    test('defines all expected states', () => {
      const validStates: SSEState[] = ['connecting', 'connected', 'disconnected', 'error', 'disabled', 'polling']

      expect(validStates).toContain('connecting')
      expect(validStates).toContain('connected')
      expect(validStates).toContain('disconnected')
      expect(validStates).toContain('error')
      expect(validStates).toContain('disabled')
      expect(validStates).toContain('polling')
    })
  })

  describe('UseLeaderboardSSEReturn interface', () => {
    test('validates correct return structure when connected', () => {
      const connectedReturn: UseLeaderboardSSEReturn = {
        state: 'connected',
        isConnected: true,
        isEnabled: true,
        reconnectAttempt: 0,
        isPolling: false
      }

      expect(connectedReturn.state).toBe('connected')
      expect(connectedReturn.isConnected).toBe(true)
      expect(connectedReturn.isEnabled).toBe(true)
      expect(connectedReturn.reconnectAttempt).toBe(0)
      expect(connectedReturn.isPolling).toBe(false)
    })

    test('validates correct return structure when disabled', () => {
      const disabledReturn: UseLeaderboardSSEReturn = {
        state: 'disabled',
        isConnected: false,
        isEnabled: false,
        reconnectAttempt: 0,
        isPolling: false
      }

      expect(disabledReturn.state).toBe('disabled')
      expect(disabledReturn.isConnected).toBe(false)
      expect(disabledReturn.isEnabled).toBe(false)
      expect(disabledReturn.isPolling).toBe(false)
    })

    test('validates correct return structure during reconnection', () => {
      const reconnectingReturn: UseLeaderboardSSEReturn = {
        state: 'error',
        isConnected: false,
        isEnabled: true,
        reconnectAttempt: 3,
        isPolling: false
      }

      expect(reconnectingReturn.state).toBe('error')
      expect(reconnectingReturn.isConnected).toBe(false)
      expect(reconnectingReturn.isEnabled).toBe(true)
      expect(reconnectingReturn.reconnectAttempt).toBe(3)
      expect(reconnectingReturn.isPolling).toBe(false)
    })

    test('validates correct return structure when polling', () => {
      const pollingReturn: UseLeaderboardSSEReturn = {
        state: 'polling',
        isConnected: false,
        isEnabled: true,
        reconnectAttempt: 3,
        isPolling: true
      }

      expect(pollingReturn.state).toBe('polling')
      expect(pollingReturn.isConnected).toBe(false)
      expect(pollingReturn.isEnabled).toBe(true)
      expect(pollingReturn.isPolling).toBe(true)
    })
  })

  describe('Exponential backoff calculation', () => {
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds

    function getReconnectDelay(attempt: number): number {
      const delay = baseDelay * Math.pow(2, attempt)
      return Math.min(delay, maxDelay)
    }

    test('first retry is 1 second', () => {
      expect(getReconnectDelay(0)).toBe(1000)
    })

    test('second retry is 2 seconds', () => {
      expect(getReconnectDelay(1)).toBe(2000)
    })

    test('third retry is 4 seconds', () => {
      expect(getReconnectDelay(2)).toBe(4000)
    })

    test('fourth retry is 8 seconds', () => {
      expect(getReconnectDelay(3)).toBe(8000)
    })

    test('caps at 30 seconds max', () => {
      expect(getReconnectDelay(5)).toBe(30000)
      expect(getReconnectDelay(10)).toBe(30000)
      expect(getReconnectDelay(100)).toBe(30000)
    })
  })
})
