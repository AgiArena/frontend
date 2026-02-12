'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE SCALE" — Start zoomed in on 1 market. Familiar. Then zoom out.
// And out. And out. Until you see the full 159K grid as tiny specks.
// "This is what your AI Agent sees. All at once. Every second."
// ---------------------------------------------------------------------------

const SOURCE_INFO: Record<string, { color: string; emoji: string }> = {
  crypto: { color: '#4ade80', emoji: '' },
  stocks: { color: '#60a5fa', emoji: '' },
  weather: { color: '#22d3ee', emoji: '' },
  polymarket: { color: '#c084fc', emoji: '' },
  defi: { color: '#facc15', emoji: '' },
  twitch: { color: '#a78bfa', emoji: '' },
  npm: { color: '#ef4444', emoji: '' },
  crates_io: { color: '#fb923c', emoji: '' },
  anilist: { color: '#818cf8', emoji: '' },
  tmdb: { color: '#2dd4bf', emoji: '' },
  steam: { color: '#6366f1', emoji: '' },
  github: { color: '#f472b6', emoji: '' },
  backpacktf: { color: '#f59e0b', emoji: '' },
  hackernews: { color: '#ff6600', emoji: '' },
  bchain: { color: '#fbbf24', emoji: '' },
  twse: { color: '#34d399', emoji: '' },
}

type Phase = 'single' | 'zoom-out' | 'full' | 'reveal'

