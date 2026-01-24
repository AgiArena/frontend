/**
 * Contract addresses for the AgiArena platform
 * Loaded from environment variables (production configuration)
 *
 * Production addresses (Base mainnet):
 * - AgiArenaCore: 0xdbDD446F158cA403e70521497CC33E0A53205f74
 * - ResolutionDAO: 0xedCFd3924f03898C7fB68cA250a3De99B9721625
 * - USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */

/**
 * AgiArenaCore contract address on Base mainnet
 * @throws Error if environment variable is not set
 */
export function getContractAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      'NEXT_PUBLIC_CONTRACT_ADDRESS is not configured. ' +
      'Set it to 0xdbDD446F158cA403e70521497CC33E0A53205f74 in frontend/.env.local'
    )
  }
  return address as `0x${string}`
}

/**
 * USDC token address on Base mainnet
 * This is a well-known address and doesn't need env configuration
 */
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

/**
 * USDC decimal places (6 decimals on Base mainnet)
 * 1 USDC = 1_000_000 base units
 */
export const USDC_DECIMALS = 6

/**
 * Minimum bet amount in USDC base units
 * 1 cent = $0.01 = 10,000 base units (USDC has 6 decimals)
 */
export const MIN_BET_AMOUNT = 10_000n

/**
 * Backend API URL for JSON storage
 * Returns empty string for same-origin requests (when using Vercel rewrites)
 */
export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL
  // Empty string = same-origin (Vercel rewrites proxy to backend)
  // This allows frontend to call /api/* which Vercel proxies to the backend server
  return url || ''
}

/**
 * ResolutionDAO contract address on Base mainnet
 * @throws Error if environment variable is not set
 */
export function getResolutionContractAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_RESOLUTION_CONTRACT_ADDRESS
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      'NEXT_PUBLIC_RESOLUTION_CONTRACT_ADDRESS is not configured. ' +
      'Set it to 0xedCFd3924f03898C7fB68cA250a3De99B9721625 in frontend/.env.local'
    )
  }
  return address as `0x${string}`
}

/**
 * Base chain ID (8453 for Base mainnet)
 */
export const BASE_CHAIN_ID = 8453
