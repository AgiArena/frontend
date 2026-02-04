'use client'

import { use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useBilateralBet, useArbitrationStatus } from '@/hooks/useBilateralBets'
import { ArbitrationBadge } from '@/components/domain/ArbitrationBadge'
import {
  getStatusDisplay,
  getStatusColor,
  getStatusBgColor,
  formatWINDAmount,
  truncateAddress,
  isBetTerminal,
  getResolutionTypeDisplay,
} from '@/lib/types/bilateral-bet'
import { getTxUrl, getAddressUrl } from '@/lib/utils/basescan'

interface BilateralBetDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Loading skeleton for bilateral bet detail page
 */
function BilateralBetDetailSkeleton() {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="h-6 w-32 bg-white/10 animate-pulse rounded" />
        <div className="h-8 w-40 bg-white/10 animate-pulse rounded" />
        <div className="w-20" />
      </header>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white/5 p-6 rounded animate-pulse">
          <div className="h-6 w-32 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                <div className="h-6 w-24 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Bet not found component
 */
function BetNotFound({ betId }: { betId: string }) {
  return (
    <main className="min-h-screen bg-terminal">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white font-mono">
          ← Back to Home
        </Link>
      </header>
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Bilateral Bet Not Found</h1>
        <p className="text-white/60 font-mono mb-2">
          No bilateral bet found with ID: {betId}
        </p>
        <Link
          href="/"
          className="inline-block mt-8 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-mono"
        >
          Return to Home
        </Link>
      </div>
    </main>
  )
}

/**
 * Format deadline for display
 */
function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  return date.toLocaleString()
}

/**
 * Bilateral Bet Detail Page
 * Story 4-2: Display bilateral bet details from CollateralVault
 *
 * Shows:
 * - Bet status and parties
 * - Stake amounts and total pot
 * - Deadline and timestamps
 * - Settlement info (if settled)
 * - Arbitration status (if disputed)
 */
export default function BilateralBetDetailPage({ params }: BilateralBetDetailPageProps) {
  const { id } = use(params)
  const betId = parseInt(id, 10)

  const { data: bet, isLoading, isError, error } = useBilateralBet(betId)

  // Fetch arbitration status if bet is in arbitration
  const { data: arbitration } = useArbitrationStatus(
    betId,
    bet?.status === 'in_arbitration'
  )

  if (isLoading) {
    return <BilateralBetDetailSkeleton />
  }

  if (isError || !bet) {
    return <BetNotFound betId={id} />
  }

  const isTerminal = isBetTerminal(bet.status)

  return (
    <main className="min-h-screen bg-terminal">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white transition-colors font-mono text-sm">
          ← Back to Home
        </Link>
        <h1 className="text-xl font-bold text-white font-mono">Bilateral Bet Details</h1>
        <div className="w-20" />
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Main Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-mono">Bilateral Bet #{bet.betId}</CardTitle>
              <span
                className={`px-3 py-1 rounded text-sm font-mono border ${getStatusColor(bet.status)} ${getStatusBgColor(bet.status)}`}
              >
                {getStatusDisplay(bet.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Creator</p>
                <a
                  href={getAddressUrl(bet.creator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                >
                  {truncateAddress(bet.creator, 8)}
                </a>
                <p className="text-green-400 font-mono text-sm mt-1">
                  {formatWINDAmount(bet.creatorAmount)} WIND
                </p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Filler</p>
                <a
                  href={getAddressUrl(bet.filler)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                >
                  {truncateAddress(bet.filler, 8)}
                </a>
                <p className="text-green-400 font-mono text-sm mt-1">
                  {formatWINDAmount(bet.fillerAmount)} WIND
                </p>
              </div>
            </div>

            {/* Total Pot and Deadline */}
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded border border-white/10">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Total Locked</p>
                <p className="text-white font-mono text-xl font-bold">
                  {formatWINDAmount(bet.totalAmount)} WIND
                </p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Deadline</p>
                <p className="text-white font-mono text-sm">
                  {formatDeadline(bet.deadline)}
                </p>
              </div>
            </div>

            {/* Trades Root */}
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Trades Root (Merkle)</p>
              <p className="text-white/70 font-mono text-xs break-all">{bet.tradesRoot}</p>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {bet.committedAt && (
                <div>
                  <p className="text-white/40 font-mono text-xs uppercase">Committed At</p>
                  <p className="text-white/80 font-mono">
                    {new Date(bet.committedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {bet.settledAt && (
                <div>
                  <p className="text-white/40 font-mono text-xs uppercase">Settled At</p>
                  <p className="text-white/80 font-mono">
                    {new Date(bet.settledAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arbitration Card (if in dispute) */}
        {bet.status === 'in_arbitration' && arbitration && (
          <Card className="border-orange-500/30">
            <CardHeader>
              <CardTitle className="font-mono text-orange-400">Arbitration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ArbitrationBadge arbitration={arbitration} compact={false} />
            </CardContent>
          </Card>
        )}

        {/* Settlement Card (if settled) */}
        {isTerminal && (
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle className="font-mono text-cyan-400">Settlement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bet.winner && (
                <div>
                  <p className="text-white/40 font-mono text-xs uppercase">Winner</p>
                  <a
                    href={getAddressUrl(bet.winner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 font-mono text-sm"
                  >
                    {truncateAddress(bet.winner, 8)}
                  </a>
                </div>
              )}

              {bet.resolutionType && (
                <div>
                  <p className="text-white/40 font-mono text-xs uppercase">Resolution Type</p>
                  <p className="text-white font-mono">
                    {getResolutionTypeDisplay(bet.resolutionType)}
                  </p>
                </div>
              )}

              {bet.status === 'custom_payout' && (
                <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded">
                  {bet.creatorPayout && (
                    <div>
                      <p className="text-white/40 font-mono text-xs uppercase">Creator Payout</p>
                      <p className="text-cyan-400 font-mono">
                        {formatWINDAmount(bet.creatorPayout)} WIND
                      </p>
                    </div>
                  )}
                  {bet.fillerPayout && (
                    <div>
                      <p className="text-white/40 font-mono text-xs uppercase">Filler Payout</p>
                      <p className="text-cyan-400 font-mono">
                        {formatWINDAmount(bet.fillerPayout)} WIND
                      </p>
                    </div>
                  )}
                </div>
              )}

              {bet.keeperCount !== undefined && bet.keeperCount > 0 && (
                <div>
                  <p className="text-white/40 font-mono text-xs uppercase">Keeper Votes</p>
                  <p className="text-white font-mono">{bet.keeperCount}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bet.txHash && (
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Transaction Hash</p>
                <a
                  href={getTxUrl(bet.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-xs break-all"
                >
                  {bet.txHash}
                </a>
              </div>
            )}
            {bet.blockNumber && (
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Block Number</p>
                <p className="text-white/80 font-mono">{bet.blockNumber.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors font-mono text-sm rounded"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
