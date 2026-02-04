'use client'

import type { BetRecord } from '@/hooks/useBetHistory'
import { useBetTrades, formatTradePosition, formatTradePrice } from '@/hooks/useBetTrades'
import { useCategoryById, formatCategoryDisplay } from '@/hooks/useCategories'
import { formatUsdcString } from '@/lib/utils/formatters'

interface PortfolioResolutionProps {
  betId: string
  bet: BetRecord
}

/**
 * Trade outcomes breakdown component
 */
interface TradesBreakdownProps {
  betId: string
}

function TradesBreakdown({ betId }: TradesBreakdownProps) {
  const { trades, isLoading } = useBetTrades({ betId: parseInt(betId) })

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <span className="text-xs text-white/40 font-mono">Loading trades...</span>
      </div>
    )
  }

  if (trades.length === 0) {
    return null
  }

  return (
    <div className="border border-white/10 p-3 space-y-2">
      <h4 className="text-sm font-bold text-white font-mono">Trade Outcomes</h4>
      <div className="max-h-60 overflow-y-auto space-y-1">
        {trades.map((trade, idx) => (
          <div
            key={`${trade.tradeId}-${idx}`}
            className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-b-0"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-white/80 font-mono truncate max-w-[120px]" title={trade.ticker}>
                {trade.ticker}
              </span>
              <span className="text-white/40 font-mono text-[10px] uppercase">
                {trade.source}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-white/60">
                {formatTradePosition(trade.position, trade.source)}
              </span>
              <span className="font-mono text-white/50">
                {formatTradePrice(trade.entryPrice, trade.source)}
                {trade.exitPrice && (
                  <>
                    <span className="text-white/30 mx-1">→</span>
                    {formatTradePrice(trade.exitPrice, trade.source)}
                  </>
                )}
              </span>
              <span className={`font-mono font-bold ${
                trade.cancelled ? 'text-gray-500' :
                trade.won === true ? 'text-green-500' :
                trade.won === false ? 'text-red-500' :
                trade.exitPrice ? 'text-yellow-500' : 'text-white/40'
              }`}>
                {trade.cancelled ? '—' : trade.won === true ? '✓' : trade.won === false ? '✗' : trade.exitPrice ? '=' : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main PortfolioResolution component
 * Story 4-3: Simplified after migration to bilateral system
 * Resolution now happens via P2P consensus between bots
 */
export function PortfolioResolution({ betId, bet }: PortfolioResolutionProps) {
  const category = useCategoryById(bet.categoryId)

  return (
    <div className="space-y-4 border border-white/20 p-4">
      {/* Category Badge */}
      {category && (
        <div className="flex justify-center">
          <span className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">
            {formatCategoryDisplay(category)}
            {bet.listSize && (
              <span className="ml-2 text-white/40">({bet.listSize})</span>
            )}
          </span>
        </div>
      )}

      {/* Bet Summary */}
      <div className="flex justify-center gap-6 py-3 border-t border-b border-white/10">
        <div className="text-center">
          <span className="text-xs text-white/60 font-mono block">List Size</span>
          <span className="text-sm font-mono text-white font-bold">
            {bet.tradeCount || bet.portfolioSize || bet.listSize || '--'} trades
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-white/60 font-mono block">Bet Amount</span>
          <span className="text-sm font-mono text-white font-bold">
            {formatUsdcString(bet.amount)}
          </span>
        </div>
      </div>

      {/* Trade Outcomes Breakdown */}
      <TradesBreakdown betId={betId} />

      {/* Bilateral System Notice */}
      <div className="border border-white/10 p-3 text-center">
        <p className="text-sm text-white/60 font-mono">
          Resolution via bilateral P2P consensus
        </p>
        <p className="text-xs text-white/40 font-mono mt-1">
          Bots settle directly with mutual signatures
        </p>
      </div>
    </div>
  )
}
