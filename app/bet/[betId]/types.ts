/**
 * Types and utilities for bet detail page
 */

import {
  FAVORABLE_ODDS_THRESHOLD,
  UNFAVORABLE_ODDS_THRESHOLD,
  DEFAULT_ODDS_BPS,
} from '@/lib/types/bet'

export interface BetFill {
  fillerAddress: string
  fillAmount: string
  txHash: string
  blockNumber: number
  filledAt: string
}

export interface BetTrade {
  tradeId: string
  ticker: string
  source: string
  method: string
  position: string
  entryPrice: string
  exitPrice?: string
  won?: boolean
  cancelled: boolean
}

export interface BetTradesResponse {
  betId: string
  tradeCount: number
  trades: BetTrade[]
  pagination: { page: number; limit: number; total: number; hasMore: boolean }
}

export interface BetData {
  betId: string
  creatorAddress: string
  betHash: string
  portfolioSize: number
  tradeCount?: number
  amount: string
  matchedAmount: string
  /** Required match amount - defaults to amount if not provided (1:1 odds) */
  requiredMatch?: string
  /** Odds in basis points: 10000 = 1.00x, 20000 = 2.00x */
  oddsBps?: number
  status: string
  txHash: string
  blockNumber: number
  createdAt: string
  updatedAt: string
  resolutionDeadline?: string
  /** Fills/counterparties for this bet */
  fills?: BetFill[]
  portfolioJson?: {
    expiry?: string
    portfolioSize?: number
    positions?: Array<{
      marketId: string
      position: number | string
      weight?: number
    }>
    markets?: Array<{
      conditionId: string
      position: string
      weight?: number
    }>
  }
}

export interface OddsInfo {
  decimal: number
  display: string
  requiredMatch: string
  totalPot: string
  creatorReturn: string
  matcherReturn: string
  favorability: 'favorable' | 'even' | 'unfavorable'
  impliedProbability: string
}

export function formatAddress(address: string | undefined | null): string {
  if (!address) return '-'
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return '$0.00'
  return `$${num.toFixed(2)}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-400'
    case 'partially_matched':
      return 'text-blue-400'
    case 'fully_matched':
      return 'text-green-400'
    case 'resolved':
      return 'text-purple-400'
    case 'settled':
      return 'text-cyan-400'
    case 'cancelled':
      return 'text-red-400'
    default:
      return 'text-white/60'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Match'
    case 'partially_matched':
      return 'Partially Matched'
    case 'fully_matched':
      return 'Fully Matched - Awaiting Resolution'
    case 'resolved':
      return 'Resolved - Awaiting Settlement'
    case 'settled':
      return 'Settled'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

/**
 * Get odds display info from bet data
 */
export function getOddsInfo(bet: BetData): OddsInfo {
  const creatorStake = parseFloat(bet.amount)
  const requiredMatch = bet.requiredMatch ? parseFloat(bet.requiredMatch) : creatorStake
  const oddsBps = bet.oddsBps && bet.oddsBps > 0 ? bet.oddsBps : DEFAULT_ODDS_BPS
  const oddsDecimal = oddsBps / 10000
  const totalPot = creatorStake + requiredMatch

  let favorability: 'favorable' | 'even' | 'unfavorable'
  if (oddsDecimal > FAVORABLE_ODDS_THRESHOLD) favorability = 'favorable'
  else if (oddsDecimal < UNFAVORABLE_ODDS_THRESHOLD) favorability = 'unfavorable'
  else favorability = 'even'

  const creatorReturn = creatorStake > 0 ? totalPot / creatorStake : 0
  const matcherReturn = requiredMatch > 0 ? totalPot / requiredMatch : 0
  const impliedProb = oddsDecimal / (oddsDecimal + 1)

  return {
    decimal: oddsDecimal,
    display: `${oddsDecimal.toFixed(2)}x`,
    requiredMatch: `$${requiredMatch.toFixed(2)}`,
    totalPot: `$${totalPot.toFixed(2)}`,
    creatorReturn: `${creatorReturn.toFixed(2)}x`,
    matcherReturn: `${matcherReturn.toFixed(2)}x`,
    favorability,
    impliedProbability: `${(impliedProb * 100).toFixed(0)}%`
  }
}

/**
 * Get badge color based on favorability
 */
export function getOddsBadgeColor(favorability: 'favorable' | 'even' | 'unfavorable'): string {
  switch (favorability) {
    case 'favorable':
      return 'bg-green-900/80 text-green-300 border-green-700'
    case 'even':
      return 'bg-yellow-900/80 text-yellow-300 border-yellow-700'
    case 'unfavorable':
      return 'bg-red-900/80 text-red-300 border-red-700'
  }
}
