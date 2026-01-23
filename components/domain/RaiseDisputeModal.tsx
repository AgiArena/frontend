'use client'

import { useEffect, useCallback, useState, ChangeEvent } from 'react'
import { useRaiseDispute, MIN_DISPUTE_STAKE } from '@/hooks/useRaiseDispute'
import { useToast } from '@/lib/contexts/ToastContext'
import { getTxUrl } from '@/lib/utils/basescan'
import { formatUsdcAmount } from '@/lib/utils/formatters'

/**
 * Maximum length for dispute reason (matching contract constant)
 */
const MAX_REASON_LENGTH = 280

interface RaiseDisputeModalProps {
  isOpen: boolean
  onClose: () => void
  betId: string
  timeRemaining: string
}

/**
 * Modal for raising a dispute on a bet
 * Handles stake input, reason text, and contract interaction
 */
export function RaiseDisputeModal({
  isOpen,
  onClose,
  betId,
  timeRemaining
}: RaiseDisputeModalProps) {
  const [stakeAmount, setStakeAmount] = useState('')
  const [reason, setReason] = useState('')
  const { showSuccess, showError } = useToast()

  const { raiseDispute, state, txHash, error, reset } = useRaiseDispute()

  // Handle escape key to close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStakeAmount('10') // Default to minimum
      setReason('')
      reset()
    }
  }, [isOpen, reset])

  // Handle success
  useEffect(() => {
    if (state === 'success' && txHash) {
      showSuccess('Dispute raised successfully!', {
        url: getTxUrl(txHash),
        text: 'View on BaseScan'
      })
      onClose()
    }
  }, [state, txHash, showSuccess, onClose])

  // Handle error
  useEffect(() => {
    if (state === 'error' && error) {
      showError(error.message || 'Failed to raise dispute')
    }
  }, [state, error, showError])

  const handleStakeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setStakeAmount(value)
    }
  }

  const handleReasonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_REASON_LENGTH) {
      setReason(value)
    }
  }

  const handleSubmit = () => {
    // Parse stake amount
    const stakeNum = parseFloat(stakeAmount)
    if (isNaN(stakeNum) || stakeNum < 10) {
      showError('Minimum stake is 10 USDC')
      return
    }

    // Validate reason
    if (!reason.trim()) {
      showError('Please provide a reason for the dispute')
      return
    }

    // Convert to USDC base units (6 decimals)
    const stakeBaseUnits = BigInt(Math.floor(stakeNum * 1_000_000))

    // Validate against minimum
    if (stakeBaseUnits < MIN_DISPUTE_STAKE) {
      showError('Minimum stake is 10 USDC')
      return
    }

    // Raise dispute
    raiseDispute(BigInt(betId), stakeBaseUnits, reason.trim())
  }

  // Determine button state and text
  const getButtonState = () => {
    switch (state) {
      case 'approving':
        return { text: 'Approving USDC...', disabled: true }
      case 'approval-confirming':
        return { text: 'Confirming Approval...', disabled: true }
      case 'pending':
        return { text: 'Submitting Dispute...', disabled: true }
      case 'confirming':
        return { text: 'Confirming...', disabled: true }
      case 'error':
        return { text: 'Stake & Dispute', disabled: false }
      default:
        return { text: 'Stake & Dispute', disabled: false }
    }
  }

  const buttonState = getButtonState()
  const isLoading = ['approving', 'approval-confirming', 'pending', 'confirming'].includes(state)

  // Form validation
  const stakeNum = parseFloat(stakeAmount) || 0
  const isValidStake = stakeNum >= 10
  const isValidReason = reason.trim().length > 0
  const canSubmit = isValidStake && isValidReason && !isLoading

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-black border border-accent w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-accent/30">
          <div>
            <h2 id="dispute-modal-title" className="text-lg font-bold text-white font-mono">
              Raise Dispute
            </h2>
            <p className="text-xs text-white/60 font-mono">
              Bet #{betId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="bg-accent/10 border border-accent/30 p-3">
            <p className="text-sm text-accent font-mono font-bold">
              ⚠️ Warning
            </p>
            <p className="text-xs text-white/80 mt-1">
              Your stake will be <span className="text-accent font-bold">slashed</span> if
              the dispute is found to be invalid. Only raise a dispute if you believe
              the keeper calculation is incorrect.
            </p>
          </div>

          {/* Time remaining */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60 font-mono">Time remaining:</span>
            <span className="font-mono text-white font-bold">{timeRemaining}</span>
          </div>

          {/* Stake input */}
          <div>
            <label className="text-xs text-white/60 font-mono block mb-2">
              Stake Amount (min 10 USDC)
            </label>
            <div className="relative">
              <input
                type="text"
                value={stakeAmount}
                onChange={handleStakeChange}
                placeholder="10.00"
                className="w-full px-4 py-2 bg-black border border-white/30 text-white font-mono text-sm focus:outline-none focus:border-white placeholder-white/40 pr-16"
                disabled={isLoading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 font-mono text-sm">
                USDC
              </span>
            </div>
            {!isValidStake && stakeAmount && (
              <p className="text-xs text-accent font-mono mt-1">
                Minimum stake is 10 USDC
              </p>
            )}
          </div>

          {/* Reason textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/60 font-mono">
                Reason for Dispute (required)
              </label>
              <span className={`text-xs font-mono ${
                reason.length >= MAX_REASON_LENGTH ? 'text-accent' : 'text-white/40'
              }`}>
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </div>
            <textarea
              value={reason}
              onChange={handleReasonChange}
              placeholder="Explain why you believe the keeper calculation is incorrect..."
              className="w-full px-4 py-2 bg-black border border-white/30 text-white font-mono text-sm focus:outline-none focus:border-white placeholder-white/40 resize-none h-24"
              disabled={isLoading}
            />
          </div>

          {/* Summary */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60 font-mono">You will stake:</span>
              <span className="font-mono text-white font-bold">
                ${formatUsdcAmount(BigInt(Math.floor((parseFloat(stakeAmount) || 0) * 1_000_000)))} USDC
              </span>
            </div>
            <p className="text-xs text-white/40 font-mono mt-2">
              If your dispute is valid, you will receive your stake back plus 5% of the total pot.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-accent/30 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-black border border-white/30 text-white/60 hover:text-white hover:border-white transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-accent text-white font-mono font-bold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonState.text}
          </button>
        </div>
      </div>
    </div>
  )
}
