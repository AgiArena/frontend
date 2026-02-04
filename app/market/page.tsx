'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useMarketSnapshot, type SnapshotPrice, type SourceSchedule } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(v: number, source: string): string {
  if (source === 'rates' || source === 'bls') return `${v.toFixed(2)}%`
  if (source === 'ecb') return v.toFixed(4)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  if (v >= 0.01) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

function formatMarketCap(mc: string | null | undefined): string {
  if (!mc) return ''
  const v = parseFloat(mc)
  if (v >= 1e12) return `MCap: $${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `MCap: $${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `MCap: $${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `MCap: $${(v / 1e3).toFixed(0)}K`
  return `MCap: $${v.toFixed(0)}`
}

function relativeTime(iso: string | null): string {
  if (!iso) return '-'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) {
    const abs = Math.abs(diff)
    if (abs < 60_000) return `in ${Math.round(abs / 1000)}s`
    if (abs < 3_600_000) return `in ${Math.round(abs / 60_000)}m`
    return `in ${Math.round(abs / 3_600_000)}h`
  }
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function humanInterval(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.round(secs / 60)}m`
  if (secs < 86400) return `${Math.round(secs / 3600)}h`
  return `${Math.round(secs / 86400)}d`
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500',
  stale: 'bg-yellow-500',
  pending: 'bg-blue-500',
  disabled: 'bg-white/30',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CryptoLogo({ assetId, symbol, size = 16 }: { assetId: string; symbol: string; size?: number }) {
  const [hasError, setHasError] = useState(false)
  if (hasError) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    )
  }
  return (
    <Image
      src={`/logos/crypto/${assetId}.png`}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full"
      onError={() => setHasError(true)}
      unoptimized
    />
  )
}

