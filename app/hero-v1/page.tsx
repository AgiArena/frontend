'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE GRID" — Massive full-screen grid of market tiles.
// Click YES (green) / NO (red) on each. Tiles keep loading. You never finish.
// Progress bar is pathetically small. Then: the punchline.
// ---------------------------------------------------------------------------

interface MarketTile {
  id: string
  symbol: string
  name: string
  source: string
  value: string
  changePct: number
}

// Generate deterministic sample markets from real source distribution
function generateMarkets(assetCounts: Record<string, number>, total: number): MarketTile[] {
  const SYMBOLS: Record<string, string[]> = {
    crypto: ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'UNI', 'AAVE', 'MATIC', 'ATOM', 'FTM', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'PYTH', 'JUP', 'WIF', 'BONK', 'PEPE', 'SHIB', 'LTC', 'BCH'],
    stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOG', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'QCOM', 'AVGO', 'ADBE', 'PYPL', 'SQ', 'SHOP', 'UBER', 'ABNB'],
    weather: ['NYC:temp', 'LA:temp', 'London:rain', 'Tokyo:wind', 'Paris:temp', 'Berlin:pm25', 'Sydney:temp', 'Dubai:temp', 'Mumbai:rain', 'Seoul:wind', 'Rome:temp', 'Cairo:temp', 'SP:rain', 'Moscow:temp', 'Bangkok:rain'],
    polymarket: ['BTC $200K?', 'ETH $10K?', 'NBA Finals', 'Fed Rate', 'Trump 2028', 'AI Regulation', 'Mars 2030?', 'Next iPhone', 'Oscar Best', 'UFC 310', 'El Nino?', 'Recession?', 'BTC ETF', 'Rate Cut?', 'Moon Base?'],
    defi: ['ETH TVL', 'UNI vol', 'AAVE tvl', 'SOL tvl', 'CURVE lp', 'MKR tvl', 'COMP tvl', 'GMX vol', 'DYDX vol', 'SUSHI lp', 'BAL tvl', 'YFI tvl', '1INCH vol', 'PERP vol', 'SNX tvl'],
    twitch: ['xQc', 'shroud', 'pokimane', 'ludwig', 'hasanabi', 'mizkif', 'nmplol', 'lirik', 'summit1g', 'timthetatman', 'myth', 'ninja', 'tfue', 'valkyrae', 'sykkuno'],
    npm: ['react', 'next', 'vue', 'svelte', 'express', 'axios', 'lodash', 'moment', 'webpack', 'vite', 'eslint', 'prettier', 'jest', 'mocha', 'typescript'],
    crates_io: ['serde', 'tokio', 'clap', 'reqwest', 'rand', 'regex', 'chrono', 'anyhow', 'axum', 'diesel', 'warp', 'actix', 'rocket', 'tracing', 'log'],
    tmdb: ['Dune 3', 'Avatar 4', 'MCU 7', 'Batman 2', 'SW Ep X', 'Bond 26', 'Matrix 5', 'JP World', 'Alien 7', 'F&F 12', 'MI 9', 'Shrek 5', 'Toy St 5', 'Frozen 3', 'Inc 3'],
    steam: ['CS2', 'Dota2', 'TF2', 'PUBG', 'Apex', 'Rust', 'ARK', 'Elden', 'Palia', 'Valheim', 'Rimworld', 'Factorio', 'Stardew', 'Terraria', 'Hades2'],
    github: ['linux', 'react', 'vscode', 'flutter', 'rust', 'go', 'swift', 'kotlin', 'deno', 'bun', 'next.js', 'svelte', 'vue', 'angular', 'django'],
    anilist: ['Naruto', 'OnePiece', 'JJK', 'DmnSlyr', 'AoT', 'MHA', 'HxH', 'Bleach', 'DBZ', 'Chainsaw', 'SpyFam', 'Vinland', 'Mushoku', 'Frieren', 'Solo Lv'],
    backpacktf: ['Unusual', 'Strange', 'Vintage', 'Genuine', 'Haunted', 'Killstrk', 'Australm', 'Festive', 'Botkilr', 'Cosmetic'],
    hackernews: ['AI/ML', 'Startup', 'Crypto', 'DevTool', 'Security', 'Cloud', 'Mobile', 'Web3', 'Quantum', 'Robotics'],
  }

  const markets: MarketTile[] = []
  let seed = 42
  function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

  const entries = Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number))
  let generated = 0

  for (const [source, count] of entries) {
    const syms = SYMBOLS[source] || [`${source.slice(0, 3).toUpperCase()}1`, `${source.slice(0, 3).toUpperCase()}2`, `${source.slice(0, 3).toUpperCase()}3`]
    // Generate proportional to real count, but cap for perf
    const toGenerate = Math.min(Math.round((count as number / total) * 2000), 200)

    for (let i = 0; i < toGenerate && generated < 2000; i++) {
      const sym = syms[i % syms.length]
      const suffix = i >= syms.length ? ` #${Math.floor(i / syms.length) + 1}` : ''
      markets.push({
        id: `${source}:${i}`,
        symbol: sym,
        name: `${sym}${suffix}`,
        source,
        value: source === 'weather' ? `${(rng() * 40 - 10).toFixed(1)}°` :
          source === 'polymarket' ? `${(rng() * 100).toFixed(0)}%` :
            source === 'defi' ? `$${(rng() * 100).toFixed(1)}B` :
              `$${(rng() * 1000).toFixed(2)}`,
        changePct: (rng() - 0.5) * 20,
      })
      generated++
    }
  }

  // Shuffle
  for (let i = markets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[markets[i], markets[j]] = [markets[j], markets[i]]
  }

  return markets
}

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#4ade80', stocks: '#60a5fa', weather: '#22d3ee', polymarket: '#c084fc',
  defi: '#facc15', twitch: '#a78bfa', npm: '#ef4444', crates_io: '#fb923c',
  tmdb: '#2dd4bf', steam: '#6366f1', github: '#f472b6', anilist: '#818cf8',
  backpacktf: '#f59e0b', hackernews: '#ff6600', bchain: '#fbbf24', twse: '#34d399',
}

