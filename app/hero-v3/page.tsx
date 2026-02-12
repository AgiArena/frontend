'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE SCALE v3: LIVE SOURCES" — Sources load in one by one from the real API.
// Each source floods dots onto the canvas with its count. Interactive: click
// to vote but dots are too small. The overwhelm builds progressively as each
// real source arrives with its actual count.
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

interface LoadedSource {
  source: string
  count: number
  color: string
  dotsDrawn: boolean
}

export default function HeroV3() {
  const { data: meta } = useMarketSnapshotMeta()
  const [loadedSources, setLoadedSources] = useState<LoadedSource[]>([])
  const [currentSourceIdx, setCurrentSourceIdx] = useState(-1)
  const [runningTotal, setRunningTotal] = useState(0)
  const [showReveal, setShowReveal] = useState(false)
  const [userClicks, setUserClicks] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const allDotsDrawn = useRef(false)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}

  // Sort sources by count descending
  const sortedSources = useMemo(() =>
    Object.entries(assetCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([source, count]) => ({
        source,
        count: count as number,
        color: SOURCE_COLORS[source] || '#555555',
      })),
    [assetCounts])

  // Progressive source loading — one every 600ms
  useEffect(() => {
    if (sortedSources.length === 0) return

    // Start with the BTC card phase (1 second)
    const timers: ReturnType<typeof setTimeout>[] = []
    let delay = 1500 // after initial BTC card

    sortedSources.forEach((src, i) => {
      timers.push(setTimeout(() => {
        setCurrentSourceIdx(i)
        setLoadedSources(prev => [...prev, { ...src, dotsDrawn: false }])
        setRunningTotal(prev => prev + src.count)
      }, delay))
      // First few sources get more time, then speed up
      delay += i < 3 ? 600 : i < 8 ? 400 : i < 15 ? 250 : 120
    })

    // Show reveal after all sources
    timers.push(setTimeout(() => setShowReveal(true), delay + 1500))

    return () => timers.forEach(clearTimeout)
  }, [sortedSources])

  // Draw dots on canvas as sources load
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || loadedSources.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    if (!allDotsDrawn.current) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      allDotsDrawn.current = true
    }

    let seed = loadedSources.length * 777 + 42
    function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

    // Draw dots for latest source
    const latest = loadedSources[loadedSources.length - 1]
    if (latest.dotsDrawn) return

    const maxDotsPerSource = Math.min(Math.round(latest.count / (totalAssets / 6000)), 2000)
    ctx.fillStyle = latest.color

    for (let i = 0; i < maxDotsPerSource; i++) {
      ctx.globalAlpha = 0.2 + rng() * 0.5
      ctx.beginPath()
      ctx.arc(rng() * w, rng() * h, 0.5 + rng() * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Mark as drawn
    setLoadedSources(prev =>
      prev.map((s, i) => i === prev.length - 1 ? { ...s, dotsDrawn: true } : s)
    )
  }, [loadedSources, totalAssets])

  // Handle clicking on canvas (trying to vote on dots)
  const handleCanvasClick = (e: React.MouseEvent) => {
    setUserClicks(c => c + 1)
    // Show a brief flash at click position
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const isYes = Math.random() > 0.5
    ctx.strokeStyle = isYes ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.stroke()
    // Fade it
    setTimeout(() => {
      ctx.clearRect(x - 10, y - 10, 20, 20)
      // Redraw might be needed but tiny area, acceptable
    }, 300)
  }

  const isInitialPhase = currentSourceIdx < 0

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden select-none">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0 cursor-crosshair"
        onClick={handleCanvasClick}
      />

      {/* Counter + current source */}
      <div className="fixed top-4 right-4 z-50 text-right font-mono">
        <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
          {runningTotal.toLocaleString()}
        </p>
        <p className="text-[10px] text-white/30">markets loaded</p>
        {userClicks > 0 && (
          <p className="text-[10px] text-white/20 mt-1">{userClicks} click{userClicks !== 1 ? 's' : ''} — nice try</p>
        )}
      </div>

      {/* Initial BTC card */}
      {isInitialPhase && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="font-mono text-sm text-white/30">1 market</p>
            <div className="border-2 border-green-500/30 bg-green-500/5 p-10 max-w-sm">
              <div className="text-xs text-green-400 font-mono uppercase mb-3">crypto</div>
              <h2 className="text-4xl font-bold text-white font-mono">BTC</h2>
              <p className="text-sm text-white/40 font-mono mt-1">Bitcoin</p>
              <p className="text-2xl text-white/70 font-mono mt-4">$97,340</p>
              <div className="flex gap-4 mt-6">
                <div className="flex-1 py-2 border border-red-500/30 text-red-400 font-mono text-sm text-center cursor-pointer hover:bg-red-500/10">NO</div>
                <div className="flex-1 py-2 border border-green-500/30 text-green-400 font-mono text-sm text-center cursor-pointer hover:bg-green-500/10">YES</div>
              </div>
            </div>
            <p className="font-mono text-white/40">Easy, right?</p>
            <p className="font-mono text-xs text-white/15 animate-pulse">Loading sources...</p>
          </div>
        </div>
      )}

      {/* Source loading feed */}
      {!isInitialPhase && !showReveal && (
        <div className="fixed left-4 bottom-4 z-30 max-h-[60vh] overflow-hidden flex flex-col-reverse">
          <div className="space-y-1">
            {loadedSources.slice(-12).map((s, i) => (
              <div
                key={s.source}
                className="flex items-center gap-2 font-mono text-xs"
                style={{
                  opacity: i === loadedSources.slice(-12).length - 1 ? 1 : 0.3 + (i / 12) * 0.5,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-white/50 w-24 truncate">{s.source}</span>
                <span className="text-white/70 tabular-nums">{s.count.toLocaleString()}</span>
                {i === loadedSources.slice(-12).length - 1 && (
                  <span className="text-accent animate-pulse text-[10px]">loading...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Center text during loading */}
      {!isInitialPhase && !showReveal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-6xl sm:text-8xl font-bold text-white/60 font-mono tabular-nums tracking-tighter">
              {runningTotal.toLocaleString()}
            </p>
            <p className="text-sm text-white/25 font-mono mt-2">
              {loadedSources.length} of {sortedSources.length} sources loaded
            </p>
            {runningTotal > 5000 && (
              <p className="text-xs text-white/15 font-mono mt-1">
                Try clicking the dots to vote on them
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reveal */}
      {showReveal && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-xl bg-black/60 border border-white/10 p-8 sm:p-12">
            <p className="text-5xl sm:text-7xl font-bold text-white font-mono">You can&apos;t.</p>

            <p className="text-sm text-white/30 font-mono">
              {userClicks > 0
                ? <>{userClicks} click{userClicks !== 1 ? 's' : ''}. {totalAssets.toLocaleString()} markets. At this rate: {Math.round((totalAssets / Math.max(userClicks, 1)) * 2 / 3600)} hours.</>
                : <>{totalAssets.toLocaleString()} markets just loaded. You watched.</>
              }
            </p>

            <div className="py-4 border-y border-white/10 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-white/40">Markets</span><span className="text-white font-bold">{totalAssets.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Sources</span><span className="text-white font-bold">{sortedSources.length}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Refresh</span><span className="text-accent font-bold">Every second</span></div>
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

      {/* Skip button */}
      {!showReveal && !isInitialPhase && (
        <button
          type="button"
          onClick={() => setShowReveal(true)}
          className="fixed bottom-4 right-4 z-50 text-white/15 hover:text-white/30 font-mono text-xs transition-all"
        >
          Skip &rarr;
        </button>
      )}
    </main>
  )
}
