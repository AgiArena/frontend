'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  useMarketSnapshot,
  type SnapshotPrice,
  type SourceSchedule,
} from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE_HEIGHT = 64 // px per tile row
const SECTION_HEADER_HEIGHT = 48
const SUBHEADER_HEIGHT = 36
const COLS_BY_WIDTH: [number, number][] = [
  [1800, 22],
  [1400, 18],
  [1200, 14],
  [1000, 10],
  [768, 8],
  [0, 6],
]

// Frontend display name overrides (sourceId → display name)
const SOURCE_DISPLAY_OVERRIDES: Record<string, string> = {
  polymarket: 'Prediction Markets',
}

// Category display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  meteoTop100: 'Top 100 Cities',
  meteoTop1000: 'Top 1000 Cities',
  meteoOther: 'All Other Cities',
  defiChainTvl: 'Chain TVL',
  defiMegaCap: 'Mega Cap ($10B+)',
  defiLargeCap: 'Large Cap ($1B+)',
  defiMidCap: 'Mid Cap ($100M+)',
  defiSmallCap: 'Small Cap',
  defiDexVolume24h: 'DEX 24h Volume',
  defiDexVolume30d: 'DEX 30d Volume',
  interest_rates: 'Interest Rates',
  inflation: 'Inflation',
  macro: 'Macro',
  treasury_yields: 'Treasury Yields',
  mortgage_rates: 'Mortgage Rates',
  yield_spreads: 'Yield Spreads',
  // Stock subcategories
  usTechLargeCap: 'US Tech Large Cap',
  usTechMidCap: 'US Tech Mid Cap',
  usFinancials: 'US Financials',
  usHealthcare: 'US Healthcare',
  usConsumer: 'US Consumer',
  usIndustrials: 'US Industrials',
  usEnergy: 'US Energy',
  usMaterials: 'US Materials',
  usUtilitiesReits: 'US Utilities & REITs',
  usMediaTelecom: 'US Media & Telecom',
  // BLS subcategories
  employment: 'Employment',
  labor: 'Labor Statistics',
  // Treasury subcategories (treasury_yields already defined above)
  tbill_rates: 'T-Bill Rates',
  real_yields: 'Real Yields',
  // Polymarket derived subcategories
  poly_sports: 'Sports',
  poly_politics: 'Politics & Elections',
  poly_crypto: 'Crypto & Finance',
  poly_entertainment: 'Entertainment & Awards',
  poly_esports: 'Esports & Gaming',
  poly_science: 'Science & Tech',
  poly_other: 'Other',
}

// Keyword-based classification for Polymarket assets
function classifyPolymarket(name: string): string {
  const n = name.toLowerCase()
  if (
    /\b(nba|nfl|nhl|mlb|mls|ufc|atp|wta|epl|premier league|serie a|la liga|bundesliga|ligue 1|eredivisie|championship)\b/.test(n) ||
    /\bvs\.\s/.test(n) ||
    /\bo\/u\b/.test(n) ||
    /\bover\/under\b/.test(n) ||
    /\bgame handicap\b/.test(n) ||
    /\b(win on 20|draw\?|relegated|promotion|champion)\b/.test(n) ||
    /\b(total kills|total maps|total rounds|map winner)\b/.test(n) ||
    /\b(fc:|fc\b.*win|score|goal scorer)\b/.test(n)
  ) return 'poly_sports'
  if (
    /\b(democratic|republican|party.*win|election|senate|congress|house seat|president|governor|mayor|parliament|prime minister|political|legislation|bill\s|vote)\b/.test(n)
  ) return 'poly_politics'
  if (
    /\b(btc|eth|xrp|sol|bitcoin|ethereum|solana|dogecoin|crypto|token|fdv|market cap|price.*\$|reach \$|above \$|below \$|s&p 500|nasdaq|dow jones|stock|trading|bull|bear)\b/.test(n) ||
    /\bup or down\b/.test(n)
  ) return 'poly_crypto'
  if (
    /\b(oscar|emmy|grammy|award|best director|best picture|best actor|best actress|snl|golden globe|bafta|tony award|razzie|box office)\b/.test(n)
  ) return 'poly_entertainment'
  if (
    /\b(esport|league of legends|dota|counter-strike|valorant|overwatch|csgo|lol\b|lgd|fnatic|cloud9|faze|navi|g2)\b/.test(n) ||
    /\b(kills|map\s\d|game\s\d.*winner)\b/.test(n)
  ) return 'poly_esports'
  if (
    /\b(ai model|artificial intelligence|space|nasa|spacex|climate|weather|science|tech|quantum|fusion|chatbot arena)\b/.test(n)
  ) return 'poly_science'
  return 'poly_other'
}

