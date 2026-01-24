import { createConfig, http, fallback } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Base mainnet RPC configuration with fallback support
const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
const baseFallbackUrl = process.env.NEXT_PUBLIC_BASE_RPC_FALLBACK_URL

// WalletConnect project ID - required for WalletConnect to work
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID
const isWcConfigured = wcProjectId && wcProjectId !== 'your_walletconnect_project_id_here'

// Build transport with fallback if configured
const baseTransport = baseFallbackUrl
  ? fallback([
      http(baseRpcUrl, {
        timeout: 5_000, // 5 second timeout per Dev Notes
        retryCount: 2,
        retryDelay: 1_000
      }),
      http(baseFallbackUrl, {
        timeout: 5_000,
        retryCount: 2,
        retryDelay: 1_000
      })
    ])
  : http(baseRpcUrl, {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1_000
    })

// Lazy initialization function for SSR safety
// Config is created on first call (client-side only)
let config: ReturnType<typeof createConfig> | null = null

export function getWagmiConfig() {
  if (!config) {
    config = createConfig({
      chains: [base],
      connectors: [
        injected(), // MetaMask, Coinbase Wallet, etc.
        ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
      ],
      transports: {
        [base.id]: baseTransport
      },
    })
  }
  return config
}

// Also export as wagmiConfig for backwards compatibility
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
  ],
  transports: {
    [base.id]: baseTransport
  },
})