function SourceCard({
  source,
  assetCount,
}: {
  source: SourceSchedule
  assetCount: number
}) {
  return (
    <div className="border border-white/15 bg-white/5 p-3 min-w-[180px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[source.status] || 'bg-white/30'}`} />
        <span className="font-mono text-sm font-bold text-white">{source.displayName}</span>
      </div>
      <div className="space-y-1 font-mono text-xs text-white/50">
        <div className="flex justify-between">
          <span>Assets</span>
          <span className="text-white/80">{assetCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last sync</span>
          <span className="text-white/80">{relativeTime(source.lastSync)}</span>
        </div>
        <div className="flex justify-between">
          <span>Next</span>
          <span className="text-white/80">{relativeTime(source.estimatedNextUpdate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Interval</span>
          <span className="text-white/80">every {humanInterval(source.syncIntervalSecs)}</span>
        </div>
      </div>
    </div>
  )
}

function PriceTile({ price }: { price: SnapshotPrice }) {
  const value = parseFloat(price.value)
  const changePct = price.changePct ? parseFloat(price.changePct) : null
  const isUp = changePct !== null && changePct >= 0
  const isDown = changePct !== null && changePct < 0

  const tooltipLines = [
    price.name,
    `Price: ${formatValue(value, price.source)}`,
  ]
  if (changePct !== null) {
    tooltipLines.push(`24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`)
  }
  if (price.marketCap) tooltipLines.push(formatMarketCap(price.marketCap))
  if (price.volume24h) {
    const vol = parseFloat(price.volume24h)
    if (vol >= 1e6) tooltipLines.push(`Vol: $${(vol / 1e6).toFixed(1)}M`)
    else if (vol >= 1e3) tooltipLines.push(`Vol: $${(vol / 1e3).toFixed(0)}K`)
  }

  const displaySymbol =
    !price.symbol || price.symbol === '-'
      ? price.name.replace(' TVL', '').slice(0, 10)
      : price.symbol

  const hasCryptoLogo = price.source === 'crypto'

  return (
    <div
      className={`p-2 border transition-all cursor-default hover:scale-105 hover:z-10 relative group ${
        isUp
          ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/60'
          : isDown
            ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/60'
            : 'border-white/10 bg-white/5 hover:border-white/30'
      }`}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/20 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
        {tooltipLines.map((line, i) => (
          <div key={i} className={`font-mono text-xs ${i === 0 ? 'text-white font-bold' : 'text-white/70'}`}>
            {line}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {hasCryptoLogo && <CryptoLogo assetId={price.assetId} symbol={price.symbol} size={16} />}
        <div className="font-mono text-xs font-bold text-white truncate">{displaySymbol}</div>
      </div>
      <div className="font-mono text-[10px] text-white/60 truncate">{formatValue(value, price.source)}</div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '\u2191' : '\u2193'}{Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const { data, isLoading } = useMarketSnapshot()
  const [search, setSearch] = useState('')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  // Count assets per source
  const assetCountBySource = useMemo(() => {
    if (!data?.prices) return {} as Record<string, number>
    const counts: Record<string, number> = {}
    for (const p of data.prices) {
      counts[p.source] = (counts[p.source] || 0) + 1
    }
    return counts
  }, [data?.prices])

  // Enabled sources for tabs
  const enabledSources = useMemo(() => {
    if (!data?.sources) return []
    return data.sources.filter((s) => s.enabled)
  }, [data?.sources])

  // Filter prices
  const filteredPrices = useMemo(() => {
    if (!data?.prices) return []
    let prices = data.prices

    if (selectedSource) {
      prices = prices.filter((p) => p.source === selectedSource)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      prices = prices.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      )
    }

    // Sort by market cap desc, then value desc
    return [...prices].sort((a, b) => {
      const mcA = a.marketCap ? parseFloat(a.marketCap) : parseFloat(a.value)
      const mcB = b.marketCap ? parseFloat(b.marketCap) : parseFloat(b.value)
      return mcB - mcA
    })
  }, [data?.prices, selectedSource, search])

  const generatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString()
    : '-'

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      <Header />

      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 py-4 h-full flex flex-col">
          {/* Page header */}
          <div className="mb-3 flex-shrink-0">
            <Link href="/" className="text-white/60 hover:text-white font-mono text-sm mb-1 inline-block">
              &larr; Back
            </Link>
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-bold text-white font-mono">Market Data</h1>
              {data && (
                <span className="text-white/40 font-mono text-sm">
                  {data.totalAssets.toLocaleString()} assets &middot; Generated {generatedAt}
                </span>
              )}
            </div>
          </div>

          {/* Source schedule cards */}
          {!isLoading && data?.sources && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0">
              {data.sources
                .filter((s) => s.enabled)
                .map((source) => (
                  <SourceCard
                    key={source.sourceId}
                    source={source}
                    assetCount={assetCountBySource[source.sourceId] || 0}
                  />
                ))}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-3 flex-shrink-0">
            <input
              type="text"
              placeholder="Search symbol or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/15 text-white font-mono text-sm px-3 py-1.5 rounded focus:outline-none focus:border-white/40 w-64"
            />
            <div className="flex gap-1 border-b border-white/20 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedSource(null)}
                className={`px-3 py-2 border-b-2 transition-all font-mono text-sm whitespace-nowrap ${
                  selectedSource === null
                    ? 'border-accent text-accent'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                All
                <span className="ml-1 text-xs text-white/40">
                  ({(data?.totalAssets || 0).toLocaleString()})
                </span>
              </button>
              {enabledSources.map((s) => (
                <button
                  key={s.sourceId}
                  type="button"
                  onClick={() => setSelectedSource(s.sourceId)}
                  className={`px-3 py-2 border-b-2 transition-all font-mono text-sm whitespace-nowrap ${
                    selectedSource === s.sourceId
                      ? 'border-accent text-accent'
                      : 'border-transparent text-white/60 hover:text-white'
                  }`}
                >
                  {s.displayName}
                  <span className="ml-1 text-xs text-white/40">
                    ({(assetCountBySource[s.sourceId] || 0).toLocaleString()})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price grid */}
          <div className="flex-1 border border-white/20 bg-black/30 overflow-hidden min-h-0">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 xl:grid-cols-18 2xl:grid-cols-22 gap-px bg-white/5">
                  {Array.from({ length: 300 }).map((_, i) => (
                    <div key={i} className="p-2 bg-terminal animate-pulse">
                      <div className="h-3 w-10 bg-white/10 rounded mb-1" />
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredPrices.length > 0 ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 xl:grid-cols-18 2xl:grid-cols-22 gap-px bg-white/10">
                  {filteredPrices.map((price) => (
                    <PriceTile key={`${price.source}-${price.assetId}`} price={price} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-white/40 font-mono">
                  <p className="text-lg mb-2">No data found</p>
                  <p className="text-sm">
                    {search ? 'Try a different search term' : 'Data sync may be in progress'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex justify-between items-center mt-2 text-xs font-mono text-white/40 flex-shrink-0">
            <span>
              {filteredPrices.length.toLocaleString()} assets shown &middot; Auto-refreshes every 30s
            </span>
            <span>Data from data-node</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
