/**
 * Types and utilities for bet detail page
 */

import {
  FAVORABLE_ODDS_THRESHOLD,
  UNFAVORABLE_ODDS_THRESHOLD,
  DEFAULT_ODDS_BPS,
} from '@/lib/types/bet'

/** @deprecated Story 14-1: Multi-fill removed. Single filler on BetData now. */
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
  /** Odds in basis points: 10000 = 1.00x, 20000 = 2.00x */
  oddsBps?: number
  status: string
  txHash: string
  blockNumber: number
  createdAt: string
  updatedAt: string
  resolutionDeadline?: string
  // Story 14-1: Single-filler model
  fillerAddress?: string
  fillerStake?: string
  /** @deprecated Story 14-1: Use fillerAddress/fillerStake instead */
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
      return 'text-yellow'
    case 'matched':
      return 'text-green'
    case 'settling':
      return 'text-accent'
    case 'settled':
      return 'text-accent'
    default:
      return 'text-secondary'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Awaiting Match'
    case 'matched':
      return 'Matched - Awaiting Resolution'
    case 'settling':
      return 'Keepers Voting'
    case 'settled':
      return 'Settled'
    default:
      return status
  }
}

/**
 * Get odds display info from bet data
 */
export function getOddsInfo(bet: BetData): OddsInfo {
  const creatorStake = parseFloat(bet.amount)
  const oddsBps = bet.oddsBps && bet.oddsBps > 0 ? bet.oddsBps : DEFAULT_ODDS_BPS
  // Story 14-1: Compute required match from odds
  const requiredMatch = (creatorStake * oddsBps) / 10000
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
      return 'bg-green-muted text-green border-green/20'
    case 'even':
      return 'bg-accent-muted text-accent border-accent-border'
    case 'unfavorable':
      return 'bg-red-loss-muted text-red-loss border-red-loss/20'
  }
}
