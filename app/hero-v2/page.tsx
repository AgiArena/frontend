'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE FEED" — Bloomberg-terminal style. Markets scroll in continuously.
// Each row has YES/NO. Markets spawn faster than you can vote.
// A "pending" queue grows. You fall behind. Then: the punchline.
// ---------------------------------------------------------------------------

interface FeedMarket {
  id: number
  symbol: string
  name: string
  source: string
  value: string
  changePct: number
  timestamp: number
}

const FEED_DATA: Array<{ symbol: string; name: string; source: string; value: string }> = [
  { symbol: 'BTC', name: 'Bitcoin', source: 'crypto', value: '$97,340' },
  { symbol: 'ETH', name: 'Ethereum', source: 'crypto', value: '$3,421' },
  { symbol: 'SOL', name: 'Solana', source: 'crypto', value: '$187.50' },
  { symbol: 'AAPL', name: 'Apple Inc.', source: 'stocks', value: '$198.11' },
  { symbol: 'TSLA', name: 'Tesla', source: 'stocks', value: '$412.30' },
  { symbol: 'NVDA', name: 'NVIDIA', source: 'stocks', value: '$721.05' },
  { symbol: 'paris:temp', name: 'Paris Temp', source: 'weather', value: '12.3°C' },
  { symbol: 'BTC $200K?', name: 'Bitcoin reaches $200K', source: 'polymarket', value: '42%' },
  { symbol: 'ETH TVL', name: 'Ethereum TVL', source: 'defi', value: '$62.1B' },
  { symbol: 'DOGE', name: 'Dogecoin', source: 'crypto', value: '$0.184' },
  { symbol: 'MSFT', name: 'Microsoft', source: 'stocks', value: '$415.60' },
  { symbol: 'xQc', name: 'xQc viewers', source: 'twitch', value: '45.2K' },
  { symbol: 'react', name: 'React downloads', source: 'npm', value: '24.1M' },
  { symbol: 'NBA Finals', name: 'NBA Finals winner', source: 'polymarket', value: '31%' },
  { symbol: 'tokyo:rain', name: 'Tokyo Rainfall', source: 'weather', value: '2.1mm' },
  { symbol: 'serde', name: 'Serde crate', source: 'crates_io', value: '198M' },
  { symbol: 'AVAX', name: 'Avalanche', source: 'crypto', value: '$38.20' },
  { symbol: 'UNI', name: 'Uniswap vol', source: 'defi', value: '$2.8B' },
  { symbol: 'AMZN', name: 'Amazon', source: 'stocks', value: '$185.20' },
  { symbol: 'Dune 3', name: 'Dune 3 boxoffice', source: 'tmdb', value: '$680M' },
  { symbol: 'CS2', name: 'Counter-Strike 2', source: 'steam', value: '1.2M' },
  { symbol: 'linux', name: 'Linux stars', source: 'github', value: '178K' },
  { symbol: 'JJK', name: 'Jujutsu Kaisen', source: 'anilist', value: '8.6' },
  { symbol: 'XRP', name: 'Ripple', source: 'crypto', value: '$2.41' },
  { symbol: 'london:wind', name: 'London Wind', source: 'weather', value: '18km/h' },
  { symbol: 'Fed Rate', name: 'Next Fed decision', source: 'polymarket', value: '67%' },
  { symbol: 'GOOG', name: 'Alphabet', source: 'stocks', value: '$171.22' },
  { symbol: 'ADA', name: 'Cardano', source: 'crypto', value: '$0.642' },
  { symbol: 'LINK', name: 'Chainlink', source: 'crypto', value: '$18.30' },
  { symbol: 'DOT', name: 'Polkadot', source: 'crypto', value: '$7.85' },
]

