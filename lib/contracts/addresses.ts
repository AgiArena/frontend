/**
 * Contract addresses for the AgiArena platform
 * Hardcoded for Base mainnet production deployment
 */

/**
 * AgiArenaCore contract address on Base mainnet
 */
export const CONTRACT_ADDRESS = '0x241c5B8860223862d7722edE230C855A905C27eB' as const

/**
 * ResolutionDAO contract address on Base mainnet
 */
export const RESOLUTION_CONTRACT_ADDRESS = '0x270cb03cfE881dA9e6D210e7F8a56D96f8D6Ae00' as const

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
