/**
 * Bet types with asymmetric odds support
 * Story 7-12: Update BetCard Component to Display Odds
 */

/** Threshold above which odds are considered favorable for matcher */
export const FAVORABLE_ODDS_THRESHOLD = 1.1
/** Threshold below which odds are considered unfavorable for matcher */
export const UNFAVORABLE_ODDS_THRESHOLD = 0.91
/** Default odds in basis points (1.00x) */
export const DEFAULT_ODDS_BPS = 10000

/**
 * Core Bet interface with odds support
 * oddsBps uses basis points: 10000 = 1.00x, 20000 = 2.00x
 */
export interface Bet {
  betId: string
  creator: string
  betHash: string
  jsonStorageRef?: string
  creatorStake: string        // USDC amount (6 decimals as string)
  requiredMatch: string       // Required matcher stake
  matchedAmount: string
  oddsBps: number             // Basis points: 10000 = 1.00x
  status: 'pending' | 'partially_matched' | 'fully_matched' | 'cancelled' | 'settled' | 'resolved'
  createdAt: string
  portfolioSize?: number
}

/**
 * Computed odds display values for UI
 */
export interface OddsDisplay {
  /** Decimal odds (e.g., 2.0 for 2.00x) */
  decimal: number
  /** Display string (e.g., "2.00x") */
  display: string
  /** Creator risk formatted (e.g., "$100.00") */
  creatorRisk: string
  /** Matcher risk formatted (e.g., "$50.00") */
  matcherRisk: string
  /** Total pot formatted (e.g., "$150.00") */
  totalPot: string
  /** Creator return multiplier (e.g., "1.50x") */
  creatorReturn: string
  /** Matcher return multiplier (e.g., "3.00x") */
  matcherReturn: string
  /** Implied probability from odds (0-1) */
  impliedProbability: number
  /** Favorability for matcher */
  favorability: 'favorable' | 'even' | 'unfavorable'
  /** Fill percentage (0-100) */
  fillPercent: number
  /** Remaining amount to match formatted */
  remaining: string
}

/**
 * Formats a number as USD currency
 */
function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Calculates all odds display values from a bet
 * @param bet - Bet with oddsBps and stake information
 * @returns Computed display values for odds UI
 */
export function calculateOddsDisplay(bet: Bet): OddsDisplay {
  // Parse USDC amounts (6 decimals)
  const creatorStake = parseFloat(bet.creatorStake) / 1e6
  const requiredMatch = parseFloat(bet.requiredMatch) / 1e6
  const matchedAmount = parseFloat(bet.matchedAmount) / 1e6
  const totalPot = creatorStake + requiredMatch

  // Handle oddsBps - default to 10000 (1.00x) if missing, zero, or invalid
  const oddsBps = bet.oddsBps > 0 ? bet.oddsBps : DEFAULT_ODDS_BPS
  if (bet.oddsBps < 0) {
    console.warn(`[calculateOddsDisplay] Invalid negative oddsBps (${bet.oddsBps}) for bet ${bet.betId}, defaulting to 1.00x`)
  }
  const oddsDecimal = oddsBps / 10000

  // Calculate fill percentage - avoid NaN
  const fillPercent = requiredMatch > 0
    ? (matchedAmount / requiredMatch) * 100
    : 0

  // Calculate remaining amount
  const remaining = Math.max(0, requiredMatch - matchedAmount)

  // Determine favorability for matcher
  // Higher odds = more favorable for matcher (they get better return)
  let favorability: 'favorable' | 'even' | 'unfavorable'
  if (oddsDecimal > FAVORABLE_ODDS_THRESHOLD) {
    favorability = 'favorable'
  } else if (oddsDecimal < UNFAVORABLE_ODDS_THRESHOLD) {
    favorability = 'unfavorable'
  } else {
    favorability = 'even'
  }

  // Calculate return multipliers (protected against divide by zero and infinity)
  // Creator return = totalPot / creatorStake
  // Matcher return = totalPot / matcherStake
  const creatorReturnRaw = creatorStake > 0 ? totalPot / creatorStake : 0
  const matcherReturnRaw = requiredMatch > 0 ? totalPot / requiredMatch : 0
  // Cap at reasonable max to avoid "Infinity" display
  const creatorReturnVal = Number.isFinite(creatorReturnRaw) ? Math.min(creatorReturnRaw, 9999.99) : 0
  const matcherReturnVal = Number.isFinite(matcherReturnRaw) ? Math.min(matcherReturnRaw, 9999.99) : 0

  // Implied probability = 1 / (odds + 1) for matcher's perspective
  // For creator: P(win) = odds / (odds + 1)
  const impliedProbability = oddsDecimal / (oddsDecimal + 1)

  return {
    decimal: oddsDecimal,
    display: `${oddsDecimal.toFixed(2)}x`,
    creatorRisk: formatUSD(creatorStake),
    matcherRisk: formatUSD(requiredMatch),
    totalPot: formatUSD(totalPot),
    creatorReturn: `${creatorReturnVal.toFixed(2)}x`,
    matcherReturn: `${matcherReturnVal.toFixed(2)}x`,
    impliedProbability,
    favorability,
    fillPercent,
    remaining: formatUSD(remaining)
  }
}

/**
 * Formats implied probability as percentage string
 */
export function formatImpliedProbability(probability: number): string {
  return `${(probability * 100).toFixed(0)}%`
}