const SOURCE_COLORS: Record<string, string> = {
  crypto: 'text-green-400', stocks: 'text-blue-400', weather: 'text-cyan-400',
  polymarket: 'text-purple-400', defi: 'text-yellow-400', twitch: 'text-violet-400',
  npm: 'text-red-300', crates_io: 'text-orange-400', tmdb: 'text-teal-400',
  steam: 'text-indigo-400', github: 'text-pink-400', anilist: 'text-blue-300',
}

type Vote = 'yes' | 'no'

export default function HeroV2() {
  const { data: meta } = useMarketSnapshotMeta()
  const [feed, setFeed] = useState<FeedMarket[]>([])
  const [votes, setVotes] = useState<Map<number, Vote>>(new Map())
  const [showReveal, setShowReveal] = useState(false)
  const [spawnRate, setSpawnRate] = useState(1500) // ms between spawns — gets faster
  const nextId = useRef(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const spawnTimer = useRef<ReturnType<typeof setInterval>>(undefined)
  const revealTriggered = useRef(false)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}

  // Spawn markets into the feed — accelerating
  useEffect(() => {
    let seed = 7
    function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

    function spawn() {
      const template = FEED_DATA[nextId.current % FEED_DATA.length]
      const market: FeedMarket = {
        id: nextId.current++,
        ...template,
        changePct: (rng() - 0.5) * 20,
        timestamp: Date.now(),
      }
      setFeed(prev => [market, ...prev].slice(0, 100))
    }

    // Initial batch
    for (let i = 0; i < 5; i++) spawn()

    spawnTimer.current = setInterval(spawn, spawnRate)

    return () => clearInterval(spawnTimer.current)
  }, [spawnRate])

  // Accelerate spawn rate over time
  useEffect(() => {
    const accel = setInterval(() => {
      setSpawnRate(prev => Math.max(300, prev - 100))
    }, 5000)
    return () => clearInterval(accel)
  }, [])

  // Trigger reveal
  useEffect(() => {
    if (votes.size >= 10 && !revealTriggered.current) {
      revealTriggered.current = true
      setTimeout(() => setShowReveal(true), 600)
    }
  }, [votes.size])

  const handleVote = useCallback((id: number, type: Vote) => {
    setVotes(prev => {
      const next = new Map(prev)
      next.set(id, type)
      return next
    })
  }, [])

  const yesCount = useMemo(() => {
    let c = 0; for (const v of votes.values()) if (v === 'yes') c++; return c
  }, [votes])
  const noCount = useMemo(() => {
    let c = 0; for (const v of votes.values()) if (v === 'no') c++; return c
  }, [votes])
  const totalVotes = yesCount + noCount
  const pending = feed.length - totalVotes
  const pctDone = ((totalVotes / totalAssets) * 100)
  const hoursToFinish = totalVotes > 0 ? Math.ceil((totalAssets - totalVotes) / totalVotes * 5 / 60) : null

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
            <div className="flex items-center gap-3 font-mono text-sm">
              <span className="text-green-400">{yesCount} Y</span>
              <span className="text-red-400">{noCount} N</span>
              <span className="text-white/20">|</span>
              <span className="text-white/40">{totalVotes}/{totalAssets.toLocaleString()}</span>
            </div>
          </div>

          {/* Pending queue warning */}
          {pending > 3 && (
            <div className="flex items-center justify-between bg-accent/10 border border-accent/30 px-3 py-1.5 font-mono text-xs">
              <span className="text-accent">
                {pending} markets waiting for your decision
              </span>
              <span className="text-white/30">
                New market every {(spawnRate / 1000).toFixed(1)}s
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="mt-2 h-[3px] bg-white/5">
            <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(0.05, pctDone)}%` }} />
          </div>
          <p className="text-center font-mono text-[10px] text-white/15 mt-1">
            {pctDone.toFixed(4)}% of {totalAssets.toLocaleString()} markets
          </p>
        </div>
      </div>

      {/* Reveal overlay */}
      {showReveal && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-xl">
            <div className="space-y-2">
              <p className="text-3xl sm:text-5xl font-bold text-white font-mono">
                You can&apos;t.
              </p>
              <p className="text-sm text-white/30 font-mono">
                {totalVotes} done. {pending} already piled up. {(totalAssets - totalVotes).toLocaleString()} to go.
                {hoursToFinish !== null && <> At this rate: <span className="text-accent">{hoursToFinish} hours</span>.</>}
              </p>
              <p className="text-xs text-white/20 font-mono">
                Markets keep coming. You fell behind in {(votes.size * spawnRate / 1000).toFixed(0)}s.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-lg sm:text-xl text-white/60 font-mono">
                But your AI Agent can.
              </p>
              <p className="text-sm text-white/40 font-mono">
                Every market. Every second. Simultaneously.
              </p>
              <p className="text-xs text-white/20 font-mono mt-2">
                {totalAssets.toLocaleString()} markets across {Object.keys(assetCounts).length} sources. 24/7.
              </p>
            </div>

            <button
              type="button"
              className="mt-6 px-10 py-4 bg-accent text-white font-mono font-bold text-lg
                shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_80px_rgba(196,0,0,0.7)]
                hover:bg-red-700 transition-all"
            >
              Deploy Your AI Agent &rarr;
            </button>

            <div className="flex items-center justify-center gap-4">
              <p className="text-xs text-white/20 font-mono">npx agiarena init</p>
              <button
                type="button"
                onClick={() => setShowReveal(false)}
                className="text-xs text-white/30 hover:text-white/50 font-mono underline"
              >
                Keep trying (good luck)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto" ref={feedRef}>
        <div className="max-w-3xl mx-auto px-4 py-2 space-y-[1px]">
          {feed.map((m) => {
            const vote = votes.get(m.id)
            const isUp = m.changePct >= 0
            return (
              <div
                key={m.id}
                className={`
                  flex items-center border font-mono transition-all duration-150
                  ${vote === 'yes'
                    ? 'bg-green-500/10 border-green-500/30'
                    : vote === 'no'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }
                  ${!vote ? 'animate-[pulse-red-bet_0.5s_ease-out]' : ''}
                `}
              >
                {/* YES */}
                <button
                  type="button"
                  onClick={() => handleVote(m.id, 'yes')}
                  disabled={!!vote}
                  className={`w-14 h-full flex-shrink-0 flex items-center justify-center border-r text-xs font-bold transition-all
                    ${vote === 'yes'
                      ? 'bg-green-500/20 border-green-500/30 text-green-300'
                      : vote ? 'border-white/5 text-white/10'
                      : 'border-white/10 text-white/15 hover:bg-green-500/10 hover:text-green-400'
                    }`}
                >
                  Y
                </button>

                {/* Market info */}
                <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
                  <span className={`text-[10px] uppercase w-16 flex-shrink-0 ${SOURCE_COLORS[m.source] || 'text-white/30'}`}>
                    {m.source.length > 8 ? m.source.slice(0, 7) : m.source}
                  </span>
                  <span className="text-xs font-bold text-white truncate flex-1">{m.symbol}</span>
                  <span className="text-[10px] text-white/40 flex-shrink-0">{m.value}</span>
                  <span className={`text-[10px] flex-shrink-0 w-14 text-right ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{m.changePct.toFixed(1)}%
                  </span>
                </div>

                {/* NO */}
                <button
                  type="button"
                  onClick={() => handleVote(m.id, 'no')}
                  disabled={!!vote}
                  className={`w-14 h-full flex-shrink-0 flex items-center justify-center border-l text-xs font-bold transition-all
                    ${vote === 'no'
                      ? 'bg-red-500/20 border-red-500/30 text-red-300'
                      : vote ? 'border-white/5 text-white/10'
                      : 'border-white/10 text-white/15 hover:bg-red-500/10 hover:text-red-400'
                    }`}
                >
                  N
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
