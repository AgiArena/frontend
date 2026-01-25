import { createConfig, http, fallback } from 'wagmi'
import { base, type Chain } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Index L3 chain definition
export const indexL3: Chain = {
  id: 111222333,
  name: 'Index L3',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://index.rpc.zeeve.net'] },
  },
}

// Active chain configuration from environment (defaults to Index L3)
const activeChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '111222333', 10)
const activeChain = activeChainId === 8453 ? base : indexL3

// RPC configuration with fallback support
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ||
  (activeChainId === 8453 ? 'https://mainnet.base.org' : 'https://index.rpc.zeeve.net')
const fallbackRpcUrl = process.env.NEXT_PUBLIC_RPC_FALLBACK_URL

// Legacy env vars for backward compatibility
const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || rpcUrl
const baseFallbackUrl = process.env.NEXT_PUBLIC_BASE_RPC_FALLBACK_URL || fallbackRpcUrl

// WalletConnect project ID - required for WalletConnect to work
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID
const isWcConfigured = wcProjectId && wcProjectId !== 'your_walletconnect_project_id_here'

// Build transport with fallback if configured
const chainTransport = fallbackRpcUrl
  ? fallback([
      http(rpcUrl, {
        timeout: 5_000, // 5 second timeout per Dev Notes
        retryCount: 2,
        retryDelay: 1_000
      }),
      http(fallbackRpcUrl, {
        timeout: 5_000,
        retryCount: 2,
        retryDelay: 1_000
      })
    ])
  : http(rpcUrl, {
      timeout: 10_000,
      retryCount: 3,
      retryDelay: 1_000
    })

// Legacy alias for backward compatibility
const baseTransport = chainTransport

// Lazy initialization function for SSR safety
// Config is created on first call (client-side only)
let config: ReturnType<typeof createConfig> | null = null

export function getWagmiConfig() {
  if (!config) {
    config = createConfig({
      chains: [activeChain],
      connectors: [
        injected(), // MetaMask, Coinbase Wallet, etc.
        ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
      ],
      transports: {
        [activeChain.id]: chainTransport
      },
    })
  }
  return config
}

// Also export as wagmiConfig for backwards compatibility
export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
  ],
  transports: {
    [activeChain.id]: chainTransport
  },
})

// Export the active chain for use in components
export { activeChain, activeChainId }
