'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE SCALE" — Scroll to zoom out from 1 market to 159K. Trade UP or DOWN.
// Cards shrink until they become dots. Then: "You can't."
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  twitch: '#a78bfa', polymarket: '#c084fc', weather: '#22d3ee', crates_io: '#fb923c',
  tmdb: '#2dd4bf', npm: '#ef4444', crypto: '#4ade80', defi: '#facc15',
  hackernews: '#ff6600', twse: '#34d399', anilist: '#818cf8', steam: '#6366f1',
  github: '#f472b6', stocks: '#60a5fa', backpacktf: '#f59e0b', bchain: '#fbbf24',
  cloudflare: '#f87171', bonds: '#94a3b8', rates: '#a1a1aa', bls: '#78716c',
  caiso: '#fca5a5', imf: '#67e8f9', opensky: '#86efac', tides: '#7dd3fc',
  worldbank: '#fde68a', sec_13f: '#c4b5fd', finra: '#fdba74', futures: '#d8b4fe',
  goes_xray: '#fcd34d', energy_charts: '#a5f3fc', opec: '#fda4af', pypi: '#93c5fd',
  fourchan: '#86efac', zillow: '#f9a8d4',
}

const SAMPLE_MARKETS = [
  { sym: 'BTC', src: 'crypto', val: '$97,340', chg: 2.4 },
  { sym: 'ETH', src: 'crypto', val: '$3,421', chg: -1.2 },
  { sym: 'SOL', src: 'crypto', val: '$187.50', chg: 5.1 },
  { sym: 'AAPL', src: 'stocks', val: '$198.11', chg: 0.8 },
  { sym: 'TSLA', src: 'stocks', val: '$412.30', chg: -3.2 },
  { sym: 'NVDA', src: 'stocks', val: '$721.05', chg: 1.7 },
  { sym: 'paris:temp', src: 'weather', val: '12.3°C', chg: -0.5 },
  { sym: 'BTC $200K?', src: 'polymarket', val: '42%', chg: 3.1 },
  { sym: 'ETH TVL', src: 'defi', val: '$62.1B', chg: 0.2 },
  { sym: 'xQc', src: 'twitch', val: '45.2K', chg: 12.0 },
  { sym: 'react', src: 'npm', val: '24.1M', chg: 0.1 },
  { sym: 'serde', src: 'crates_io', val: '198M', chg: 0.5 },
  { sym: 'DOGE', src: 'crypto', val: '$0.184', chg: -4.1 },
  { sym: 'MSFT', src: 'stocks', val: '$415.60', chg: 0.3 },
  { sym: 'CS2', src: 'steam', val: '1.2M', chg: -2.0 },
  { sym: 'linux', src: 'github', val: '178K', chg: 0.05 },
  { sym: 'XRP', src: 'crypto', val: '$2.41', chg: 1.3 },
  { sym: 'AMZN', src: 'stocks', val: '$185.60', chg: -0.7 },
  { sym: 'Fed Rate', src: 'polymarket', val: '67%', chg: -2.1 },
  { sym: 'UNI', src: 'defi', val: '$2.8B', chg: 0.9 },
]

const LEVELS = [1, 4, 16, 64, 256, 1024, 4096, 16000, 60000, 159240]
const LEVEL_LABELS = [
  'Trade this one. Easy.',
  'A few more. Still easy.',
  'Getting crowded.',
  'Starting to sweat?',
  "Can you even read them?",
  'Just dots now.',
  'A wall of noise.',
  'Still scrolling?',
  'Almost there...',
  'All of them.',
]

type Vote = 'up' | 'down'

