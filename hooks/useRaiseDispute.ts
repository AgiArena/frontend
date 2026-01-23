'use client'

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, useEffect, useRef } from 'react'
import { erc20Abi } from '@/lib/contracts/abi'
import { USDC_ADDRESS, getResolutionContractAddress } from '@/lib/contracts/addresses'

/**
 * ResolutionDAO ABI - only the functions needed for dispute
 */
export const resolutionDaoAbi = [
  {
    type: 'function',
    name: 'raiseDispute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'betId', type: 'uint256' },
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'reason', type: 'string' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'MIN_DISPUTE_STAKE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'canRaiseDispute',
    stateMutability: 'view',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getDisputeDeadline',
    stateMutability: 'view',
    inputs: [{ name: 'betId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'DisputeRaised',
    inputs: [
      { name: 'betId', type: 'uint256', indexed: true },
      { name: 'disputer', type: 'address', indexed: true },
      { name: 'stake', type: 'uint256', indexed: false },
      { name: 'reason', type: 'string', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'betId', type: 'uint256', indexed: true },
      { name: 'outcomeChanged', type: 'bool', indexed: false },
      { name: 'correctedScore', type: 'int256', indexed: false }
    ]
  }
] as const

/**
 * Minimum dispute stake in USDC base units (10 USDC = 10_000_000)
 */
export const MIN_DISPUTE_STAKE = 10_000_000n

type RaiseDisputeState =
  | 'idle'
  | 'checking-allowance'
  | 'approving'
  | 'approval-confirming'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error'

interface UseRaiseDisputeReturn {
  raiseDispute: (betId: bigint, stakeAmount: bigint, reason: string) => void
  state: RaiseDisputeState
  txHash: `0x${string}` | undefined
  error: Error | null
  reset: () => void
}

/**
 * Hook for raising a dispute on a bet
 * Handles USDC approval and contract interaction
 */
export function useRaiseDispute(): UseRaiseDisputeReturn {
  const { address } = useAccount()
  const [state, setState] = useState<RaiseDisputeState>('idle')
  const queryClient = useQueryClient()

  // Store pending dispute details for use after approval
  const pendingDisputeRef = useRef<{
    betId: bigint
    stakeAmount: bigint
    reason: string
  } | null>(null)

  // Get contract address
  let contractAddress: `0x${string}` | undefined
  try {
    contractAddress = getResolutionContractAddress()
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Resolution contract address not configured:', err)
    }
  }

  // Read current USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    query: {
      enabled: !!address && !!contractAddress
    }
  })

  // Write contract for USDC approval
  const {
    writeContract: writeApproval,
    data: approvalTxHash,
    isPending: isApprovalPending,
    error: approvalError,
    reset: resetApproval
  } = useWriteContract()

  // Wait for approval confirmation
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalConfirmed,
    error: approvalConfirmError
  } = useWaitForTransactionReceipt({
    hash: approvalTxHash
  })

  // Write contract for raising dispute
  const {
    writeContract: writeDispute,
    data: disputeTxHash,
    isPending: isDisputePending,
    error: disputeError,
    reset: resetDispute
  } = useWriteContract()

  // Wait for dispute confirmation
  const {
    isLoading: isDisputeConfirming,
    isSuccess: isDisputeConfirmed,
    error: disputeConfirmError
  } = useWaitForTransactionReceipt({
    hash: disputeTxHash
  })

  // Track previous states
  const prevIsApprovalConfirmed = useRef(false)
  const prevIsDisputeConfirmed = useRef(false)

  // Handle state transitions
  useEffect(() => {
    // Handle approval pending
    if (isApprovalPending && state === 'idle') {
      setState('approving')
    }

    // Handle approval confirming
    if (isApprovalConfirming && state === 'approving') {
      setState('approval-confirming')
    }

    // Handle approval confirmed - proceed to raise dispute
    if (isApprovalConfirmed && !prevIsApprovalConfirmed.current && state === 'approval-confirming') {
      refetchAllowance()

      // Now raise the dispute
      const pending = pendingDisputeRef.current
      if (pending && contractAddress) {
        setState('pending')
        writeDispute({
          address: contractAddress,
          abi: resolutionDaoAbi,
          functionName: 'raiseDispute',
          args: [pending.betId, pending.stakeAmount, pending.reason]
        })
      }
    }

    // Handle dispute pending
    if (isDisputePending && state === 'pending') {
      // State is already pending
    }

    // Handle dispute confirming
    if (isDisputeConfirming && state === 'pending') {
      setState('confirming')
    }

    // Handle dispute confirmed
    if (isDisputeConfirmed && !prevIsDisputeConfirmed.current && state === 'confirming') {
      setState('success')
      // Invalidate resolution query to refetch
      const pending = pendingDisputeRef.current
      if (pending) {
        queryClient.invalidateQueries({ queryKey: ['resolution', pending.betId.toString()] })
      }
      pendingDisputeRef.current = null
    }

    // Handle errors
    if (approvalError || approvalConfirmError || disputeError || disputeConfirmError) {
      setState('error')
    }

    // Update refs
    prevIsApprovalConfirmed.current = isApprovalConfirmed
    prevIsDisputeConfirmed.current = isDisputeConfirmed
  }, [
    isApprovalPending,
    isApprovalConfirming,
    isApprovalConfirmed,
    isDisputePending,
    isDisputeConfirming,
    isDisputeConfirmed,
    state,
    approvalError,
    approvalConfirmError,
    disputeError,
    disputeConfirmError,
    queryClient,
    refetchAllowance,
    writeDispute,
    contractAddress
  ])

  // Raise a dispute
  const raiseDispute = useCallback((betId: bigint, stakeAmount: bigint, reason: string) => {
    if (!contractAddress) {
      setState('error')
      return
    }

    // Reset state
    setState('idle')
    resetApproval()
    resetDispute()

    // Store pending dispute details
    pendingDisputeRef.current = { betId, stakeAmount, reason }

    // Check if approval is needed
    if (currentAllowance === undefined || currentAllowance < stakeAmount) {
      // Need to approve first
      writeApproval({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [contractAddress, stakeAmount]
      })
    } else {
      // Already approved - raise dispute directly
      setState('pending')
      writeDispute({
        address: contractAddress,
        abi: resolutionDaoAbi,
        functionName: 'raiseDispute',
        args: [betId, stakeAmount, reason]
      })
    }
  }, [contractAddress, currentAllowance, writeApproval, writeDispute, resetApproval, resetDispute])

  // Reset hook state
  const reset = useCallback(() => {
    setState('idle')
    resetApproval()
    resetDispute()
    pendingDisputeRef.current = null
  }, [resetApproval, resetDispute])

  // Get first error
  const error = approvalError || approvalConfirmError || disputeError || disputeConfirmError

  return {
    raiseDispute,
    state,
    txHash: disputeTxHash ?? approvalTxHash,
    error: error as Error | null,
    reset
  }
}
