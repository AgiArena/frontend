'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, useEffect, useRef } from 'react'
import { agiArenaCoreAbi } from '@/lib/contracts/abi'
import { getContractAddress } from '@/lib/contracts/addresses'

type CancelBetState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface UseCancelBetReturn {
  cancelBet: (betId: bigint) => void
  state: CancelBetState
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

/**
 * Hook for cancelling bets on the AgiArenaCore contract
 * Handles transaction submission and confirmation, then invalidates bet history cache
 */
export function useCancelBet(address: `0x${string}` | undefined): UseCancelBetReturn {
  const [state, setState] = useState<CancelBetState>('idle')
  const queryClient = useQueryClient()

  // Get contract address
  let contractAddress: `0x${string}` | undefined
  try {
    contractAddress = getContractAddress()
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Contract address not configured:', err)
    }
  }

  // Write contract for cancelling bet
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: txHash
  })

  // Track previous states
  const prevIsWritePending = useRef(false)
  const prevIsConfirming = useRef(false)
  const prevIsConfirmed = useRef(false)

  // Handle state transitions
  useEffect(() => {
    // Handle confirmation success
    if (isConfirmed && !prevIsConfirmed.current && state === 'confirming') {
      setState('success')
      // Invalidate bet history query to refetch
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['bets', 'user', address] })
      }
    }

    // Update state based on transaction progress
    if (isWritePending && !prevIsWritePending.current && state === 'idle') {
      setState('pending')
    }
    if (isConfirming && !prevIsConfirming.current && state === 'pending') {
      setState('confirming')
    }

    // Handle errors
    if (writeError || confirmError) {
      setState('error')
    }

    // Update refs
    prevIsWritePending.current = isWritePending
    prevIsConfirming.current = isConfirming
    prevIsConfirmed.current = isConfirmed
  }, [isWritePending, isConfirming, isConfirmed, state, writeError, confirmError, queryClient, address])

  // Cancel a bet
  const cancelBet = useCallback((betId: bigint) => {
    if (!contractAddress) {
      setState('error')
      return
    }

    // Reset state
    setState('idle')
    resetWrite()

    // Call contract
    writeContract({
      address: contractAddress,
      abi: agiArenaCoreAbi,
      functionName: 'cancelBet',
      args: [betId]
    })
  }, [contractAddress, writeContract, resetWrite])

  // Reset hook state
  const reset = useCallback(() => {
    setState('idle')
    resetWrite()
  }, [resetWrite])

  // Get first error
  const error = writeError || confirmError

  return {
    cancelBet,
    state,
    txHash,
    error: error as Error | null,
    reset
  }
}
