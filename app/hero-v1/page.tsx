'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE FLOOD" — Markets rain down like the Matrix. Counter ticks up to 159K.
// User tries to click YES/NO but markets pile up faster than humanly possible.
// After a few seconds of futile clicking: "You can't. But your AI Agent can."
// ---------------------------------------------------------------------------

// Fake market names from real sources for the rain effect
const SOURCES = [
  'crypto', 'stocks', 'weather', 'polymarket', 'defi', 'twitch',
  'npm', 'steam', 'github', 'anilist', 'tmdb', 'crates_io',
]

const SAMPLE_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'DOGE', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOG',
  'paris:temp', 'london:rain', 'tokyo:wind', 'nyc:pm25',
  'Will BTC hit $200K?', 'NBA Finals winner?', 'Next Fed rate?',
  'ethereum:tvl', 'uniswap:vol', 'aave:tvl', 'solana:tvl',
  'xQc', 'shroud', 'pokimane', 'ludwig',
  'react', 'next', 'vue', 'svelte', 'express',
  'tf2:unusual', 'cs2:knife', 'dota2:arcana',
  'naruto', 'one_piece', 'jjk', 'demon_slayer',
  'Oppenheimer', 'Dune 2', 'Deadpool 3', 'Joker 2',
  'rust:serde', 'rust:tokio', 'python:flask',
  'XRP', 'ADA', 'DOT', 'AVAX', 'LINK', 'UNI', 'AAVE',
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI',
  'WIND', 'USDC', 'DAI', 'USDT',
]

interface RainDrop {
  id: number
  x: number
  y: number
  speed: number
  symbol: string
  source: string
  opacity: number
}

interface ClickBurst {
  id: number
  x: number
  y: number
  type: 'yes' | 'no'
}

function useRaindrops(isActive: boolean) {
  const [drops, setDrops] = useState<RainDrop[]>([])
  const nextId = useRef(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) return

    // Spawn drops rapidly
    const spawnInterval = setInterval(() => {
      const batchSize = Math.floor(3 + Math.random() * 5)
      const newDrops: RainDrop[] = []
      for (let i = 0; i < batchSize; i++) {
        newDrops.push({
          id: nextId.current++,
          x: Math.random() * 100,
          y: -5 - Math.random() * 10,
          speed: 0.3 + Math.random() * 0.7,
          symbol: SAMPLE_SYMBOLS[Math.floor(Math.random() * SAMPLE_SYMBOLS.length)],
          source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
          opacity: 0.15 + Math.random() * 0.35,
        })
      }
      setDrops(prev => [...prev.slice(-200), ...newDrops])
    }, 60)

    // Animate
    let lastTime = performance.now()
    function animate(now: number) {
      const dt = (now - lastTime) / 16
      lastTime = now
      setDrops(prev =>
        prev
          .map(d => ({ ...d, y: d.y + d.speed * dt }))
          .filter(d => d.y < 110)
      )
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      clearInterval(spawnInterval)
      cancelAnimationFrame(frameRef.current)
    }
  }, [isActive])

  return drops
}

