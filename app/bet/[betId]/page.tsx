import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { notFound } from 'next/navigation'

interface BetDetailPageProps {
  params: Promise<{ betId: string }>
}

interface BetData {
  betId: string
  creatorAddress: string
  betHash: string
  portfolioSize: number
  amount: string
  matchedAmount: string
  status: string
  txHash: string
  blockNumber: number
  createdAt: string
  updatedAt: string
  portfolioJson?: {
    expiry?: string
    markets: Array<{
      conditionId: string
      position: string
      weight?: number
    }>
  }
}

async function getBetData(betId: string): Promise<BetData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'https://63.179.141.230'
    const res = await fetch(`${backendUrl}/api/bets/${betId}`, {
      next: { revalidate: 10 }, // Revalidate every 10 seconds
    })

    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`Failed to fetch bet: ${res.statusText}`)
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching bet:', error)
    return null
  }
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  return `$${num.toFixed(2)}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-400'
    case 'partially_matched':
      return 'text-blue-400'
    case 'fully_matched':
      return 'text-green-400'
    case 'resolved':
      return 'text-purple-400'
    case 'settled':
      return 'text-cyan-400'
    case 'cancelled':
      return 'text-red-400'
    default:
      return 'text-white/60'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Match'
    case 'partially_matched':
      return 'Partially Matched'
    case 'fully_matched':
      return 'Fully Matched - Awaiting Resolution'
    case 'resolved':
      return 'Resolved - Awaiting Settlement'
    case 'settled':
      return 'Settled'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

/**
 * Bet Detail Page
 *
 * Shows full bet details including:
 * - Portfolio positions and market details
 * - Bet amount and matched status
 * - Transaction history
 */
export default async function BetDetailPage({ params }: BetDetailPageProps) {
  const { betId } = await params
  const bet = await getBetData(betId)

  if (!bet) {
    notFound()
  }

  const matchPercentage = bet.amount !== '0'
    ? (parseFloat(bet.matchedAmount) / parseFloat(bet.amount) * 100).toFixed(0)
    : '0'

  return (
    <main className="min-h-screen bg-terminal">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white transition-colors font-mono text-sm">
          ← Back to Home
        </Link>
        <h1 className="text-xl font-bold text-white font-mono">Bet Details</h1>
        <div className="w-20" />
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Main Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-mono">Bet #{bet.betId}</CardTitle>
              <span className={`font-mono text-sm ${getStatusColor(bet.status)}`}>
                {getStatusLabel(bet.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Bet Amount</p>
                <p className="text-white font-mono text-lg">{formatAmount(bet.amount)}</p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Matched</p>
                <p className="text-white font-mono text-lg">
                  {formatAmount(bet.matchedAmount)}
                  <span className="text-white/40 text-sm ml-2">({matchPercentage}%)</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${matchPercentage}%` }}
              />
            </div>

            {/* Creator */}
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Creator</p>
              <Link
                href={`/agent/${bet.creatorAddress}`}
                className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
              >
                {formatAddress(bet.creatorAddress)}
              </Link>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Created</p>
                <p className="text-white/80 font-mono">
                  {new Date(bet.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Updated</p>
                <p className="text-white/80 font-mono">
                  {new Date(bet.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Card */}
        {bet.portfolioJson && bet.portfolioJson.markets.length > 0 && (
          <Card className="border-white/20">
            <CardHeader>
              <CardTitle className="font-mono text-lg">Portfolio Positions</CardTitle>
              {bet.portfolioJson.expiry && (
                <p className="text-white/40 font-mono text-xs">
                  Expiry: {new Date(bet.portfolioJson.expiry).toLocaleString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bet.portfolioJson.markets.map((market, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10"
                  >
                    <div className="flex-1">
                      <p className="text-white/40 font-mono text-xs truncate max-w-[300px]">
                        {market.conditionId}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {market.weight && (
                        <span className="text-white/40 font-mono text-xs">
                          {market.weight}%
                        </span>
                      )}
                      <span className={`font-mono text-sm font-bold ${
                        market.position.toUpperCase() === 'YES'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {market.position.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Info Card */}
        <Card className="border-white/20">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Bet Hash</p>
              <p className="text-white/80 font-mono text-xs break-all">{bet.betHash}</p>
            </div>
            <div>
              <p className="text-white/40 font-mono text-xs uppercase">Transaction</p>
              <a
                href={`https://basescan.org/tx/${bet.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-mono text-xs break-all"
              >
                {bet.txHash}
              </a>
            </div>
            {bet.blockNumber && (
              <div>
                <p className="text-white/40 font-mono text-xs uppercase">Block</p>
                <a
                  href={`https://basescan.org/block/${bet.blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
                >
                  {bet.blockNumber.toLocaleString()}
                </a>
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
