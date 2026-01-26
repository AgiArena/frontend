import { createConfig, http, fallback } from 'wagmi'
import { type Chain } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Index L3 (Orbit) chain definition - the only supported network
export const indexL3: Chain = {
  id: 111222333,
  name: 'Index L3',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://index.rpc.zeeve.net'] },
  },
}

// RPC configuration with fallback support
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://index.rpc.zeeve.net'
const fallbackRpcUrl = process.env.NEXT_PUBLIC_RPC_FALLBACK_URL

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

// Lazy initialization function for SSR safety
// Config is created on first call (client-side only)
let config: ReturnType<typeof createConfig> | null = null

export function getWagmiConfig() {
  if (!config) {
    config = createConfig({
      chains: [indexL3],
      connectors: [
        injected(), // MetaMask, Coinbase Wallet, etc.
        ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
      ],
      transports: {
        [indexL3.id]: chainTransport
      },
    })
  }
  return config
}

// Also export as wagmiConfig for backwards compatibility
export const wagmiConfig = createConfig({
  chains: [indexL3],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    ...(isWcConfigured ? [walletConnect({ projectId: wcProjectId! })] : [])
  ],
  transports: {
    [indexL3.id]: chainTransport
  },
})

// Export the active chain for use in components
export const activeChain = indexL3
export const activeChainId = indexL3.id
