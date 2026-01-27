'use client'

import { useState, useMemo } from 'react'
import type { BetRecord } from '@/hooks/useBetHistory'
import { CopyButton } from '@/components/ui/CopyButton'
import { PortfolioModal, PortfolioPosition } from '@/components/domain/PortfolioModal'
import { PortfolioResolution } from '@/components/domain/PortfolioResolution'
import { useCategoryById, formatCategoryDisplay } from '@/hooks/useCategories'
import { truncateAddress } from '@/lib/utils/address'
import { getAddressUrl, getTxUrl } from '@/lib/utils/basescan'
import { formatUSD, toBaseUnits } from '@/lib/utils/formatters'
import { parseMarketId, getSourceBadge, formatPosition } from '@/lib/utils/marketId'

interface BetDetailsExpandedProps {
  bet: BetRecord
  onCancelBet: () => void
  isCancelling: boolean
}

/**
 * Check if a bet should show resolution data
 * Resolution is shown for bets that are fully matched, settling, or settled
 */
function shouldShowResolution(status: BetRecord['status']): boolean {
  return status === 'fully_matched' || status === 'settling' || status === 'settled'
}

/**
 * Expanded row content showing bet details
 */
export function BetDetailsExpanded({ bet, onCancelBet, isCancelling }: BetDetailsExpandedProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const category = useCategoryById(bet.categoryId)

  // Parse portfolio JSON to get positions for preview
  const portfolioPositions = useMemo((): PortfolioPosition[] => {
    if (!bet.portfolioJson) return []
    try {
      const parsed = JSON.parse(bet.portfolioJson)
      // Assuming the JSON has a "positions" array
      if (Array.isArray(parsed)) {
        return parsed.map((p: { marketId: string; marketTitle?: string; position: 'YES' | 'NO'; currentPrice?: number; confidence?: number }) => ({
          marketId: p.marketId,
          marketTitle: p.marketTitle || p.marketId,
          position: p.position as 'YES' | 'NO',
          currentPrice: p.currentPrice || 0.5,
          confidence: p.confidence
        }))
      }
      if (parsed.positions && Array.isArray(parsed.positions)) {
        return parsed.positions.map((p: { marketId: string; marketTitle?: string; position: 'YES' | 'NO'; currentPrice?: number; confidence?: number }) => ({
          marketId: p.marketId,
          marketTitle: p.marketTitle || p.marketId,
          position: p.position as 'YES' | 'NO',
          currentPrice: p.currentPrice || 0.5,
          confidence: p.confidence
        }))
      }
      return []
    } catch {
      return []
    }
  }, [bet.portfolioJson])

  // Get top 10 positions for preview
  const top10Positions = portfolioPositions.slice(0, 10)

  // Check if bet can be cancelled (pending or partially matched)
  const canCancel = bet.status === 'pending' || bet.status === 'partially_matched'

  // Parse amounts - use toBaseUnits to handle both integer and decimal formats
  const matchedAmount = toBaseUnits(bet.matchedAmount)
  const remainingAmount = toBaseUnits(bet.remainingAmount)

  return (
    <div className="space-y-4">
      {/* Epic 8: Category and List Size */}
      {(category || bet.listSize || bet.snapshotId) && (
        <div className="flex flex-wrap gap-3 pb-2 border-b border-white/10">
          {category && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 font-mono">Category:</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-white/80">
                {formatCategoryDisplay(category)}
              </span>
            </div>
          )}
          {bet.listSize && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 font-mono">List Size:</span>
              <span className="text-xs font-mono text-white">{bet.listSize}</span>
            </div>
          )}
          {bet.snapshotId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 font-mono">Snapshot:</span>
              <span className="text-xs font-mono text-white/70">{bet.snapshotId}</span>
            </div>
          )}
        </div>
      )}

      {/* Bet Hash */}
      {bet.betHash && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-mono">Bet Hash:</span>
          <span className="text-xs font-mono text-white">
            {bet.betHash.slice(0, 10)}...{bet.betHash.slice(-8)}
          </span>
          <CopyButton text={bet.betHash} />
        </div>
      )}

      {/* Matched / Remaining Amounts */}
      <div className="flex gap-6">
        <div>
          <span className="text-xs text-white/60 font-mono block">Matched:</span>
          <span className="text-sm font-mono text-white">{formatUSD(matchedAmount)}</span>
        </div>
        <div>
          <span className="text-xs text-white/60 font-mono block">Remaining:</span>
          <span className="text-sm font-mono text-white">{formatUSD(remainingAmount)}</span>
        </div>
      </div>

      {/* Counter-parties */}
      {bet.counterParties && bet.counterParties.length > 0 && (
        <div>
          <span className="text-xs text-white/60 font-mono block mb-1">Counter-parties:</span>
          <div className="flex flex-wrap gap-2">
            {bet.counterParties.map((address) => (
              <a
                key={address}
                href={getAddressUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-white hover:text-accent transition-colors"
              >
                {truncateAddress(address)}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 Markets Preview */}
      {top10Positions.length > 0 && (
        <div>
          <span className="text-xs text-white/60 font-mono block mb-2">Top 10 Markets Preview:</span>
          <div className="space-y-1 border border-white/10 rounded p-2">
            {top10Positions.map((position, idx) => {
              const parsed = parseMarketId(position.marketId)
              const sourceBadge = getSourceBadge(parsed.dataSource)
              const posLabel = formatPosition(
                position.position === 'YES' ? 1 : 0,
                parsed.dataSource
              )
              return (
                <div
                  key={`${position.marketId}-${idx}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`px-1 py-0.5 text-xs rounded ${sourceBadge.bgColor} ${sourceBadge.textColor}`}
                      title={sourceBadge.label}
                    >
                      {sourceBadge.icon}
                    </span>
                    <span className="text-white/80 truncate max-w-[180px]" title={position.marketTitle}>
                      {position.marketTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1 font-bold font-mono ${
                        position.position === 'YES'
                          ? 'text-white'
                          : 'text-accent'
                      }`}
                    >
                      {posLabel}
                    </span>
                    <span className="font-mono text-white/60">
                      {parsed.dataSource === 'coingecko'
                        ? `$${position.currentPrice.toLocaleString()}`
                        : `${(position.currentPrice * 100).toFixed(1)}%`
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {portfolioPositions.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 border border-white text-white text-sm font-mono hover:bg-white hover:text-black transition-colors"
          >
            View Full Portfolio
          </button>
        )}

        {canCancel && (
          <button
            onClick={onCancelBet}
            disabled={isCancelling}
            className="px-3 py-1.5 border border-accent text-accent text-sm font-mono hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Bet'}
          </button>
        )}

        <a
          href={getTxUrl(bet.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 border border-white/30 text-white/60 text-sm font-mono hover:text-white hover:border-white transition-colors"
        >
          View on BaseScan
        </a>
      </div>

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        positions={portfolioPositions}
        portfolioSize={bet.tradeCount || bet.portfolioSize}
      />

      {/* Resolution Section - shown for matched/settling/settled bets */}
      {shouldShowResolution(bet.status) && (
        <div className="pt-4 border-t border-white/10">
          <h3 className="text-sm font-bold text-white font-mono mb-3">Resolution</h3>
          <PortfolioResolution betId={bet.betId} bet={bet} />
        </div>
      )}
    </div>
  )
}