type Vote = 'yes' | 'no'

export default function HeroV1() {
  const { data: meta } = useMarketSnapshotMeta()
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map())
  const [showReveal, setShowReveal] = useState(false)
  const [cols, setCols] = useState(8)
  const gridRef = useRef<HTMLDivElement>(null)
  const revealTriggered = useRef(false)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}
  const markets = useMemo(() => generateMarkets(assetCounts, totalAssets), [assetCounts, totalAssets])

  // Responsive columns
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w >= 1400) setCols(12)
      else if (w >= 1200) setCols(10)
      else if (w >= 1000) setCols(8)
      else if (w >= 768) setCols(6)
      else if (w >= 640) setCols(4)
      else setCols(3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Trigger reveal after enough votes
  useEffect(() => {
    if (votes.size >= 8 && !revealTriggered.current) {
      revealTriggered.current = true
      setTimeout(() => setShowReveal(true), 600)
    }
  }, [votes.size])

  const handleVote = useCallback((id: string, type: Vote) => {
    setVotes(prev => {
      const next = new Map(prev)
      if (next.get(id) === type) next.delete(id)
      else next.set(id, type)
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
  const pctDone = totalAssets > 0 ? ((totalVotes / totalAssets) * 100) : 0
  const hoursToFinish = totalVotes > 0 ? Math.ceil((totalAssets - totalVotes) / totalVotes * 3 / 60) : null

  return (
    <main className="min-h-screen bg-terminal flex flex-col relative">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-green-400">{yesCount} YES</span>
            <span className="text-red-400">{noCount} NO</span>
            <span className="text-white/20">|</span>
            <span className="text-white/40">{totalVotes} of {totalAssets.toLocaleString()}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-[3px] bg-white/5">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${Math.max(0.05, pctDone)}%` }}
          />
        </div>
        {totalVotes > 0 && (
          <div className="text-center py-1 bg-black/50">
            <span className="font-mono text-[10px] text-white/20">
              {pctDone.toFixed(4)}% complete
              {hoursToFinish !== null && ` · ~${hoursToFinish}h to finish at this rate`}
            </span>
          </div>
        )}
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
                {totalVotes} clicks. {(totalAssets - totalVotes).toLocaleString()} to go.
                {hoursToFinish !== null && <> At this rate: <span className="text-accent">{hoursToFinish} hours</span>.</>}
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

      {/* Grid */}
      <div className="flex-1 overflow-y-auto" ref={gridRef}>
        <div
          className="grid gap-[1px] p-[1px]"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {markets.map((m) => {
            const vote = votes.get(m.id)
            const isUp = m.changePct >= 0
            return (
              <div
                key={m.id}
                className={`
                  p-2 border font-mono transition-all duration-100 relative group
                  ${vote === 'yes'
                    ? 'bg-green-500/20 border-green-500/40'
                    : vote === 'no'
                      ? 'bg-red-500/20 border-red-500/40'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                  }
                `}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: SOURCE_COLORS[m.source] || '#666' }}
                  >
                    {m.source.length > 7 ? m.source.slice(0, 6) : m.source}
                  </span>
                  <span className={`text-[9px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{m.changePct.toFixed(1)}%
                  </span>
                </div>

                {/* Symbol */}
                <div className="text-xs font-bold text-white truncate">{m.symbol}</div>
                <div className="text-[10px] text-white/40 truncate">{m.value}</div>

                {/* YES/NO buttons */}
                <div className="flex gap-[2px] mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleVote(m.id, 'yes')}
                    className={`flex-1 py-1 text-[9px] font-bold border transition-all
                      ${vote === 'yes'
                        ? 'bg-green-500/30 border-green-500/50 text-green-300'
                        : 'border-white/10 text-white/20 hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/10'
                      }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote(m.id, 'no')}
                    className={`flex-1 py-1 text-[9px] font-bold border transition-all
                      ${vote === 'no'
                        ? 'bg-red-500/30 border-red-500/50 text-red-300'
                        : 'border-white/10 text-white/20 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* "More" indicator at bottom */}
        <div className="py-12 text-center border-t border-white/5">
          <p className="font-mono text-sm text-white/30">
            Showing {markets.length.toLocaleString()} of {totalAssets.toLocaleString()} markets
          </p>
          <p className="font-mono text-xs text-white/15 mt-1">
            {(totalAssets - markets.length).toLocaleString()} more not shown...
          </p>
        </div>
      </div>
    </main>
  )
}
