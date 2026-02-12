'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE SCALE v2: CASCADE" — Vote on 1 market → 10 appear → vote → 100 appear.
// Each vote multiplies the visible markets by 10x. Cards shrink per wave.
// By wave 5 they're dots. You CAUSED the overwhelm. Then: the punchline.
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#4ade80', stocks: '#60a5fa', weather: '#22d3ee', polymarket: '#c084fc',
  defi: '#facc15', twitch: '#a78bfa', npm: '#ef4444', crates_io: '#fb923c',
  tmdb: '#2dd4bf', steam: '#6366f1', github: '#f472b6', anilist: '#818cf8',
}

const MARKET_POOL = [
  { sym: 'BTC', src: 'crypto', val: '$97,340' }, { sym: 'ETH', src: 'crypto', val: '$3,421' },
  { sym: 'SOL', src: 'crypto', val: '$187.50' }, { sym: 'AAPL', src: 'stocks', val: '$198.11' },
  { sym: 'TSLA', src: 'stocks', val: '$412.30' }, { sym: 'NVDA', src: 'stocks', val: '$721.05' },
  { sym: 'paris:temp', src: 'weather', val: '12.3°C' }, { sym: 'BTC $200K?', src: 'polymarket', val: '42%' },
  { sym: 'ETH TVL', src: 'defi', val: '$62.1B' }, { sym: 'xQc', src: 'twitch', val: '45.2K' },
  { sym: 'react', src: 'npm', val: '24.1M' }, { sym: 'serde', src: 'crates_io', val: '198M' },
  { sym: 'DOGE', src: 'crypto', val: '$0.184' }, { sym: 'MSFT', src: 'stocks', val: '$415.60' },
  { sym: 'CS2', src: 'steam', val: '1.2M' }, { sym: 'linux', src: 'github', val: '178K' },
  { sym: 'JJK', src: 'anilist', val: '8.6' }, { sym: 'XRP', src: 'crypto', val: '$2.41' },
  { sym: 'Fed Rate', src: 'polymarket', val: '67%' }, { sym: 'UNI', src: 'defi', val: '$2.8B' },
]

type Vote = 'yes' | 'no'
type Wave = { count: number; markets: Array<{ id: string; sym: string; src: string; val: string }> }

const WAVE_SIZES = [1, 10, 100, 1000, 10000, 159240]