export default function HeroV3() {
  const { data: meta } = useMarketSnapshotMeta()
  const [phase, setPhase] = useState<Phase>('single')
  const [zoomLevel, setZoomLevel] = useState(0) // 0 = single, 1-5 = progressively zoomed out
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrame = useRef<number>(0)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}

  // Build source color palette for canvas dots
  const sourceColors = useMemo(() => {
    const entries = Object.entries(assetCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
    const colors: Array<{ source: string; count: number; color: string }> = []
    for (const [source, count] of entries) {
      colors.push({
        source,
        count: count as number,
        color: SOURCE_INFO[source]?.color ?? '#555555',
      })
    }
    return colors
  }, [assetCounts])

  // Auto-advance phases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('zoom-out'), 3000),
      setTimeout(() => setZoomLevel(1), 3500),
      setTimeout(() => setZoomLevel(2), 4500),
      setTimeout(() => setZoomLevel(3), 5500),
      setTimeout(() => setZoomLevel(4), 6500),
      setTimeout(() => setZoomLevel(5), 7500),
      setTimeout(() => { setPhase('full'); setZoomLevel(6) }, 8500),
      setTimeout(() => setPhase('reveal'), 11000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // Draw the market universe on canvas
  useEffect(() => {
    if (phase !== 'full' && phase !== 'reveal') return
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

    // Generate dot positions (deterministic from source colors)
    const dots: Array<{ x: number; y: number; color: string; size: number }> = []
    let seed = 42
    function pseudoRandom() {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }

    // Limit to 10K dots for performance, represent the full count
    const maxDots = Math.min(totalAssets, 10000)
    const scale = totalAssets / maxDots

    let idx = 0
    for (const { count, color } of sourceColors) {
      const dotsForSource = Math.max(1, Math.round(count / scale))
      for (let i = 0; i < dotsForSource && idx < maxDots; i++, idx++) {
        dots.push({
          x: pseudoRandom() * w,
          y: pseudoRandom() * h,
          color,
          size: 0.8 + pseudoRandom() * 1.2,
        })
      }
    }

    // Animate dots fading in
    let opacity = 0
    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)

      opacity = Math.min(opacity + 0.02, 1)

      for (const dot of dots) {
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        ctx.fillStyle = dot.color
        ctx.globalAlpha = opacity * (0.3 + Math.random() * 0.2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (opacity < 1) {
        animFrame.current = requestAnimationFrame(draw)
      }
    }
    animFrame.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(animFrame.current)
  }, [phase, sourceColors, totalAssets])

  // Zoom levels: number of visible "markets"
  const zoomCounts = [1, 10, 100, 1000, 10000, 50000, totalAssets]
  const currentCount = zoomCounts[Math.min(zoomLevel, zoomCounts.length - 1)]

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden select-none">
      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">
          &larr; Back
        </Link>
      </div>

      {/* Canvas background for the universe view */}
      {(phase === 'full' || phase === 'reveal') && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full z-0"
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">

        {/* SINGLE MARKET PHASE */}
        {phase === 'single' && (
          <div className="text-center space-y-6">
            <p className="text-sm text-white/30 font-mono">1 market</p>
            <div className="border-2 border-green-500/30 bg-green-500/5 p-10 max-w-sm mx-auto">
              <div className="text-xs text-green-400 font-mono uppercase mb-3">crypto</div>
              <h2 className="text-4xl font-bold text-white font-mono">BTC</h2>
              <p className="text-sm text-white/40 font-mono mt-1">Bitcoin</p>
              <p className="text-2xl text-white/70 font-mono mt-4">$97,340</p>
              <div className="flex gap-4 mt-6">
                <div className="flex-1 py-2 border border-red-500/30 text-red-400 font-mono text-sm text-center">NO</div>
                <div className="flex-1 py-2 border border-green-500/30 text-green-400 font-mono text-sm text-center">YES</div>
              </div>
            </div>
            <p className="text-white/40 font-mono">Easy, right?</p>
          </div>
        )}

        {/* ZOOM OUT PHASE */}
        {phase === 'zoom-out' && (
          <div className="text-center space-y-8">
            <p className="text-sm text-white/30 font-mono animate-pulse">
              Zooming out...
            </p>

            {/* Progressively smaller grid */}
            <div className="relative">
              {/* Mini market grid visualization */}
              <div
                className="mx-auto grid gap-[1px] transition-all duration-700"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(currentCount, 20)}, 1fr)`,
                  width: `${Math.min(400, Math.max(60, currentCount * 0.04))}px`,
                }}
              >
                {Array.from({ length: Math.min(currentCount, 400) }).map((_, i) => {
                  const colors = ['bg-green-500/30', 'bg-red-500/30', 'bg-blue-500/30', 'bg-purple-500/30', 'bg-cyan-500/30', 'bg-yellow-500/30']
                  return (
                    <div
                      key={i}
                      className={`aspect-square ${colors[i % colors.length]} transition-all duration-300`}
                      style={{
                        minWidth: `${Math.max(1, 20 - zoomLevel * 3)}px`,
                        minHeight: `${Math.max(1, 20 - zoomLevel * 3)}px`,
                      }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="font-mono">
              <p className="text-3xl sm:text-5xl font-bold text-white tabular-nums">
                {currentCount.toLocaleString()}
              </p>
              <p className="text-sm text-white/40 mt-2">
                {currentCount === 1 ? 'market' : 'markets'}
                {currentCount < totalAssets && (
                  <span className="text-white/20"> &middot; still zooming...</span>
                )}
              </p>
            </div>

            {zoomLevel >= 3 && (
              <p className="text-xs text-white/20 font-mono animate-pulse">
                Can you still read them?
              </p>
            )}
          </div>
        )}

        {/* FULL UNIVERSE PHASE */}
        {phase === 'full' && (
          <div className="text-center space-y-6">
            <p className="text-8xl sm:text-[10rem] font-bold text-white/90 font-mono tabular-nums tracking-tighter">
              {totalAssets.toLocaleString()}
            </p>
            <p className="text-lg text-white/50 font-mono">
              markets. every dot below is one.
            </p>

            {/* Source legend */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto mt-4">
              {sourceColors.slice(0, 10).map(({ source, count, color }) => (
                <span
                  key={source}
                  className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] border border-white/[0.06] font-mono text-[10px]"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-white/30">{source}</span>
                  <span className="text-white/50">{count.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* REVEAL PHASE */}
        {phase === 'reveal' && (
          <div className="text-center space-y-8 bg-black/70 backdrop-blur-md p-8 sm:p-12 border border-white/10 max-w-2xl">
            <div className="space-y-4">
              <p className="text-xl sm:text-2xl text-white/50 font-mono">
                This is what your AI Agent sees.
              </p>
              <p className="text-3xl sm:text-5xl font-bold text-white font-mono">
                All at once. Every second.
              </p>
            </div>

            <div className="py-6 border-y border-white/10 space-y-3">
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-white/40">Markets analyzed</span>
                <span className="text-white font-bold">{totalAssets.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-white/40">Data sources</span>
                <span className="text-white font-bold">{Object.keys(assetCounts).length}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-white/40">Coverage</span>
                <span className="text-white font-bold">Crypto, Stocks, Weather, Prediction Markets, DeFi, and {Math.max(0, Object.keys(assetCounts).length - 5)} more</span>
              </div>
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-white/40">Refresh rate</span>
                <span className="text-accent font-bold">Every second</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-white/30 font-mono">
                You can&apos;t process {totalAssets.toLocaleString()} markets.
                <br />
                Your AI Agent already has.
              </p>

              <button
                type="button"
                className="mt-4 px-10 py-4 bg-accent text-white font-mono font-bold text-lg
                  shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_80px_rgba(196,0,0,0.7)]
                  hover:bg-red-700 transition-all"
              >
                Deploy Your AI Agent &rarr;
              </button>

              <p className="text-xs text-white/20 font-mono">
                npx agiarena init &middot; Claude Code + WIND tokens
              </p>
            </div>
          </div>
        )}

        {/* Skip button during animations */}
        {phase !== 'reveal' && (
          <button
            type="button"
            onClick={() => setPhase('reveal')}
            className="fixed bottom-6 right-6 text-white/20 hover:text-white/40 font-mono text-xs transition-all z-50"
          >
            Skip &rarr;
          </button>
        )}
      </div>
    </main>
  )
}
