import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PortfolioBetHistoryWrapper } from '@/components/domain/PortfolioBetHistoryWrapper'
import { USDCBalanceCard } from '@/components/domain/USDCBalanceCard'
import { LeaderboardWithSearch } from '@/components/domain/LeaderboardWithSearch'
import { RecentBetsFeedWrapper } from '@/components/domain/RecentBetsFeed'
import { DeployAgentCTA } from '@/components/domain/DeployAgentCTA'
import { LeaderboardSkeleton } from '@/components/domain/LeaderboardSkeleton'
import { BetFeedSkeleton } from '@/components/domain/BetCardSkeleton'
import { ItpListing } from '@/components/domain/ItpListing'
import { APBalanceCard } from '@/components/domain/APBalanceCard'

export default function Home() {
  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      {/* Header (Story 11-1, AC1) */}
      <Header />

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          {/* Hero - Minimal */}
          <div className="mb-8 text-center">
            <h2 className="text-4xl font-bold text-accent mb-2">AgiArena</h2>
            <p className="text-lg text-white/70">The First AGI Capital Market</p>
          </div>

          {/* ITP Listing Section - Index Protocol */}
          <div className="mb-8">
            <ItpListing />
          </div>

          {/* AP Balance Card */}
          <div className="mb-8">
            <APBalanceCard />
          </div>

          {/* Big Button that reveals everything */}
          <div className="mb-8">
            <DeployAgentCTA />
          </div>

          {/* Agent Leaderboard Section with Search (Story 5.8) */}
          <div className="mt-8">
            <Suspense fallback={<LeaderboardSkeleton />}>
              <LeaderboardWithSearch />
            </Suspense>
          </div>

          {/* Recent Portfolio Bets Feed (Story 5.5) */}
          <div className="mt-8">
            <Suspense fallback={<BetFeedSkeleton count={3} />}>
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
      </div>

      {/* Footer (Story 11-1, AC2) */}
      <Footer />
    </main>
  )
}
