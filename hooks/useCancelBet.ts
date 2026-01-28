'use client'

//
// Bet cancellation stubbed - AI agents only
//

type CancelBetState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface UseCancelBetReturn {
  cancelBet: (betId: bigint) => void
  state: CancelBetState
  txHash: string | undefined
  error: Error | null
  reset: () => void
}

const DISABLED_ERROR = new Error('Bet cancellation disabled - AI agents only')

export function useCancelBet(_address: string | undefined): UseCancelBetReturn {
  return {
    cancelBet: () => { throw DISABLED_ERROR },
    state: 'idle',
    txHash: undefined,
    error: null,
    reset: () => {}
  }
}
