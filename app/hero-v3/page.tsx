'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE HEATMAP" — Full-viewport heatmap of tiny cells. Each cell = 1 market.
// Unvoted cells pulse softly. Click to vote YES/NO. Watch how little you cover.
// Heatmap reveals the absurd scale. Then: the punchline.
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  twitch: '#a78bfa', polymarket: '#c084fc', weather: '#22d3ee', crates_io: '#fb923c',
  tmdb: '#2dd4bf', npm: '#ef4444', crypto: '#4ade80', defi: '#facc15',
  hackernews: '#ff6600', twse: '#34d399', anilist: '#818cf8', steam: '#6366f1',
  github: '#f472b6', stocks: '#60a5fa', backpacktf: '#f59e0b', bchain: '#fbbf24',
  cloudflare: '#f87171', bonds: '#94a3b8', rates: '#a1a1aa', bls: '#78716c',
}

type Vote = 'yes' | 'no'

// Generate heatmap cells with source-based colors
function buildCells(
  assetCounts: Record<string, number>,
  totalAssets: number,
  maxCells: number
): Array<{ id: number; source: string; color: string }> {
  const cells: Array<{ id: number; source: string; color: string }> = []
  const entries = Object.entries(assetCounts).sort(([, a], [, b]) => (b as number) - (a as number))
  const scale = totalAssets / maxCells

  let idx = 0
  for (const [source, count] of entries) {
    const cellCount = Math.max(1, Math.round((count as number) / scale))
    const color = SOURCE_COLORS[source] || '#444444'
    for (let i = 0; i < cellCount && idx < maxCells; i++, idx++) {
      cells.push({ id: idx, source, color })
    }
  }
  return cells
}

export default function HeroV3() {
  const { data: meta } = useMarketSnapshotMeta()
  const [votes, setVotes] = useState<Map<number, Vote>>(new Map())
  const [showReveal, setShowReveal] = useState(false)
  const [cols, setCols] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<Vote>('yes')
  const revealTriggered = useRef(false)

  const totalAssets = meta?.totalAssets ?? 159240
  const assetCounts = meta?.assetCounts ?? {}

  // Cap cells for performance
  const MAX_CELLS = 3000
  const cells = useMemo(() => buildCells(assetCounts, totalAssets, MAX_CELLS), [assetCounts, totalAssets])
  const cellsPerMarket = totalAssets / cells.length

  // Responsive columns
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w >= 1800) setCols(80)
      else if (w >= 1400) setCols(65)
      else if (w >= 1200) setCols(55)
      else if (w >= 1000) setCols(45)
      else if (w >= 768) setCols(35)
      else setCols(25)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Trigger reveal after enough votes
  useEffect(() => {
    if (votes.size >= 15 && !revealTriggered.current) {
      revealTriggered.current = true
      setTimeout(() => setShowReveal(true), 800)
    }
  }, [votes.size])

  const handleCellDown = useCallback((id: number) => {
    setIsDragging(true)
    setVotes(prev => {
      const next = new Map(prev)
      const current = next.get(id)
      const mode = current === 'yes' ? 'no' : 'yes'
      setDragMode(mode)
      next.set(id, mode)
      return next
    })
  }, [])

  const handleCellEnter = useCallback((id: number) => {
    if (!isDragging) return
    setVotes(prev => {
      const next = new Map(prev)
      next.set(id, dragMode)
      return next
    })
  }, [isDragging, dragMode])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [handleMouseUp])

  const yesCount = useMemo(() => {
    let c = 0; for (const v of votes.values()) if (v === 'yes') c++; return c
  }, [votes])
  const noCount = useMemo(() => {
    let c = 0; for (const v of votes.values()) if (v === 'no') c++; return c
  }, [votes])
  const totalVotes = yesCount + noCount
  const realVotes = Math.round(totalVotes * cellsPerMarket)
  const pctDone = (realVotes / totalAssets) * 100
  const hoursToFinish = totalVotes > 0 ? Math.ceil((totalAssets - realVotes) / realVotes * 5 / 60) : null

  // Source legend
  const sourceLegend = useMemo(() => {
    return Object.entries(assetCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 12)
  }, [assetCounts])

  return (
    <main
      className="min-h-screen bg-terminal flex flex-col select-none"
      onMouseUp={handleMouseUp}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">&larr; Back</Link>
            <div className="text-center">
              <p className="font-mono text-xs text-white/50">
                Each cell = {Math.round(cellsPerMarket).toLocaleString()} markets &middot; Click or drag to vote
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-sm">
              <span className="text-green-400">{yesCount} Y</span>
              <span className="text-red-400">{noCount} N</span>
              <span className="text-white/20">|</span>
              <span className="text-white/40">~{realVotes.toLocaleString()}/{totalAssets.toLocaleString()}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-1.5 h-[3px] bg-white/5">
            <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(0.05, pctDone)}%` }} />
          </div>
          <p className="text-center font-mono text-[10px] text-white/15 mt-0.5">
            {pctDone.toFixed(4)}% covered
            {hoursToFinish !== null && ` · ~${hoursToFinish}h to finish`}
          </p>
        </div>
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap justify-center gap-1.5 px-4 py-2 bg-black/50 border-b border-white/5">
        {sourceLegend.map(([source, count]) => (
          <span
            key={source}
            className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px]"
          >
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: SOURCE_COLORS[source] || '#444' }}
            />
            <span className="text-white/25">{source}</span>
            <span className="text-white/40">{(count as number).toLocaleString()}</span>
          </span>
        ))}
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
                ~{realVotes.toLocaleString()} markets covered. {(totalAssets - realVotes).toLocaleString()} untouched.
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

      {/* Heatmap grid */}
      <div className="flex-1 overflow-y-auto p-[1px]">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {cells.map((cell) => {
            const vote = votes.get(cell.id)
            return (
              <div
                key={cell.id}
                className="aspect-square cursor-crosshair transition-all duration-75"
                style={{
                  backgroundColor: vote === 'yes'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : vote === 'no'
                      ? 'rgba(239, 68, 68, 0.5)'
                      : cell.color,
                  opacity: vote ? 0.8 : 0.15,
                  boxShadow: vote === 'yes'
                    ? '0 0 3px rgba(34,197,94,0.4)'
                    : vote === 'no'
                      ? '0 0 3px rgba(239,68,68,0.4)'
                      : 'none',
                }}
                onMouseDown={() => handleCellDown(cell.id)}
                onMouseEnter={() => handleCellEnter(cell.id)}
                onTouchStart={() => handleCellDown(cell.id)}
                title={`${cell.source} · ${Math.round(cellsPerMarket)} markets per cell`}
              />
            )
          })}
        </div>

        {/* Bottom indicator */}
        <div className="py-8 text-center">
          <p className="font-mono text-xs text-white/20">
            {cells.length.toLocaleString()} cells &middot; {totalAssets.toLocaleString()} total markets &middot;
            {' '}{Math.round(cellsPerMarket)} markets per cell
          </p>
        </div>
      </div>
    </main>
  )
}
