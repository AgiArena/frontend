'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { PortfolioModal, PortfolioPosition } from './PortfolioModal'
import { useUsdcApproval } from '@/hooks/useUsdcApproval'
import { usePlaceBet } from '@/hooks/usePlaceBet'
import { useToast } from '@/lib/contexts/ToastContext'
import { formatUSD, formatNumber } from '@/lib/utils/formatters'
import { getTxUrl } from '@/lib/utils/basescan'

export interface PortfolioBetProposalData {
  portfolioJson: string
  positions: PortfolioPosition[]
  totalAmount: bigint // USDC amount (6 decimals)
  reasoning: string
}

interface PortfolioBetProposalProps {
  proposal: PortfolioBetProposalData
  onBetPlaced?: (txHash: string, betId: bigint) => void
}

type BetFlowState =
  | 'idle'
  | 'checking-approval'
  | 'approval-required'
  | 'approving'
  | 'approved'
  | 'placing-bet'
  | 'uploading-json'
  | 'success'
  | 'error'

/**
 * Component for displaying portfolio bet proposals and handling the bet placement flow
 * Includes USDC approval, bet placement, and JSON upload to backend
 */
export function PortfolioBetProposal({ proposal, onBetPlaced }: PortfolioBetProposalProps) {
  const { isConnected, address } = useAccount()
  const { showSuccess, showError } = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [flowState, setFlowState] = useState<BetFlowState>('idle')

  const {
    state: approvalState,
    currentAllowance,
    approve,
    isApprovalNeeded,
    error: approvalError,
    txHash: approvalTxHash
  } = useUsdcApproval()

  const {
    state: placeBetState,
    placeBet,
    txHash: betTxHash,
    betId,
    error: placeBetError,
    reset: resetPlaceBet
  } = usePlaceBet()

  // Update flow state based on hook states
  useEffect(() => {
    if (approvalState === 'checking') {
      setFlowState('checking-approval')
    } else if (approvalState === 'approving') {
      setFlowState('approving')
    } else if (approvalState === 'approved' && flowState === 'approving') {
      // Approval just completed, now place the bet
      setFlowState('approved')
      placeBet(proposal.portfolioJson, proposal.totalAmount)
    } else if (placeBetState === 'placing-bet') {
      setFlowState('placing-bet')
    } else if (placeBetState === 'confirming') {
      setFlowState('placing-bet')
    } else if (placeBetState === 'uploading-json') {
      setFlowState('uploading-json')
    } else if (placeBetState === 'success') {
      setFlowState('success')
      if (betTxHash) {
        showSuccess('Bet placed successfully!', {
          url: getTxUrl(betTxHash),
          text: 'View on BaseScan'
        })
        if (onBetPlaced && betId !== undefined) {
          onBetPlaced(betTxHash, betId)
        }
      }
    } else if (placeBetState === 'error' || approvalState === 'error') {
      setFlowState('error')
      const errorMessage = placeBetError?.message || approvalError?.message || 'Transaction failed'
      showError(errorMessage)
    }
  }, [
    approvalState,
    placeBetState,
    flowState,
    placeBet,
    proposal.portfolioJson,
    proposal.totalAmount,
    betTxHash,
    betId,
    showSuccess,
    showError,
    onBetPlaced,
    placeBetError,
    approvalError
  ])

  // Handle approve and place bet click
  const handleApproveAndPlace = useCallback(() => {
    if (!isConnected || !address) {
      showError('Please connect your wallet first')
      return
    }

    // Check if approval is needed
    if (isApprovalNeeded(proposal.totalAmount)) {
      setFlowState('approval-required')
      approve(proposal.totalAmount)
    } else {
      // No approval needed, place bet directly
      setFlowState('placing-bet')
      placeBet(proposal.portfolioJson, proposal.totalAmount)
    }
  }, [isConnected, address, isApprovalNeeded, proposal.totalAmount, approve, placeBet, proposal.portfolioJson, showError])

  // Get button text based on flow state
  const getButtonText = (): string => {
    switch (flowState) {
      case 'checking-approval':
        return 'Checking Approval...'
      case 'approval-required':
      case 'approving':
        return 'Approving USDC...'
      case 'approved':
      case 'placing-bet':
        return 'Placing Bet...'
      case 'uploading-json':
        return 'Storing Portfolio...'
      case 'success':
        return 'Bet Placed!'
      case 'error':
        return 'Try Again'
      default:
        return 'Approve & Place Bet'
    }
  }

  // Check if button should be disabled
  const isButtonDisabled = (): boolean => {
    if (!isConnected) return true
    if (flowState === 'success') return true
    if (
      flowState === 'checking-approval' ||
      flowState === 'approving' ||
      flowState === 'placing-bet' ||
      flowState === 'uploading-json'
    ) {
      return true
    }
    return false
  }

  // Reset on error click
  const handleClick = () => {
    if (flowState === 'error') {
      setFlowState('idle')
      resetPlaceBet()
    } else {
      handleApproveAndPlace()
    }
  }

  // Get top 10 positions for preview
  const top10Positions = proposal.positions.slice(0, 10)
  const portfolioSize = proposal.positions.length

  return (
    <div className="bg-black border border-white/20 p-6 font-mono">
      {/* Portfolio Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Portfolio Bet Proposal</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/60 uppercase">Portfolio Size</p>
            <p className="text-xl font-bold text-white">
              {formatNumber(portfolioSize)} markets
            </p>
          </div>
          <div>
            <p className="text-xs text-white/60 uppercase">Total Bet Amount</p>
            <p className="text-xl font-bold text-accent">
              {formatUSD(proposal.totalAmount)} USDC
            </p>
          </div>
        </div>
      </div>

      {/* Top 10 Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm text-white/80">Top 10 Markets</h4>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-black border border-white text-white hover:bg-white hover:text-black transition-colors text-sm"
          >
            View Full Portfolio
          </button>
        </div>

        <div className="border border-white/10 divide-y divide-white/10">
          {top10Positions.map((position, index) => (
            <div
              key={`${position.marketId}-${index}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5"
            >
              <div className="flex-1 min-w-0 mr-4">
                <a
                  href={`https://polymarket.com/event/${position.marketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white hover:text-accent truncate block"
                  title={position.marketTitle}
                >
                  {position.marketTitle}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`
                    px-2 py-1 text-xs font-bold
                    ${position.position === 'YES'
                      ? 'bg-white text-black'
                      : 'bg-accent text-white'
                    }
                  `}
                >
                  {position.position}
                </span>
                <span className="text-sm text-white/80 w-14 text-right">
                  {(position.currentPrice * 100).toFixed(1)}%
                </span>
                {position.confidence !== undefined && (
                  <span className="text-xs text-white/60 w-10 text-right">
                    {(position.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bet Reasoning */}
      <div className="mb-6">
        <h4 className="text-sm text-white/80 mb-2">Analysis Summary</h4>
        <p className="text-sm text-white/70 leading-relaxed">{proposal.reasoning}</p>
      </div>

      {/* Approve & Place Bet Button */}
      <button
        onClick={handleClick}
        disabled={isButtonDisabled()}
        className="w-full px-6 py-3 bg-accent text-white hover:bg-accent/90 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {/* Loading spinner */}
        {(flowState === 'checking-approval' ||
          flowState === 'approving' ||
          flowState === 'placing-bet' ||
          flowState === 'uploading-json') && (
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {getButtonText()}
      </button>

      {/* Transaction hash display */}
      {betTxHash && flowState === 'success' && (
        <div className="mt-4 text-center">
          <a
            href={getTxUrl(betTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent underline hover:opacity-80"
          >
            View transaction on BaseScan
          </a>
        </div>
      )}

      {/* Wallet not connected message */}
      {!isConnected && (
        <p className="mt-4 text-sm text-accent text-center">
          Connect your wallet to place a bet
        </p>
      )}

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        positions={proposal.positions}
        portfolioSize={portfolioSize}
      />
    </div>
  )
}
