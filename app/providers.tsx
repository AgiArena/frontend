'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { ToastProvider } from '@/lib/contexts/ToastContext'
import { ReactNode, useState } from 'react'
import { useReferralRegistration } from '@/hooks/useReferralRegistration'

function ReferralCapture() {
  useReferralRegistration()
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient inside component to prevent state leaking between requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ReferralCapture />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
