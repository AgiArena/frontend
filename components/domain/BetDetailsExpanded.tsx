'use client'

import { useState, useMemo } from 'react'
import type { BetRecord } from '@/hooks/useBetHistory'
import { CopyButton } from '@/components/ui/CopyButton'
import { PortfolioModal, PortfolioPosition } from '@/components/domain/PortfolioModal'
import { PortfolioResolution } from '@/components/domain/PortfolioResolution'
import { SignatureProgress } from '@/components/domain/SignatureProgress'
import { KeeperSignatureList } from '@/components/domain/KeeperSignatureList'
import { useResolutionSignatures } from '@/hooks/useResolutionSignatures'
import { useCategoryById, formatCategoryDisplay } from '@/hooks/useCategories'
import { truncateAddress } from '@/lib/utils/address'
import { getAddressUrl, getTxUrl } from '@/lib/utils/basescan'
import { formatUSD, toBaseUnits } from '@/lib/utils/formatters'
import { parseMarketId, getSourceBadge, formatPosition, parseWeatherMarketId, formatWeatherValue, isEconomicSource } from '@/lib/utils/marketId'
import type { TradeHorizon } from '@/lib/types/bet'

interface BetDetailsExpandedProps {
  bet: BetRecord
}

/**
 * Check if a bet should show resolution data
 * Resolution is shown for bets that are matched, settling, or settled
 */
function shouldShowResolution(status: BetRecord['status']): boolean {
  return status === 'matched' || status === 'settling' || status === 'settled'
}

/**
 * Expanded row content showing bet details
 */
export function BetDetailsExpanded({ bet }: BetDetailsExpandedProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const category = useCategoryById(bet.categoryId)

  // Story 14.3: Fetch signature status for matched/settling bets
  const showSignatures = bet.status === 'matched' || bet.status === 'settling'
  const { data: signatureStatus } = useResolutionSignatures(
    parseInt(bet.betId, 10),
    showSignatures
  )

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

  return (
    <div className="space-y-4">
      {/* Epic 8: Category and List Size */}
      {(category || bet.listSize || bet.snapshotId || bet.horizon) && (
        <div className="flex flex-wrap gap-3 pb-2 border-b border">
          {category && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-mono">Category:</span>
              <span className="px-2 py-1 bg-hover rounded text-xs font-mono text-secondary">
                {formatCategoryDisplay(category)}
              </span>
            </div>
          )}
          {bet.listSize && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-mono">List Size:</span>
              <span className="text-xs font-mono text-primary">{bet.listSize}</span>
            </div>
          )}
          {/* Epic 9: Trade Horizon */}
          {bet.horizon && bet.horizon !== 'short' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-mono">Horizon:</span>
              <span className={`px-2 py-1 rounded text-xs font-mono ${
                bet.horizon === 'monthly' || bet.horizon === 'quarterly'
                  ? 'bg-accent-muted text-accent'
                  : 'bg-hover text-secondary'
              }`}>
                {bet.horizon.charAt(0).toUpperCase() + bet.horizon.slice(1)}
              </span>
            </div>
          )}
          {bet.snapshotId && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary font-mono">Snapshot:</span>
              <span className="text-xs font-mono text-secondary">{bet.snapshotId}</span>
            </div>
          )}
        </div>
      )}

      {/* Bet Hash */}
      {bet.betHash && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-mono">Bet Hash:</span>
          <span className="text-xs font-mono text-primary">
            {bet.betHash.slice(0, 10)}...{bet.betHash.slice(-8)}
          </span>
          <CopyButton text={bet.betHash} />
        </div>
      )}

      {/* Filler info (Story 14-1: single-filler model) */}
      {bet.fillerAddress && (
        <div className="flex gap-6">
          <div>
            <span className="text-xs text-secondary font-mono block">Filler:</span>
            <a
              href={getAddressUrl(bet.fillerAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-primary hover:text-accent transition-colors"
            >
              {truncateAddress(bet.fillerAddress)}
            </a>
          </div>
          {bet.fillerStake && (
            <div>
              <span className="text-xs text-secondary font-mono block">Filler Stake:</span>
              <span className="text-sm font-mono text-primary">{formatUSD(toBaseUnits(bet.fillerStake))}</span>
            </div>
          )}
        </div>
      )}

      {/* Story 14-1: Early Exit Display */}
      {bet.earlyExit && (
        <div className="border border-accent-border bg-accent-muted rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent text-sm font-mono font-bold">⊗ Early Exit Executed</span>
          </div>
          <div className="text-xs text-secondary font-mono">
            Both parties agreed to settle early via mutual EIP-712 signed agreement.
          </div>
          {bet.creatorStake && bet.fillerStake && (
            <div className="mt-2 pt-2 border-t border-accent-border flex gap-4">
              <div>
                <span className="text-xs text-secondary block">Creator received:</span>
                <span className="text-sm font-mono text-accent">{formatUSD(toBaseUnits(bet.creatorStake))}</span>
              </div>
              <div>
                <span className="text-xs text-secondary block">Filler received:</span>
                <span className="text-sm font-mono text-accent">{formatUSD(toBaseUnits(bet.fillerStake))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Summary - click to view full list */}
      {portfolioPositions.length > 0 && (
        <div className="border border rounded p-3 bg-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-secondary font-mono">Portfolio:</span>
            <span className="text-sm font-mono text-primary font-bold">
              {portfolioPositions.length.toLocaleString()} positions
            </span>
          </div>
          <p className="text-xs text-muted font-mono">
            Click "View Full Portfolio" below to see all trades with virtual scroll.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {portfolioPositions.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 border border text-primary text-sm font-mono hover:bg-hover transition-colors"
          >
            View Full Portfolio
          </button>
        )}


        <a
          href={getTxUrl(bet.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 border border text-secondary text-sm font-mono hover:text-primary hover:border transition-colors"
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

      {/* Story 14.3: Signature collection progress for matched/settling bets */}
      {showSignatures && (
        <div className="pt-4 border-t border">
          <h3 className="text-sm font-semibold text-primary mb-3">Signature Collection</h3>
          <SignatureProgress
            betId={parseInt(bet.betId, 10)}
            compact={false}
            enabled={showSignatures}
          />
          {signatureStatus?.keepers && signatureStatus.keepers.length > 0 && (
            <div className="mt-4">
              <KeeperSignatureList keepers={signatureStatus.keepers} />
            </div>
          )}
        </div>
      )}

      {/* Resolution Section - shown for matched/settling/settled bets */}
      {shouldShowResolution(bet.status) && (
        <div className="pt-4 border-t border">
          <h3 className="text-sm font-semibold text-primary mb-3">Resolution</h3>
          <PortfolioResolution betId={bet.betId} bet={bet} />
        </div>
      )}
    </div>
  )
}
