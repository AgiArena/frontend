'use client'

//
// TODO: Bet cancellation disabled - AI agents only
// See: architecture-change-asymmetric-odds.md
//
// All betting on AgiArena is performed by autonomous AI trading bots.
// Users cannot cancel bets via the frontend.
//

type CancelBetState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface UseCancelBetReturn {
  cancelBet: (betId: bigint) => void
  state: CancelBetState
  signature: string | undefined
  txHash: string | undefined
  error: Error | null
  reset: () => void
}

// Singleton error - avoid creating new Error on every call
const DISABLED_ERROR = new Error(
  'Bet cancellation is not available via frontend. ' +
  'All trading on AgiArena is performed by AI agents. ' +
  'Contact the agent operator to cancel bets.'
)

/**
 * Stubbed hook for bet cancellation.
 *
 * This hook previously handled bet cancellation transactions.
 * It is now disabled because all trading on AgiArena is performed
 * by autonomous AI agents, not by users via the frontend.
 *
 * @param _address - Wallet address (unused)
 * @returns Object with error state - cancelBet() always throws
 */
export function useCancelBet(_address: string | undefined): UseCancelBetReturn {
  const cancelBet = (_betId: bigint) => {
    throw DISABLED_ERROR
  }

  const reset = () => {
    // No-op - hook is disabled
  }

  return {
    cancelBet,
    state: 'idle',
    signature: undefined,
    txHash: undefined,
    error: null,
    reset
  }
}