export default function HeroV1() {
  const { data: meta } = useMarketSnapshotMeta()
  const [phase, setPhase] = useState<'rain' | 'try' | 'reveal'>('rain')
  const [displayCount, setDisplayCount] = useState(0)
  const [userClicks, setUserClicks] = useState(0)
  const [clickBursts, setClickBursts] = useState<ClickBurst[]>([])
  const drops = useRaindrops(true)
  const totalAssets = meta?.totalAssets ?? 159240
  const revealTriggered = useRef(false)
  const burstId = useRef(0)

  // Count up animation
  useEffect(() => {
    if (totalAssets <= 0) return
    const duration = 3000
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayCount(Math.floor(eased * totalAssets))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [totalAssets])

  // Transition to "try" phase after 2s
  useEffect(() => {
    const t = setTimeout(() => setPhase('try'), 2500)
    return () => clearTimeout(t)
  }, [])

  // Auto-reveal after user clicks a few times, or after 12s
  useEffect(() => {
    if (phase === 'try' && userClicks >= 5 && !revealTriggered.current) {
      revealTriggered.current = true
      setTimeout(() => setPhase('reveal'), 800)
    }
  }, [userClicks, phase])

  useEffect(() => {
    if (phase !== 'try') return
    const t = setTimeout(() => {
      if (!revealTriggered.current) {
        revealTriggered.current = true
        setPhase('reveal')
      }
    }, 15000)
    return () => clearTimeout(t)
  }, [phase])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (phase !== 'try') return
    setUserClicks(c => c + 1)
    const type = Math.random() > 0.5 ? 'yes' : 'no' as const
    setClickBursts(prev => [...prev.slice(-10), {
      id: burstId.current++,
      x: e.clientX,
      y: e.clientY,
      type,
    }])
    // Remove burst after animation
    setTimeout(() => {
      setClickBursts(prev => prev.slice(1))
    }, 600)
  }, [phase])

  const sourceCounts = meta?.assetCounts ?? {}
  const sourceList = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 12)

  return (
    <main
      className="min-h-screen bg-terminal relative overflow-hidden cursor-crosshair select-none"
      onClick={handleClick}
    >
      {/* Market rain */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {drops.map(drop => (
          <div
            key={drop.id}
            className="absolute font-mono text-[10px] sm:text-xs whitespace-nowrap"
            style={{
              left: `${drop.x}%`,
              top: `${drop.y}%`,
              opacity: drop.opacity,
              color: drop.source === 'crypto' ? '#4ade80'
                : drop.source === 'stocks' ? '#60a5fa'
                : drop.source === 'polymarket' ? '#c084fc'
                : drop.source === 'weather' ? '#22d3ee'
                : drop.source === 'defi' ? '#facc15'
                : 'rgba(255,255,255,0.3)',
            }}
          >
            {drop.symbol.length > 12 ? drop.symbol.slice(0, 12) + '..' : drop.symbol}
          </div>
        ))}
      </div>

      {/* Click bursts */}
      {clickBursts.map(burst => (
        <div
          key={burst.id}
          className="fixed z-30 pointer-events-none animate-ping"
          style={{ left: burst.x - 20, top: burst.y - 20 }}
        >
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold
            ${burst.type === 'yes' ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'}`}>
            {burst.type === 'yes' ? 'Y' : 'N'}
          </div>
        </div>
      ))}

      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">
          &larr; Back
        </Link>
      </div>

      {/* Center content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4">

        {/* Giant counter */}
        <div className="mb-6">
          <span className="font-mono text-7xl sm:text-8xl md:text-[10rem] font-bold text-white tabular-nums tracking-tighter">
            {displayCount.toLocaleString()}
          </span>
        </div>
        <p className="text-lg sm:text-xl text-white/50 font-mono mb-2">
          live markets. right now.
        </p>

        {/* Source breakdown tickers */}
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mb-12">
          {sourceList.map(([source, count]) => (
            <span
              key={source}
              className="px-2 py-1 bg-white/[0.03] border border-white/[0.08] font-mono text-[10px] text-white/30"
            >
              {source} <span className="text-white/50">{(count as number).toLocaleString()}</span>
            </span>
          ))}
        </div>

        {/* Phase: Try */}
        {phase === 'try' && (
          <div className="text-center animate-pulse">
            <p className="text-xl sm:text-2xl text-white/70 font-mono mb-2">
              Go ahead. Try to set YES or NO on each one.
            </p>
            <p className="text-sm text-white/30 font-mono">
              Click anywhere &middot; You've set {userClicks} of {totalAssets.toLocaleString()}
            </p>
            {userClicks > 0 && (
              <div className="mt-4 w-64 mx-auto">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(0.1, (userClicks / totalAssets) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/20 font-mono mt-1">
                  {((userClicks / totalAssets) * 100).toFixed(4)}% done
                </p>
              </div>
            )}
          </div>
        )}

        {/* Phase: Rain (initial) */}
        {phase === 'rain' && (
          <div className="text-center">
            <p className="text-lg text-white/40 font-mono animate-pulse">
              Counting markets across {Object.keys(sourceCounts).length} sources...
            </p>
          </div>
        )}

        {/* Phase: Reveal */}
        {phase === 'reveal' && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-2xl sm:text-4xl font-bold text-white font-mono">
                You can&apos;t.
              </p>
              {userClicks > 0 && (
                <p className="text-sm text-white/30 font-mono">
                  {userClicks} clicks. {totalAssets.toLocaleString()} to go. At this rate: {Math.ceil(totalAssets / Math.max(userClicks, 1) * 5 / 60)} hours.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-lg sm:text-xl text-white/60 font-mono">
                But your AI Agent can.
              </p>
              <p className="text-sm text-white/40 font-mono">
                Every market. Every second. Simultaneously.
              </p>
            </div>

            <button
              type="button"
              className="mt-8 px-10 py-4 bg-accent text-white font-mono font-bold text-lg
                shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_80px_rgba(196,0,0,0.7)]
                hover:bg-red-700 transition-all"
            >
              Deploy Your AI Agent &rarr;
            </button>

            <p className="text-xs text-white/20 font-mono">
              npx agiarena init &middot; Claude Code + WIND tokens
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
