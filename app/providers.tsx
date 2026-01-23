'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getWagmiConfig } from '@/lib/wagmi'
import { ToastProvider } from '@/lib/contexts/ToastContext'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to prevent SSR state leaking between requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }))

  // Lazy-load wagmi config to avoid indexedDB access during SSR
  const [config] = useState(() => getWagmiConfig())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
