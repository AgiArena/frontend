/**
 * Contract addresses for the AgiArena platform
 * Loaded from environment variables
 */

/**
 * AgiArenaCore contract address on Base mainnet
 * @throws Error if environment variable is not set
 */
export function getContractAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!address) {
    throw new Error(
      'NEXT_PUBLIC_CONTRACT_ADDRESS environment variable is not set. ' +
      'Add it to frontend/.env.local'
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
 * Backend API URL for JSON storage
 */
export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_BACKEND_URL environment variable is not set. ' +
      'Add it to frontend/.env.local'
    )
  }
  return url
}

/**
 * ResolutionDAO contract address on Base mainnet
 * @throws Error if environment variable is not set
 */
export function getResolutionContractAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_RESOLUTION_CONTRACT_ADDRESS
  if (!address) {
    throw new Error(
      'NEXT_PUBLIC_RESOLUTION_CONTRACT_ADDRESS environment variable is not set. ' +
      'Add it to frontend/.env.local'
    )
  }
  return address as `0x${string}`
}
