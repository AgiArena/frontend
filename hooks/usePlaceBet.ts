'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { agiArenaCoreAbi } from '@/lib/contracts/abi'
import { getContractAddress, getBackendUrl } from '@/lib/contracts/addresses'
import { generateBetHash } from '@/lib/utils/hash'
import { useState, useCallback, useEffect, useRef } from 'react'

type PlaceBetState =
  | 'idle'
  | 'placing-bet'
  | 'confirming'
  | 'uploading-json'
  | 'success'
  | 'error'

interface UsePlaceBetReturn {
  state: PlaceBetState
  placeBet: (portfolioJson: string, amount: bigint) => Promise<void>
  txHash: `0x${string}` | undefined
  betId: bigint | undefined
  error: Error | null
  reset: () => void
}

/**
 * Hook for placing bets on the AgiArenaCore contract
 * Handles transaction submission, confirmation, and JSON upload to backend
 */
export function usePlaceBet(): UsePlaceBetReturn {
  const [state, setState] = useState<PlaceBetState>('idle')
  const [betId, setBetId] = useState<bigint | undefined>()
  const [jsonError, setJsonError] = useState<Error | null>(null)
  const [pendingJson, setPendingJson] = useState<string | null>(null)
  const [pendingStorageRef, setPendingStorageRef] = useState<string | null>(null)

  // Get contract address
  let contractAddress: `0x${string}` | undefined
  try {
    contractAddress = getContractAddress()
  } catch (err) {
    // Contract address not configured - log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Contract address not configured:', err)
    }
  }

  // Write contract for placing bet
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

  // Upload JSON to backend after confirmation
  const uploadJson = useCallback(async (storageRef: string, portfolioJson: string) => {
    setState('uploading-json')
    try {
      const backendUrl = getBackendUrl()
      const response = await fetch(`${backendUrl}/api/bets/${storageRef}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ portfolio: portfolioJson })
      })

      if (!response.ok) {
        throw new Error(`Failed to upload portfolio JSON: ${response.statusText}`)
      }

      setState('success')
    } catch (err) {
      setJsonError(err instanceof Error ? err : new Error('Failed to upload JSON'))
      setState('error')
    }
  }, [])

  // Track previous states to detect changes
  const prevIsWritePending = useRef(false)
  const prevIsConfirming = useRef(false)
  const prevIsConfirmed = useRef(false)

  // Handle state transitions in useEffect to avoid side effects during render
  useEffect(() => {
    // Handle confirmation and trigger JSON upload
    if (isConfirmed && !prevIsConfirmed.current && state === 'confirming' && pendingJson && pendingStorageRef) {
      uploadJson(pendingStorageRef, pendingJson)
      setPendingJson(null)
      setPendingStorageRef(null)
    }

    // Update state based on transaction progress
    if (isWritePending && !prevIsWritePending.current && state === 'idle') {
      setState('placing-bet')
    }
    if (isConfirming && !prevIsConfirming.current && state === 'placing-bet') {
      setState('confirming')
    }

    // Update refs for next render
    prevIsWritePending.current = isWritePending
    prevIsConfirming.current = isConfirming
    prevIsConfirmed.current = isConfirmed
  }, [isWritePending, isConfirming, isConfirmed, state, pendingJson, pendingStorageRef, uploadJson])

  // Place a bet
  const placeBet = useCallback(async (portfolioJson: string, amount: bigint) => {
    if (!contractAddress) {
      setJsonError(new Error('Contract address not configured'))
      setState('error')
      return
    }

    // Validate inputs
    if (!portfolioJson || portfolioJson.trim() === '') {
      setJsonError(new Error('Portfolio JSON cannot be empty'))
      setState('error')
      return
    }

    if (amount <= 0n) {
      setJsonError(new Error('Bet amount must be greater than zero'))
      setState('error')
      return
    }

    // Validate JSON is parseable
    try {
      JSON.parse(portfolioJson)
    } catch {
      setJsonError(new Error('Invalid portfolio JSON format'))
      setState('error')
      return
    }

    // Generate bet hash
    const betHash = generateBetHash(portfolioJson)

    // Generate storage reference
    const timestamp = Date.now()
    const storageRef = `bet-${timestamp}`

    // Store for later upload
    setPendingJson(portfolioJson)
    setPendingStorageRef(storageRef)

    // Reset state
    setJsonError(null)
    resetWrite()
    setState('idle')

    // Call contract
    writeContract({
      address: contractAddress,
      abi: agiArenaCoreAbi,
      functionName: 'placeBet',
      args: [betHash, storageRef, amount]
    })
  }, [contractAddress, writeContract, resetWrite])

  // Reset hook state
  const reset = useCallback(() => {
    setState('idle')
    setBetId(undefined)
    setJsonError(null)
    setPendingJson(null)
    setPendingStorageRef(null)
    resetWrite()
  }, [resetWrite])

  // Get first error
  const error = writeError || confirmError || jsonError

  return {
    state,
    placeBet,
    txHash,
    betId,
    error,
    reset
  }
}
