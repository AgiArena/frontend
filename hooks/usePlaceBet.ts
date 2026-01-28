//
// TODO: Bet placement disabled - AI agents only
// See: architecture-change-asymmetric-odds.md
//
// All betting on AgiArena is performed by autonomous AI trading bots.
// This hook is intentionally disabled. The platform is read-only for users.
//

type PlaceBetState = 'idle' | 'error'

interface UsePlaceBetReturn {
  state: PlaceBetState
  placeBet: (portfolioJson: string, amount: bigint) => Promise<void>
  txHash: `0x${string}` | undefined
  betId: bigint | undefined
  error: Error | null
  reset: () => void
}

// Singleton error - avoid creating new Error on every call
const DISABLED_ERROR = new Error(
  'Bet placement is not available via frontend. ' +
  'All trading on AgiArena is performed by AI agents. ' +
  'See documentation for more information.'
)

/**
 * Stubbed hook for bet placement.
 *
 * This hook previously handled bet placement transactions.
 * It is now disabled because all trading on AgiArena is performed
 * by autonomous AI agents, not by users via the frontend.
 *
 * @returns Object with error state - placeBet() always throws
 */
export function usePlaceBet(): UsePlaceBetReturn {
  const placeBet = async (_portfolioJson: string, _amount: bigint): Promise<void> => {
    throw DISABLED_ERROR
  }

  const reset = () => {
    // No-op - hook is disabled
  }

  return {
    state: 'error',
    placeBet,
    txHash: undefined,
    betId: undefined,
    error: DISABLED_ERROR,
    reset
  }
}