export default function HeroV2() {
  const { data: meta } = useMarketSnapshotMeta()
  const [waveIdx, setWaveIdx] = useState(0)
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map())
  const [showReveal, setShowReveal] = useState(false)
  const [waveVoteCount, setWaveVoteCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}
  const currentWaveSize = WAVE_SIZES[Math.min(waveIdx, WAVE_SIZES.length - 1)]
  const isLastWave = waveIdx >= WAVE_SIZES.length - 1

  // Generate markets for current wave
  const wave: Wave = useMemo(() => {
    const count = Math.min(currentWaveSize, 500) // Cap rendered items
    const markets = Array.from({ length: count }, (_, i) => {
      const base = MARKET_POOL[i % MARKET_POOL.length]
      return { ...base, id: `w${waveIdx}-${i}` }
    })
    return { count: currentWaveSize, markets }
  }, [waveIdx, currentWaveSize])

  // Advance wave when user votes in current wave
  const handleVote = useCallback((id: string, type: Vote) => {
    setVotes(prev => {
      const next = new Map(prev)
      next.set(id, type)
      return next
    })
    setWaveVoteCount(c => {
      const newCount = c + 1
      // After 1 vote per wave, advance
      if (newCount >= 1 && !isLastWave) {
        setTimeout(() => {
          setWaveIdx(prev => prev + 1)
          setWaveVoteCount(0)
        }, 400)
      }
      return newCount
    })
  }, [isLastWave])

  // Canvas for large waves
  useEffect(() => {
    if (currentWaveSize < 1000) return
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
    ctx.clearRect(0, 0, w, h)

    let seed = waveIdx * 1000 + 42
    function rng() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

    const maxDots = Math.min(currentWaveSize, 8000)
    const entries = Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number))
    const scale = totalAssets / maxDots

    let drawn = 0
    for (const [source, count] of entries) {
      const n = Math.max(1, Math.round((count as number) / scale))
      ctx.fillStyle = SOURCE_COLORS[source] || '#555'
      for (let i = 0; i < n && drawn < maxDots; i++, drawn++) {
        ctx.globalAlpha = 0.2 + rng() * 0.5
        ctx.beginPath()
        ctx.arc(rng() * w, rng() * h, 0.5 + rng() * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [currentWaveSize, waveIdx, assetCounts, totalAssets])

  // Show reveal on last wave
  useEffect(() => {
    if (isLastWave) {
      const t = setTimeout(() => setShowReveal(true), 2000)
      return () => clearTimeout(t)
    }
  }, [isLastWave])

  const totalVotes = votes.size

  // Card sizing
  const gridCols = currentWaveSize <= 1 ? 1 : currentWaveSize <= 10 ? 3 : currentWaveSize <= 100 ? 8 : 16

  // Source legend
  const sourceLegend = useMemo(() =>
    Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10),
    [assetCounts])

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden select-none">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
      </div>

      {/* Wave indicator */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-center">
        <div className="flex items-center gap-2 mb-1">
          {WAVE_SIZES.map((_, i) => (
            <div key={i} className={`w-8 h-1 rounded-full transition-all ${i <= waveIdx ? 'bg-accent' : 'bg-white/10'}`} />
          ))}
        </div>
        <p className="font-mono text-sm text-white/60 tabular-nums">
          Wave {waveIdx + 1}: {currentWaveSize.toLocaleString()} markets
        </p>
        {waveIdx > 0 && waveIdx < WAVE_SIZES.length - 1 && (
          <p className="font-mono text-[10px] text-white/25">Vote to trigger next wave</p>
        )}
      </div>

      {/* Canvas for big waves */}
      {currentWaveSize >= 1000 && (
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0" />
      )}

      {/* Market grid */}
      {currentWaveSize < 1000 && (
        <div className="flex items-center justify-center min-h-screen px-4 py-20 relative z-10">
          <div
            className="grid gap-[1px] mx-auto transition-all duration-500"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              maxWidth: currentWaveSize <= 1 ? '380px' : currentWaveSize <= 10 ? '550px' : '900px',
            }}
          >
            {wave.markets.map((m) => {
              const vote = votes.get(m.id)

              // Large card (wave 1)
              if (currentWaveSize <= 1) {
                return (
                  <div key={m.id} className="border-2 border-white/20 bg-white/[0.02] p-8">
                    <div className="text-center mb-1">
                      <p className="font-mono text-xs text-white/25 mb-4">1 market. Easy.</p>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono uppercase" style={{ color: SOURCE_COLORS[m.src] }}>{m.src}</span>
                    </div>
                    <h2 className="text-4xl font-bold text-white font-mono text-center">{m.sym}</h2>
                    <p className="text-xl text-white/50 font-mono text-center mt-3">{m.val}</p>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => handleVote(m.id, 'no')}
                        className={`flex-1 py-3 border-2 font-mono font-bold text-lg transition-all active:scale-95 ${vote === 'no' ? 'bg-red-500/20 border-red-500 text-red-300' : 'border-red-500/30 text-red-400/60 hover:border-red-500 hover:text-red-400'}`}>NO</button>
                      <button type="button" onClick={() => handleVote(m.id, 'yes')}
                        className={`flex-1 py-3 border-2 font-mono font-bold text-lg transition-all active:scale-95 ${vote === 'yes' ? 'bg-green-500/20 border-green-500 text-green-300' : 'border-green-500/30 text-green-400/60 hover:border-green-500 hover:text-green-400'}`}>YES</button>
                    </div>
                  </div>
                )
              }

              // Medium cards (wave 2: 10)
              if (currentWaveSize <= 10) {
                return (
                  <div key={m.id} className={`border p-3 font-mono transition-all ${vote === 'yes' ? 'bg-green-500/15 border-green-500/40' : vote === 'no' ? 'bg-red-500/15 border-red-500/40' : 'bg-white/[0.02] border-white/[0.08]'}`}>
                    <span className="text-[9px] uppercase" style={{ color: SOURCE_COLORS[m.src] || '#666' }}>{m.src}</span>
                    <div className="text-sm font-bold text-white mt-0.5">{m.sym}</div>
                    <div className="text-[10px] text-white/40">{m.val}</div>
                    <div className="flex gap-1 mt-1.5">
                      <button type="button" onClick={() => handleVote(m.id, 'yes')}
                        className={`flex-1 py-0.5 text-[9px] font-bold border ${vote === 'yes' ? 'bg-green-500/30 border-green-500/50 text-green-300' : 'border-white/10 text-white/20 hover:text-green-400'}`}>Y</button>
                      <button type="button" onClick={() => handleVote(m.id, 'no')}
                        className={`flex-1 py-0.5 text-[9px] font-bold border ${vote === 'no' ? 'bg-red-500/30 border-red-500/50 text-red-300' : 'border-white/10 text-white/20 hover:text-red-400'}`}>N</button>
                    </div>
                  </div>
                )
              }

              // Small tiles (wave 3-4)
              return (
                <div
                  key={m.id}
                  className={`aspect-square flex items-center justify-center cursor-pointer transition-all ${vote === 'yes' ? 'bg-green-500/30' : vote === 'no' ? 'bg-red-500/30' : 'bg-white/[0.04] hover:bg-white/[0.1]'}`}
                  style={{ border: `1px solid ${SOURCE_COLORS[m.src] || '#333'}33` }}
                  onClick={() => handleVote(m.id, votes.get(m.id) === 'yes' ? 'no' : 'yes')}
                  title={`${m.sym} (${m.src})`}
                >
                  <span className="font-mono text-[5px] text-white/15">{m.sym.slice(0, 2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Big wave overlay text */}
      {currentWaveSize >= 1000 && !showReveal && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-7xl sm:text-9xl font-bold text-white/80 font-mono tabular-nums tracking-tighter">
            {currentWaveSize.toLocaleString()}
          </p>
          <p className="text-sm text-white/30 font-mono mt-2">markets and counting</p>
          {currentWaveSize >= 10000 && (
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
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}. {(totalAssets - totalVotes).toLocaleString()} to go.
              {totalVotes > 0 && <> At this rate: {Math.round((totalAssets / totalVotes) * 3 / 3600)} hours.</>}
            </p>

            <div className="py-4 border-y border-white/10 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-white/40">Markets</span><span className="text-white font-bold">{totalAssets.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Sources</span><span className="text-white font-bold">{Object.keys(assetCounts).length}</span></div>
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
    </main>
  )
}