// Sources that should show subcategories
const SUBCATEGORIZED_SOURCES = new Set(['weather', 'polymarket', 'defi', 'rates', 'ecb', 'stocks', 'bls', 'bonds'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(v: number, source: string): string {
  if (source === 'rates' || source === 'bls' || source === 'bonds') return `${v.toFixed(2)}%`
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

function useColumnCount() {
  const [cols, setCols] = useState(10)
  useEffect(() => {
    function update() {
      const w = window.innerWidth
      for (const [breakpoint, c] of COLS_BY_WIDTH) {
        if (w >= breakpoint) { setCols(c); return }
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return cols
}

// ---------------------------------------------------------------------------
// Row types for virtualizer
// ---------------------------------------------------------------------------

type VirtualRow =
  | { type: 'header'; source: SourceSchedule; count: number }
  | { type: 'subheader'; label: string; count: number }
  | { type: 'tiles'; prices: SnapshotPrice[] }

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

function SourceCard({ source, assetCount }: { source: SourceSchedule; assetCount: number }) {
  const displayName = SOURCE_DISPLAY_OVERRIDES[source.sourceId] || source.displayName
  return (
    <div className="border border-white/15 bg-white/5 p-3 min-w-[180px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[source.status] || 'bg-white/30'}`} />
        <span className="font-mono text-sm font-bold text-white">{displayName}</span>
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

function PriceTileInline({ price }: { price: SnapshotPrice }) {
  const value = parseFloat(price.value)
  const changePct = price.changePct ? parseFloat(price.changePct) : null
  const isUp = changePct !== null && changePct >= 0
  const isDown = changePct !== null && changePct < 0
  const hasCryptoLogo = price.source === 'crypto'

  const displaySymbol =
    !price.symbol || price.symbol === '-'
      ? price.name.replace(' TVL', '').slice(0, 10)
      : price.symbol

  return (
    <div
      className={`p-2 border cursor-default relative group ${
        isUp
          ? 'border-green-500/30 bg-green-500/5'
          : isDown
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-white/10 bg-white/5'
      }`}
      title={`${price.name}\n${formatValue(value, price.source)}${changePct !== null ? `\n24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : ''}${price.marketCap ? `\n${formatMarketCap(price.marketCap)}` : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {hasCryptoLogo && <CryptoLogo assetId={price.assetId} symbol={price.symbol} size={16} />}
        <div className="font-mono text-xs font-bold text-white truncate">{displaySymbol}</div>
      </div>
      <div className="font-mono text-[10px] text-white/60 truncate">
        {formatValue(value, price.source)}
      </div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '\u2191' : '\u2193'}{Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

function SectionHeader({ source, count }: { source: SourceSchedule; count: number }) {
  const displayName = SOURCE_DISPLAY_OVERRIDES[source.sourceId] || source.displayName
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[source.status] || 'bg-white/30'}`} />
      <span className="font-mono text-sm font-bold text-white">{displayName}</span>
      <span className="font-mono text-xs text-white/40">{count.toLocaleString()} assets</span>
      <span className="font-mono text-xs text-white/30">
        synced {relativeTime(source.lastSync)} &middot; every {humanInterval(source.syncIntervalSecs)}
      </span>
    </div>
  )
}

function SubSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border-b border-white/5">
      <span className="font-mono text-xs text-white/60">{label}</span>
      <span className="font-mono text-[10px] text-white/30">{count.toLocaleString()}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const { data, isLoading, isError, error } = useMarketSnapshot()
  const [search, setSearch] = useState('')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cols = useColumnCount()

  // Source schedule map for quick lookup
  const sourceMap = useMemo(() => {
    if (!data?.sources) return new Map<string, SourceSchedule>()
    return new Map(data.sources.map((s) => [s.sourceId, s]))
  }, [data?.sources])

  // Count assets per source (from full dataset, ignoring filters)
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

  // Assign derived categories (e.g. Polymarket keyword classification)
  const enrichedPrices = useMemo(() => {
    if (!data?.prices) return []
    return data.prices.map((p) => {
      if (p.source === 'polymarket' && !p.category) {
        return { ...p, category: classifyPolymarket(p.name) }
      }
      return p
    })
  }, [data?.prices])

  // Group, filter, sort prices into sections → flat virtual rows
  const { virtualRows, totalFiltered } = useMemo(() => {
    if (!enrichedPrices.length) return { virtualRows: [] as VirtualRow[], totalFiltered: 0 }

    // Filter
    let prices = enrichedPrices
    if (selectedSource) {
      prices = prices.filter((p) => p.source === selectedSource)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      prices = prices.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      )
    }

    const totalFiltered = prices.length

    // Group by source
    const grouped = new Map<string, SnapshotPrice[]>()
    for (const p of prices) {
      const list = grouped.get(p.source) || []
      list.push(p)
      grouped.set(p.source, list)
    }

    // Sort each group by marketCap desc
    for (const [, list] of grouped) {
      list.sort((a, b) => {
        const mcA = a.marketCap ? parseFloat(a.marketCap) : parseFloat(a.value)
        const mcB = b.marketCap ? parseFloat(b.marketCap) : parseFloat(b.value)
        return mcB - mcA
      })
    }

    // Build flat virtual rows: header + (optional subcategories) + tile rows per source
    const rows: VirtualRow[] = []
    const sourceOrder = enabledSources.map((s) => s.sourceId)

    for (const sourceId of sourceOrder) {
      const list = grouped.get(sourceId)
      if (!list || list.length === 0) continue
      const schedule = sourceMap.get(sourceId)
      if (!schedule) continue

      rows.push({ type: 'header', source: schedule, count: list.length })

      // Check if this source should have subcategories
      const hasCategories = SUBCATEGORIZED_SOURCES.has(sourceId) &&
        list.some((p) => p.category && p.category !== 'null')

      if (hasCategories) {
        // Group by category within source
        const catGrouped = new Map<string, SnapshotPrice[]>()
        for (const p of list) {
          const cat = p.category || 'uncategorized'
          const catList = catGrouped.get(cat) || []
          catList.push(p)
          catGrouped.set(cat, catList)
        }

        // Sort categories: known categories first (by count desc), then unknowns
        const catEntries = Array.from(catGrouped.entries()).sort(([a, aList], [b, bList]) => {
          const aKnown = a in CATEGORY_DISPLAY_NAMES
          const bKnown = b in CATEGORY_DISPLAY_NAMES
          if (aKnown && !bKnown) return -1
          if (!aKnown && bKnown) return 1
          return bList.length - aList.length
        })

        for (const [cat, catPrices] of catEntries) {
          const label = CATEGORY_DISPLAY_NAMES[cat] || cat
          rows.push({ type: 'subheader', label, count: catPrices.length })
          for (let i = 0; i < catPrices.length; i += cols) {
            rows.push({ type: 'tiles', prices: catPrices.slice(i, i + cols) })
          }
        }
      } else {
        // No subcategories — flat tile rows
        for (let i = 0; i < list.length; i += cols) {
          rows.push({ type: 'tiles', prices: list.slice(i, i + cols) })
        }
      }
    }

    return { virtualRows: rows, totalFiltered }
  }, [enrichedPrices, selectedSource, search, cols, enabledSources, sourceMap])

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const row = virtualRows[index]
        if (row?.type === 'header') return SECTION_HEADER_HEIGHT
        if (row?.type === 'subheader') return SUBHEADER_HEIGHT
        return TILE_HEIGHT
      },
      [virtualRows],
    ),
    overscan: 10,
  })

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
              {isLoading && (
                <span className="text-white/40 font-mono text-sm animate-pulse">
                  Loading snapshot...
                </span>
              )}
            </div>
          </div>

          {/* Source schedule cards */}
          {data?.sources && (
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
                  {SOURCE_DISPLAY_OVERRIDES[s.sourceId] || s.displayName}
                  <span className="ml-1 text-xs text-white/40">
                    ({(assetCountBySource[s.sourceId] || 0).toLocaleString()})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Virtualized grid */}
          <div className="flex-1 border border-white/20 bg-black/30 overflow-hidden min-h-0">
            {isError ? (
              <div className="py-20 text-center text-red-400/80 font-mono">
                <p className="text-lg mb-2">Failed to load</p>
                <p className="text-sm text-white/40">{error?.message}</p>
              </div>
            ) : isLoading ? (
              <div className="grid gap-px bg-white/5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {Array.from({ length: cols * 12 }).map((_, i) => (
                  <div key={i} className="p-2 bg-terminal animate-pulse">
                    <div className="h-3 w-10 bg-white/10 rounded mb-1" />
                    <div className="h-2 w-8 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : virtualRows.length > 0 ? (
              <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const row = virtualRows[virtualItem.index]
                    if (row.type === 'header') {
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <SectionHeader source={row.source} count={row.count} />
                        </div>
                      )
                    }
                    if (row.type === 'subheader') {
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <SubSectionHeader label={row.label} count={row.count} />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                          display: 'grid',
                          gridTemplateColumns: `repeat(${cols}, 1fr)`,
                          gap: '1px',
                        }}
                      >
                        {row.prices.map((price) => (
                          <PriceTileInline
                            key={`${price.source}-${price.assetId}`}
                            price={price}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
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

          {/* Footer stats */}
          <div className="flex justify-between items-center mt-2 text-xs font-mono text-white/40 flex-shrink-0">
            <span>
              {totalFiltered.toLocaleString()} assets
              {data && totalFiltered < data.totalAssets && ` of ${data.totalAssets.toLocaleString()}`}
              {' '}&middot; Auto-refreshes every 30s
            </span>
            <span>Virtual scroll &middot; {virtualRows.length.toLocaleString()} rows</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
