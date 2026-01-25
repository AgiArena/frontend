/**
 * Contract addresses for the AgiArena platform
 * Hardcoded for Base mainnet production deployment
 */

/**
 * AgiArenaCore contract address on Base mainnet (deployed 2026-01-25)
 */
export const CONTRACT_ADDRESS = '0x7a97AFEED001b5DbfBc85FcAa93F6068D1bc9339' as const

/**
 * ResolutionDAO contract address on Base mainnet (deployed 2026-01-25)
 */
export const RESOLUTION_CONTRACT_ADDRESS = '0xf0233055Dc4E6cfBB9fB5cACE656939F5c7C54B1' as const

/**
 * USDC token address on Base mainnet
 */
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

/**
 * USDC decimal places (6 decimals on Base mainnet)
 */
export const USDC_DECIMALS = 6

/**
 * Minimum bet amount in USDC base units
 * 1 cent = $0.01 = 10,000 base units
 */
export const MIN_BET_AMOUNT = 10_000n

/**
 * Base chain ID (8453 for Base mainnet)
 */
export const BASE_CHAIN_ID = 8453

/**
 * Backend API URL
 * Empty string = same-origin (Vercel rewrites proxy to backend)
 */
export const BACKEND_URL = ''

/**
 * @deprecated Use CONTRACT_ADDRESS directly
 */
export function getContractAddress(): `0x${string}` {
  return CONTRACT_ADDRESS
}

/**
 * @deprecated Use RESOLUTION_CONTRACT_ADDRESS directly
 */
export function getResolutionContractAddress(): `0x${string}` {
  return RESOLUTION_CONTRACT_ADDRESS
}

/**
 * @deprecated Use BACKEND_URL directly
 */
export function getBackendUrl(): string {
  return BACKEND_URL
}
