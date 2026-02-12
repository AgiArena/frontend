'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMarketSnapshot, type SnapshotPrice } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE ARENA" — Two AI agents face off. Markets stream between them.
// Left = YOUR AGENT (YES) | Right = RIVAL AGENT (NO)
// Users assign markets to sides — building their agent's conviction set
// ---------------------------------------------------------------------------

type Side = 'left' | 'right' | null

interface MarketCardProps {
  price: SnapshotPrice
  side: Side
  onAssign: (key: string, side: Side) => void
  index: number
}

function MarketCard({ price, side, onAssign, index }: MarketCardProps) {
  const key = `${price.source}:${price.assetId}`
  const changePct = price.changePct ? parseFloat(price.changePct) : 0
  const value = parseFloat(price.value)

  function formatVal(v: number, source: string): string {
    if (source === 'rates' || source === 'bls' || source === 'bonds') return `${v.toFixed(2)}%`
    if (source === 'weather') return `${v.toFixed(1)}`
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    if (v >= 1) return `$${v.toFixed(2)}`
    return `$${v.toFixed(4)}`
  }

  return (
    <div
      className={`
        relative border font-mono transition-all duration-200
        ${side === 'left'
          ? 'bg-green-500/10 border-green-500/40 shadow-[inset_-3px_0_0_rgba(34,197,94,0.5)]'
          : side === 'right'
            ? 'bg-red-500/10 border-red-500/40 shadow-[inset_3px_0_0_rgba(239,68,68,0.5)]'
            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
        }
      `}
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div className="flex items-center">
        {/* YES button */}
        <button
          type="button"
          onClick={() => onAssign(key, side === 'left' ? null : 'left')}
          className={`
            flex-shrink-0 w-12 h-full flex items-center justify-center border-r transition-all
            ${side === 'left'
              ? 'bg-green-500/30 border-green-500/40 text-green-300'
              : 'border-white/10 text-white/20 hover:bg-green-500/10 hover:text-green-400'
            }
          `}
        >
          <span className="text-xs font-bold">Y</span>
        </button>

        {/* Market info */}
        <div className="flex-1 px-3 py-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate">
              {price.symbol !== '-' ? price.symbol : price.name.slice(0, 12)}
            </span>
            <span className="text-[10px] text-white/30 uppercase">{price.source}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/50">{formatVal(value, price.source)}</span>
            <span className={`text-[10px] ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* NO button */}
        <button
          type="button"
          onClick={() => onAssign(key, side === 'right' ? null : 'right')}
          className={`
            flex-shrink-0 w-12 h-full flex items-center justify-center border-l transition-all
            ${side === 'right'
              ? 'bg-red-500/30 border-red-500/40 text-red-300'
              : 'border-white/10 text-white/20 hover:bg-red-500/10 hover:text-red-400'
            }
          `}
        >
          <span className="text-xs font-bold">N</span>
        </button>
      </div>
    </div>
  )
}

function AgentPanel({
  side,
  count,
  label,
  sublabel,
  accentColor,
}: {
  side: 'left' | 'right'
  count: number
  label: string
  sublabel: string
  accentColor: string
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${side === 'left' ? 'text-left' : 'text-right'}`}>
      {/* Agent avatar */}
      <div
        className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 flex items-center justify-center
          ${accentColor} relative`}
      >
        <span className="text-3xl sm:text-4xl">{side === 'left' ? '🤖' : '🧠'}</span>
        {count > 0 && (
          <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full
            ${side === 'left' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
            {count}
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="font-mono text-sm font-bold text-white">{label}</div>
        <div className="font-mono text-xs text-white/40">{sublabel}</div>
      </div>
    </div>
  )
}

export default function HeroV2() {
  const { data, isLoading } = useMarketSnapshot()
  const [assignments, setAssignments] = useState<Map<string, Side>>(new Map())
  const [visibleCount, setVisibleCount] = useState(50)
  const [search, setSearch] = useState('')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const prices = useMemo(() => data?.prices ?? [], [data?.prices])

  // Source list for filters
  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const p of prices) set.add(p.source)
    return Array.from(set).sort()
  }, [prices])

  // Filtered prices
  const filtered = useMemo(() => {
    let list = prices
    if (selectedSource) list = list.filter((p) => p.source === selectedSource)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) => p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
    }
    return list
  }, [prices, selectedSource, search])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (!el) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setVisibleCount((c) => Math.min(c + 50, filtered.length))
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [filtered.length])

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(50)
  }, [selectedSource, search])

  const handleAssign = useCallback((key: string, side: Side) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      if (side === null) next.delete(key)
      else next.set(key, side)
      return next
    })
  }, [])

  const leftCount = useMemo(() => {
    let c = 0
    for (const v of assignments.values()) if (v === 'left') c++
    return c
  }, [assignments])

  const rightCount = useMemo(() => {
    let c = 0
    for (const v of assignments.values()) if (v === 'right') c++
    return c
  }, [assignments])

  const totalSet = leftCount + rightCount

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      {/* Top bar */}
      <div className="bg-black/90 border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0 z-50">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          &larr; Back
        </Link>
        <div className="font-mono text-sm text-white/40">
          {isLoading ? 'Loading...' : `${prices.length.toLocaleString()} markets available`}
        </div>
      </div>

      {/* Hero header */}
      <div className="text-center py-8 sm:py-12 flex-shrink-0 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="absolute left-0 top-0 w-1/3 h-full bg-gradient-to-r from-green-500/5 to-transparent" />
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-red-500/5 to-transparent" />

        <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tighter relative">
          THE <span className="text-accent">ARENA</span>
        </h1>
        <p className="text-base sm:text-lg text-white/50 mt-3 font-mono relative">
          Your AI Agent vs The Market &middot; Set positions &middot; Let them battle
        </p>

        {/* Agent panels */}
        <div className="flex items-center justify-center gap-8 sm:gap-16 mt-8 relative">
          <AgentPanel
            side="left"
            count={leftCount}
            label="YOUR AGENT"
            sublabel="Bullish positions"
            accentColor="border-green-500/50"
          />

          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl sm:text-4xl font-bold text-accent font-mono">VS</span>
            <span className="text-xs text-white/30 font-mono">{totalSet} positions set</span>
          </div>

          <AgentPanel
            side="right"
            count={rightCount}
            label="RIVAL AI"
            sublabel="Bearish positions"
            accentColor="border-red-500/50"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 border-y border-white/10 flex items-center gap-3 flex-shrink-0 bg-black/50">
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border border-white/15 text-white font-mono text-sm px-3 py-1.5 focus:outline-none focus:border-white/40 w-48"
        />
        <div className="flex gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedSource(null)}
            className={`px-3 py-1.5 font-mono text-xs whitespace-nowrap border transition-all ${
              selectedSource === null
                ? 'border-accent text-accent bg-accent/10'
                : 'border-white/10 text-white/40 hover:text-white/60'
            }`}
          >
            All ({prices.length.toLocaleString()})
          </button>
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSource(s)}
              className={`px-3 py-1.5 font-mono text-xs whitespace-nowrap border transition-all ${
                selectedSource === s
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Market card stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center font-mono">
              <div className="relative mb-6 mx-auto w-fit">
                <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-spin" />
              </div>
              <p className="text-lg text-white/60">Loading arena markets...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="space-y-[1px]">
              {visible.map((price, i) => {
                const key = `${price.source}:${price.assetId}`
                return (
                  <MarketCard
                    key={key}
                    price={price}
                    side={assignments.get(key) ?? null}
                    onAssign={handleAssign}
                    index={i}
                  />
                )
              })}
            </div>
            {visibleCount < filtered.length && (
              <div className="py-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => Math.min(c + 100, filtered.length))}
                  className="px-6 py-2 border border-white/20 text-white/50 font-mono text-sm hover:border-white/40 hover:text-white/70 transition-all"
                >
                  Load more ({(filtered.length - visibleCount).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom deploy bar */}
      {totalSet > 0 && (
        <div className="border-t border-white/10 bg-black/95 backdrop-blur-sm px-4 py-4 flex items-center justify-between flex-shrink-0 z-40">
          <div className="font-mono text-sm">
            <span className="text-green-400">{leftCount} YES</span>
            <span className="text-white/20 mx-2">/</span>
            <span className="text-red-400">{rightCount} NO</span>
            <span className="text-white/20 mx-2">&middot;</span>
            <span className="text-white/40">{totalSet} total positions</span>
          </div>
          <button
            type="button"
            className="px-6 py-2.5 bg-accent text-white font-mono font-bold text-sm
              shadow-[0_0_30px_rgba(196,0,0,0.4)] hover:shadow-[0_0_50px_rgba(196,0,0,0.6)]
              hover:bg-red-700 transition-all"
          >
            Deploy Agent &rarr;
          </button>
        </div>
      )}
    </main>
  )
}
