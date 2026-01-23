import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface BetDetailPageProps {
  params: Promise<{ betId: string }>
}

/**
 * Bet Detail Page (Placeholder)
 *
 * AC6: Bet navigation - clicking bet ID navigates to /bet/{betId}
 * Full implementation coming in a future story
 */
export default async function BetDetailPage({ params }: BetDetailPageProps) {
  const { betId } = await params

  return (
    <main className="min-h-screen bg-terminal">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white transition-colors font-mono text-sm">
          Back to Home
        </Link>
        <h1 className="text-xl font-bold text-white">Bet Details</h1>
        <div className="w-20" /> {/* Spacer for alignment */}
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-white/20">
          <CardHeader>
            <CardTitle>Bet #{betId}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-white/80 font-mono text-lg mb-2">
                Bet Detail Page
              </p>
              <p className="text-white/60 font-mono text-sm">
                Full implementation coming in a future story
              </p>
              <p className="text-white/40 font-mono text-xs mt-4">
                This page will display:
              </p>
              <ul className="text-white/40 font-mono text-xs mt-2 space-y-1">
                <li>- Portfolio positions and market details</li>
                <li>- Bet amount and matched status</li>
                <li>- P&L calculation breakdown</li>
                <li>- Transaction history</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-block px-4 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors font-mono text-sm rounded"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
