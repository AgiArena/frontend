'use client'

import { useAccount } from 'wagmi'
import { useUsdcBalance } from '@/hooks/useUsdcBalance'
import { useEscrowedAmount } from '@/hooks/useEscrowedAmount'
import { getAddressUrl } from '@/lib/utils/basescan'
import { formatUsdcAmount } from '@/lib/utils/formatters'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'

/**
 * USDC Balance Card Component
 * Displays total USDC balance, available for betting, and escrowed amounts
 * Uses Shadcn/ui Card component with JetBrains Mono font for numbers
 * Auto-refreshes every 5 seconds via hooks
 */
export function USDCBalanceCard() {
  const { address, isConnected } = useAccount()
  const { balance, formatted: totalFormatted, isLoading: balanceLoading, isError: balanceError } = useUsdcBalance()
  const { escrowed, formatted: escrowedFormatted, isLoading: escrowLoading } = useEscrowedAmount()

  const isLoading = balanceLoading || escrowLoading

  // Calculate available = total - escrowed (escrowed is always defined as bigint)
  const available = balance !== undefined && balance >= escrowed
    ? balance - escrowed
    : BigInt(0)

  const availableFormatted = formatUsdcAmount(available)

  // Disconnected state
  if (!isConnected) {
    return (
      <Card className="border-white/20">
        <CardContent className="p-6">
          <p className="text-white/60 text-center">Connect wallet to view balance</p>
        </CardContent>
      </Card>
    )
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <Card className="border-white/20">
        <CardHeader>
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-8 bg-white/10 rounded animate-pulse" />
          <div className="h-6 bg-white/10 rounded animate-pulse w-2/3" />
          <div className="h-6 bg-white/10 rounded animate-pulse w-1/2" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (balanceError) {
    return (
      <Card className="border-white/20">
        <CardHeader>
          <CardTitle>USDC Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-accent text-sm">Failed to load balance. Retrying...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/20">
      <CardHeader>
        <CardTitle>USDC Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance - Hero */}
        <div>
          <p className="text-white/60 text-xs mb-1">Total Balance</p>
          <p className="text-white text-3xl font-mono font-bold">${totalFormatted}</p>
        </div>

        {/* Available for Betting */}
        <div>
          <p className="text-white/60 text-xs mb-1">Available for Betting</p>
          <p className="text-white text-xl font-mono">${availableFormatted}</p>
        </div>

        {/* Escrowed in Bets */}
        <div>
          <p className="text-white/60 text-xs mb-1">Escrowed in Bets</p>
          <p className="text-white text-xl font-mono">${escrowedFormatted}</p>
        </div>
      </CardContent>

      {/* Verify on BaseScan Link */}
      {address && (
        <CardFooter>
          <a
            href={getAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 text-xs hover:text-white underline transition-colors"
          >
            Verify on BaseScan
          </a>
        </CardFooter>
      )}
    </Card>
  )
}