export default function HeroV1() {
  const { data: meta } = useMarketSnapshotMeta()
  const [levelIdx, setLevelIdx] = useState(0)
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map())
  const [showReveal, setShowReveal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelAccum = useRef(0)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}
  const currentLevel = LEVELS[Math.min(levelIdx, LEVELS.length - 1)]
  const isFullZoom = levelIdx >= LEVELS.length - 1

  // Scroll to zoom
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      wheelAccum.current += e.deltaY
      if (wheelAccum.current > 80) {
        wheelAccum.current = 0
        setLevelIdx(prev => Math.min(prev + 1, LEVELS.length - 1))
      } else if (wheelAccum.current < -80) {
        wheelAccum.current = 0
        setLevelIdx(prev => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  // Touch swipe support
  const touchStart = useRef(0)
  useEffect(() => {
    function onTouchStart(e: TouchEvent) { touchStart.current = e.touches[0].clientY }
    function onTouchMove(e: TouchEvent) {
      const delta = touchStart.current - e.touches[0].clientY
      if (Math.abs(delta) > 40) {
        touchStart.current = e.touches[0].clientY
        setLevelIdx(prev => delta > 0
          ? Math.min(prev + 1, LEVELS.length - 1)
          : Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', onTouchMove) }
  }, [])

  // Show reveal when fully zoomed out
  useEffect(() => {
    if (isFullZoom) {
      const t = setTimeout(() => setShowReveal(true), 1500)
      return () => clearTimeout(t)
    }
    setShowReveal(false)
  }, [isFullZoom])

  // Draw canvas dots for high zoom levels
  useEffect(() => {
    if (currentLevel < 1024) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    let seed = 42
    function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

    const maxDots = Math.min(currentLevel, 8000)
    const entries = Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number))
    const scale = totalAssets / maxDots

    ctx.clearRect(0, 0, w, h)

    let drawn = 0
    for (const [source, count] of entries) {
      const dotsForSource = Math.max(1, Math.round((count as number) / scale))
      const color = SOURCE_COLORS[source] || '#555'
      ctx.fillStyle = color
      for (let i = 0; i < dotsForSource && drawn < maxDots; i++, drawn++) {
        const x = rng() * w
        const y = rng() * h
        const size = currentLevel > 10000 ? 0.8 + rng() * 0.8 : 1 + rng() * 1.5
        ctx.globalAlpha = 0.3 + rng() * 0.4
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [currentLevel, assetCounts, totalAssets])

  const handleVote = useCallback((key: string, type: Vote) => {
    setVotes(prev => {
      const next = new Map(prev)
      if (next.get(key) === type) next.delete(key)
      else next.set(key, type)
      return next
    })
  }, [])

  const cardSize = currentLevel <= 1 ? 'large' : currentLevel <= 16 ? 'medium' : currentLevel <= 256 ? 'small' : 'dot'
  const gridCols = currentLevel <= 1 ? 1 : currentLevel <= 4 ? 2 : currentLevel <= 16 ? 4 :
    currentLevel <= 64 ? 8 : currentLevel <= 256 ? 16 : 32

  const visibleMarkets = useMemo(() => {
    const count = Math.min(currentLevel, 256)
    return Array.from({ length: count }, (_, i) => {
      const base = SAMPLE_MARKETS[i % SAMPLE_MARKETS.length]
      return { ...base, id: `m${i}` }
    })
  }, [currentLevel])

  const upCount = useMemo(() => { let c = 0; for (const v of votes.values()) if (v === 'up') c++; return c }, [votes])
  const downCount = useMemo(() => { let c = 0; for (const v of votes.values()) if (v === 'down') c++; return c }, [votes])
  const totalVotes = upCount + downCount

  const sourceLegend = useMemo(() =>
    Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 12),
    [assetCounts])

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden select-none">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
      </div>

      {/* Level indicator */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-center">
        <p className="font-mono text-lg text-white/70 tabular-nums font-bold">{currentLevel.toLocaleString()} markets</p>
        <p className="font-mono text-xs text-white/30">{LEVEL_LABELS[Math.min(levelIdx, LEVEL_LABELS.length - 1)]}</p>
      </div>

      {/* Scroll indicator */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5">
        {LEVELS.map((lvl, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              i === levelIdx ? 'w-2 h-5 bg-accent' : i < levelIdx ? 'w-1.5 h-2.5 bg-white/30' : 'w-1.5 h-2.5 bg-white/10'
            }`}
            onClick={() => setLevelIdx(i)}
            title={lvl.toLocaleString()}
          />
        ))}
        <p className="font-mono text-[8px] text-white/20 mt-1" style={{ writingMode: 'vertical-rl' }}>
          scroll to zoom
        </p>
      </div>

      {/* Trade counter */}
      {totalVotes > 0 && (
        <div className="fixed top-4 right-16 z-50 font-mono text-xs space-y-0.5 text-right">
          <div>
            <span className="text-green-400">{upCount}</span>
            <span className="text-white/15 mx-0.5">/</span>
            <span className="text-red-400">{downCount}</span>
          </div>
          <div className="text-white/20">{totalVotes} of {totalAssets.toLocaleString()}</div>
        </div>
      )}

      {/* Canvas for high zoom levels */}
      {currentLevel >= 1024 && (
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0" />
      )}

      {/* Market cards */}
      {currentLevel < 1024 && (
        <div className="flex items-center justify-center min-h-screen px-4 py-20 relative z-10">
          <div
            className="grid gap-[1px] mx-auto transition-all duration-500"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              maxWidth: cardSize === 'large' ? '400px' : cardSize === 'medium' ? '600px' : '900px',
            }}
          >
            {visibleMarkets.map((m) => {
              const vote = votes.get(m.id)

              // Large card (1 market)
              if (cardSize === 'large') {
                return (
                  <div key={m.id} className="border-2 border-white/20 bg-white/[0.02] p-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono uppercase" style={{ color: SOURCE_COLORS[m.src] || '#666' }}>{m.src}</span>
                      <span className={`text-sm font-mono ${m.chg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {m.chg >= 0 ? '+' : ''}{m.chg.toFixed(1)}%
                      </span>
                    </div>
                    <h2 className="text-4xl font-bold text-white font-mono text-center">{m.sym}</h2>
                    <p className="text-xl text-white/50 font-mono text-center mt-2">{m.val}</p>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => handleVote(m.id, 'down')}
                        className={`flex-1 py-3 border-2 font-mono font-bold text-lg transition-all active:scale-95 ${vote === 'down' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-red-500/30 text-red-400/60 hover:border-red-500/60 hover:text-red-400'}`}>
                        DOWN
                      </button>
                      <button type="button" onClick={() => handleVote(m.id, 'up')}
                        className={`flex-1 py-3 border-2 font-mono font-bold text-lg transition-all active:scale-95 ${vote === 'up' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'border-green-500/30 text-green-400/60 hover:border-green-500/60 hover:text-green-400'}`}>
                        UP
                      </button>
                    </div>
                  </div>
                )
              }

              // Medium cards (4-16)
              if (cardSize === 'medium') {
                return (
                  <div key={m.id} className={`border p-2.5 font-mono transition-all ${vote === 'up' ? 'bg-green-500/15 border-green-500/40' : vote === 'down' ? 'bg-red-500/15 border-red-500/40' : 'bg-white/[0.02] border-white/[0.08]'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[m.src] || '#666' }} />
                      <span className="text-xs font-bold text-white truncate">{m.sym}</span>
                      <span className={`text-[9px] ml-auto ${m.chg >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                        {m.chg >= 0 ? '+' : ''}{m.chg.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40">{m.val}</p>
                    <div className="flex gap-1 mt-1.5">
                      <button type="button" onClick={() => handleVote(m.id, 'down')}
                        className={`flex-1 py-0.5 text-[8px] font-bold border transition-all ${vote === 'down' ? 'bg-red-500/30 border-red-500/50 text-red-300' : 'border-white/10 text-white/20 hover:text-red-400 hover:border-red-500/30'}`}>
                        DOWN
                      </button>
                      <button type="button" onClick={() => handleVote(m.id, 'up')}
                        className={`flex-1 py-0.5 text-[8px] font-bold border transition-all ${vote === 'up' ? 'bg-green-500/30 border-green-500/50 text-green-300' : 'border-white/10 text-white/20 hover:text-green-400 hover:border-green-500/30'}`}>
                        UP
                      </button>
                    </div>
                  </div>
                )
              }

              // Small tiles (64-256) — click toggles up/down
              return (
                <div
                  key={m.id}
                  className={`aspect-square flex items-center justify-center cursor-pointer transition-all ${
                    vote === 'up' ? 'bg-green-500/30' : vote === 'down' ? 'bg-red-500/30' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                  }`}
                  style={{ border: `1px solid ${SOURCE_COLORS[m.src] || '#333'}22` }}
                  onClick={() => handleVote(m.id, votes.get(m.id) === 'up' ? 'down' : 'up')}
                  title={`${m.sym} (${m.src}) ${m.val} — click to trade`}
                >
                  <span className="font-mono text-[5px] text-white/20 truncate">{m.sym.slice(0, 3)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full zoom overlay text */}
      {currentLevel >= 1024 && !showReveal && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-7xl sm:text-[8rem] font-bold text-white/80 font-mono tabular-nums tracking-tighter">
            {currentLevel.toLocaleString()}
          </p>
          <p className="text-sm text-white/30 font-mono mt-2">markets — every dot is one</p>
          {currentLevel >= 4096 && (
            <p className="text-xs text-white/15 font-mono mt-4">
              Go on. Trade them all.
            </p>
          )}
          {currentLevel >= 4096 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-md mt-6">
              {sourceLegend.map(([source, count]) => (
                <span key={source} className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px]">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: SOURCE_COLORS[source] || '#444' }} />
                  <span className="text-white/25">{source}</span>
                  <span className="text-white/40">{(count as number).toLocaleString()}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reveal */}
      {showReveal && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-xl bg-black/60 border border-white/10 p-8 sm:p-12">
            <p className="text-5xl sm:text-7xl font-bold text-white font-mono">You can&apos;t.</p>

            <p className="text-sm text-white/30 font-mono">
              {totalVotes > 0
                ? <>{totalVotes} trade{totalVotes !== 1 ? 's' : ''}. {(totalAssets - totalVotes).toLocaleString()} to go. At this rate: {Math.round((totalAssets / totalVotes) * 3 / 3600)} hours.</>
                : <>{totalAssets.toLocaleString()} markets. Zero trades. You just scrolled.</>
              }
            </p>

            <div className="py-4 border-y border-white/10 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-white/40">Markets</span><span className="text-white font-bold">{totalAssets.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Sources</span><span className="text-white font-bold">{Object.keys(assetCounts).length}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Refresh</span><span className="text-accent font-bold">Every second</span></div>
              {totalVotes > 0 && (
                <div className="flex justify-between"><span className="text-white/40">Your trades</span><span className="text-white/30">{totalVotes}</span></div>
              )}
            </div>

            <p className="text-3xl sm:text-4xl font-bold text-accent font-mono">But your AI Agent can.</p>
            <p className="text-lg sm:text-xl text-white/60 font-mono">Every market. Every second. Simultaneously.</p>

            <button type="button" className="px-10 py-4 bg-accent text-white font-mono font-bold text-lg shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_80px_rgba(196,0,0,0.7)] hover:bg-red-700 transition-all">
              Deploy Your AI Agent &rarr;
            </button>
            <p className="text-xs text-white/20 font-mono">npx agiarena init</p>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      {!isFullZoom && levelIdx === 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 text-center">
          <p className="font-mono text-xs text-white/20 animate-bounce">Scroll down to see more</p>
        </div>
      )}
      {!isFullZoom && levelIdx > 0 && levelIdx < 3 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 text-center">
          <p className="font-mono text-xs text-white/15">Keep scrolling</p>
        </div>
      )}
    </main>
  )
}
