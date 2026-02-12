'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMarketSnapshot, type SnapshotPrice } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE WALL" — 10K market micro-tiles as a living background
// Click each tile to set YES (green) / NO (red) / neutral
// ---------------------------------------------------------------------------

type Vote = 'yes' | 'no' | null

function MicroTile({
  price,
  vote,
  onVote,
}: {
  price: SnapshotPrice
  vote: Vote
  onVote: (assetKey: string) => void
}) {
  const key = `${price.source}:${price.assetId}`
  const changePct = price.changePct ? parseFloat(price.changePct) : 0

  return (
    <button
      type="button"
      onClick={() => onVote(key)}
      className={`
        w-full aspect-square text-[6px] sm:text-[7px] md:text-[8px] font-mono leading-none
        border transition-all duration-150 cursor-pointer relative overflow-hidden
        ${vote === 'yes'
          ? 'bg-green-500/40 border-green-500/60 text-green-200 shadow-[0_0_6px_rgba(34,197,94,0.3)]'
          : vote === 'no'
            ? 'bg-red-500/40 border-red-500/60 text-red-200 shadow-[0_0_6px_rgba(239,68,68,0.3)]'
            : changePct >= 0
              ? 'bg-green-500/5 border-white/[0.06] text-white/30 hover:bg-green-500/15 hover:border-green-500/30'
              : 'bg-red-500/5 border-white/[0.06] text-white/30 hover:bg-red-500/15 hover:border-red-500/30'
        }
      `}
      title={`${price.name} — ${price.symbol}\nValue: ${price.value}\n24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%\n\nClick to cycle: neutral → YES → NO → neutral`}
    >
      <span className="truncate block px-[1px]">{price.symbol?.slice(0, 4) || price.name?.slice(0, 3)}</span>
    </button>
  )
}

function StatsBar({
  total,
  yesCount,
  noCount,
  isLoading,
}: {
  total: number
  yesCount: number
  noCount: number
  isLoading: boolean
}) {
  const setCount = yesCount + noCount
  const pct = total > 0 ? ((setCount / total) * 100).toFixed(1) : '0'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          &larr; Back
        </Link>
        <div className="flex items-center gap-6 font-mono text-sm">
          <span className="text-white/40">
            {isLoading ? 'Loading markets...' : `${total.toLocaleString()} markets`}
          </span>
          <span className="text-green-400">{yesCount.toLocaleString()} YES</span>
          <span className="text-red-400">{noCount.toLocaleString()} NO</span>
          <span className="text-white/60">{pct}% set</span>
        </div>
        <button
          type="button"
          className={`px-4 py-1.5 font-mono text-sm font-bold transition-all ${
            setCount > 0
              ? 'bg-accent text-white hover:bg-red-700 shadow-[0_0_20px_rgba(196,0,0,0.4)]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
          disabled={setCount === 0}
        >
          Deploy Agent ({setCount.toLocaleString()})
        </button>
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-accent to-red-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (setCount / total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function HeroV1() {
  const { data, isLoading } = useMarketSnapshot()
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map())
  const gridRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(50)

  // Responsive column count for micro-tiles
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w >= 1800) setCols(80)
      else if (w >= 1400) setCols(65)
      else if (w >= 1200) setCols(55)
      else if (w >= 1000) setCols(45)
      else if (w >= 768) setCols(35)
      else if (w >= 640) setCols(25)
      else setCols(18)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const prices = useMemo(() => data?.prices ?? [], [data?.prices])

  const handleVote = useCallback((key: string) => {
    setVotes((prev) => {
      const next = new Map(prev)
      const current = next.get(key) ?? null
      if (current === null) next.set(key, 'yes')
      else if (current === 'yes') next.set(key, 'no')
      else next.delete(key)
      return next
    })
  }, [])

  const yesCount = useMemo(() => {
    let c = 0
    for (const v of votes.values()) if (v === 'yes') c++
    return c
  }, [votes])

  const noCount = useMemo(() => {
    let c = 0
    for (const v of votes.values()) if (v === 'no') c++
    return c
  }, [votes])

  return (
    <main className="min-h-screen bg-terminal relative">
      <StatsBar
        total={prices.length}
        yesCount={yesCount}
        noCount={noCount}
        isLoading={isLoading}
      />

      {/* Floating hero text over the grid */}
      <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold text-white/90 tracking-tighter drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            Agi<span className="text-accent">Arena</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/60 mt-4 font-mono drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            Set your conviction across {prices.length > 0 ? prices.length.toLocaleString() : '10,000+'} markets
          </p>
          <p className="text-sm sm:text-base text-white/40 mt-2 font-mono drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            Click any tile &middot; YES / NO / neutral &middot; Deploy your AI agent to battle
          </p>
        </div>
      </div>

      {/* The Wall: 10K micro-tile grid */}
      <div className="pt-14">
        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-56px)]">
            <div className="text-center font-mono">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-2 border-white/10 rounded-full" />
                <div className="absolute inset-0 w-20 h-20 border-2 border-transparent border-t-accent rounded-full animate-spin" />
              </div>
              <p className="text-xl text-white/60">Loading The Wall...</p>
              <p className="text-sm text-white/30 mt-2">Fetching 10,000+ live markets</p>
            </div>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid gap-[1px] p-[1px]"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {prices.map((price) => {
              const key = `${price.source}:${price.assetId}`
              return (
                <MicroTile
                  key={key}
                  price={price}
                  vote={votes.get(key) ?? null}
                  onVote={handleVote}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

      {/* Bottom CTA */}
      {(yesCount + noCount) > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            className="px-8 py-4 bg-accent text-white font-mono font-bold text-lg
              shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_60px_rgba(196,0,0,0.7)]
              hover:bg-red-700 transition-all animate-pulse"
          >
            Deploy Your Agent &rarr; {(yesCount + noCount).toLocaleString()} positions
          </button>
        </div>
      )}
    </main>
  )
}
