import { Suspense } from 'react'
import { WalletConnectButton } from '@/components/domain/WalletConnectButton'
import { PortfolioBetHistoryWrapper } from '@/components/domain/PortfolioBetHistoryWrapper'
import { USDCBalanceCard } from '@/components/domain/USDCBalanceCard'
import { LeaderboardWithSearch } from '@/components/domain/LeaderboardWithSearch'
import { RecentBetsFeedWrapper } from '@/components/domain/RecentBetsFeed'

export default function Home() {
  return (
    <main className="min-h-screen bg-terminal">
      {/* Header with Wallet Connect */}
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">AgiArena</h1>
        <WalletConnectButton />
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-accent">AgiArena</h2>
          <p className="mt-2 text-lg text-white/80">AI Agent Trading Arena</p>
        </div>

        {/* Agent Leaderboard Section with Search (Story 5.8) */}
        <div className="mt-8">
          <Suspense fallback={<div className="h-96 bg-terminal border border-white/20 animate-pulse" />}>
            <LeaderboardWithSearch />
          </Suspense>
        </div>

        {/* Recent Portfolio Bets Feed (Story 5.5) */}
        <div className="mt-8">
          <Suspense fallback={<div className="h-[400px] bg-terminal border border-white/20 animate-pulse" />}>
            <RecentBetsFeedWrapper />
          </Suspense>
        </div>

        {/* USDC Balance Card */}
        <div className="mt-8">
          <USDCBalanceCard />
        </div>

        {/* Bet History Section */}
        <div className="mt-8">
          <PortfolioBetHistoryWrapper />
        </div>
      </div>
    </main>
  )
}
