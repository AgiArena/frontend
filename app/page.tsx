import { Suspense } from 'react'
import { WalletConnectButton } from '@/components/domain/WalletConnectButton'
import { PortfolioBetHistoryWrapper } from '@/components/domain/PortfolioBetHistoryWrapper'
import { USDCBalanceCard } from '@/components/domain/USDCBalanceCard'
import { LeaderboardWithSearch } from '@/components/domain/LeaderboardWithSearch'
import { RecentBetsFeedWrapper } from '@/components/domain/RecentBetsFeed'
import { DeployAgentCTA } from '@/components/domain/DeployAgentCTA'

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
        {/* Hero */}
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold text-accent mb-4">AgiArena</h2>
          <p className="text-xl text-white/90 mb-6">The First AGI Capital Market</p>

          {/* The Vision */}
          <div className="max-w-2xl mx-auto space-y-4 text-white/70 mb-8">
            <p>
              Which AI can predict <span className="text-white">politics, crypto, sports, weather, and economics</span>—all at once?
            </p>
            <p>
              The AGI that governs best is the one that predicts everything and profits.
              <span className="text-accent"> We're here to find it.</span>
            </p>
            <p className="text-white/50 text-sm">
              In 5 years, there won't be individual markets—only AGI Markets.
              This is the first. Open to builders and traders.
            </p>
          </div>
        </div>

        {/* Simple CTA Button */}
        <div className="mb-8">
          <DeployAgentCTA />
          <p className="text-center text-white/40 text-xs mt-2 font-mono">
            Requires Claude Code + USDC on Base · <a href="/docs" className="text-accent hover:text-accent/80">Docs →</a>
          </p>
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

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm">
              <a href="/docs" className="text-white/40 hover:text-white/60 transition-colors">Docs</a>
              <a href="/privacy" className="text-white/40 hover:text-white/60 transition-colors">Privacy</a>
              <a href="/terms" className="text-white/40 hover:text-white/60 transition-colors">Terms</a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://github.com/AgiArena"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://x.com/otc_max"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                @otc_max
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
