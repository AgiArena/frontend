import { createConfig, http, fallback, type Config } from 'wagmi'
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

// Lazy-create config to avoid indexedDB access during SSR
// WalletConnect connector accesses indexedDB on instantiation
let _wagmiConfig: Config | null = null

export function getWagmiConfig(): Config {
  if (_wagmiConfig) return _wagmiConfig

  _wagmiConfig = createConfig({
    chains: [base],
    connectors: [
      injected(), // MetaMask, Coinbase Wallet, etc.
      ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
    ],
    transports: {
      [base.id]: baseTransport
    },
    ssr: true, // Enable SSR support
  })

  return _wagmiConfig
}

// For backwards compatibility - but only use in client components
export const wagmiConfig = typeof window !== 'undefined'
  ? getWagmiConfig()
  : (null as unknown as Config)
