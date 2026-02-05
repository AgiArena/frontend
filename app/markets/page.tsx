'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  useMarketSnapshot,
  useMarketSnapshotMeta,
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
  twitch: 'Twitch Live',
  hackernews: 'Hacker News',
  steam: 'Steam Games',
  tmdb: 'Movies & TV',
  backpacktf: 'Steam Marketplace',
  cloudflare: 'Cloudflare Radar',
  github: 'GitHub Repos',
  npm: 'npm Packages',
  pypi: 'PyPI Packages',
  crates_io: 'Rust Crates',
}

// Subcategory display names (keyed by derived feed type)
const FEED_TYPE_DISPLAY_NAMES: Record<string, string> = {
  // Weather metrics
  temperature_2m: 'Temperature',
  rain: 'Rainfall',
  wind_speed_10m: 'Wind Speed',
  pm2_5: 'PM2.5 Air Quality',
  ozone: 'Ozone',
  // DeFi feed types
  chain_tvl: 'Chain TVL',
  protocol_tvl: 'Protocol TVL',
  dex_volume: 'DEX Volume',
  // Twitch feed types
  streamers: 'Live Streamers',
  games: 'Games',
  // HackerNews feed types
  hn_score: 'Story Scores',
  hn_comments: 'Comment Counts',
  // TMDb feed types
  tmdb_movie: 'Movies',
  tmdb_tv: 'TV Shows',
  // Cloudflare Radar feed types
  cf_http: 'HTTP Metrics',
  cf_iqi: 'Internet Quality',
  cf_speed: 'Speed Tests',
  cf_domain: 'Domain Rankings',
  cf_service: 'Service Rankings',
  // Polymarket derived subcategories
  poly_sports: 'Sports',
  poly_politics: 'Politics & Elections',
  poly_crypto: 'Crypto & Finance',
  poly_entertainment: 'Entertainment & Awards',
  poly_esports: 'Esports & Gaming',
  poly_science: 'Science & Tech',
  poly_other: 'Other',
}

// Derive the data feed type from a price entry's asset ID / source
function deriveFeedType(p: SnapshotPrice): string | null {
  if (p.source === 'weather') {
    // asset_id format: {city_id}:{metric} e.g. "paris-fr:temperature_2m"
    const colonIdx = p.assetId.lastIndexOf(':')
    if (colonIdx > 0) return p.assetId.slice(colonIdx + 1)
    return null
  }
  if (p.source === 'defi') {
    // asset_id prefixes: chain_, protocol_, dex_24h_, dex_30d_
    if (p.assetId.startsWith('chain_')) return 'chain_tvl'
    if (p.assetId.startsWith('protocol_')) return 'protocol_tvl'
    if (p.assetId.startsWith('dex_')) return 'dex_volume'
    return null
  }
  if (p.source === 'polymarket') {
    return classifyPolymarket(p.name)
  }
  if (p.source === 'twitch') {
    if (p.assetId.startsWith('twitch_stream_')) return 'streamers'
    if (p.assetId.startsWith('twitch_game_')) return 'games'
    return null
  }
  if (p.source === 'hackernews') {
    if (p.assetId.endsWith('_score')) return 'hn_score'
    if (p.assetId.endsWith('_comments')) return 'hn_comments'
    return null
  }
  if (p.source === 'tmdb') {
    if (p.assetId.startsWith('tmdb_movie_')) return 'tmdb_movie'
    if (p.assetId.startsWith('tmdb_tv_')) return 'tmdb_tv'
    return null
  }
  if (p.source === 'cloudflare') {
    if (p.assetId.startsWith('cf_http_')) return 'cf_http'
    if (p.assetId.startsWith('cf_iqi_')) return 'cf_iqi'
    if (p.assetId.startsWith('cf_speed_')) return 'cf_speed'
    if (p.assetId.startsWith('cf_domain_')) return 'cf_domain'
    if (p.assetId.startsWith('cf_service_')) return 'cf_service'
    return null
  }
  return null
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

// Sources that should show subcategories (by data feed type)
const SUBCATEGORIZED_SOURCES = new Set(['weather', 'polymarket', 'defi', 'twitch', 'hackernews', 'tmdb', 'cloudflare'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(v: number, source: string, assetId?: string): string {
  if (source === 'rates' || source === 'bls' || source === 'bonds') return `${v.toFixed(2)}%`
  if (source === 'ecb') return v.toFixed(4)
  if (source === 'twitch') {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M peak`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K peak`
    return `${Math.round(v)} peak`
  }
  if (source === 'hackernews') {
    const unit = assetId?.endsWith('_comments') ? 'comments' : 'pts'
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}`
    return `${Math.round(v)} ${unit}`
  }
  if (source === 'steam') {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M playing`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K playing`
    return `${Math.round(v)} playing`
  }
  if (source === 'tmdb') {
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K pop`
    return `${v.toFixed(1)} pop`
  }
  if (source === 'weather') {
    // Format weather values with appropriate units
    if (assetId) {
      const metric = assetId.split(':')[1]
      if (metric === 'temperature_2m') return `${v.toFixed(1)}°C`
      if (metric === 'rain') return `${v.toFixed(1)}mm`
      if (metric === 'wind_speed_10m') return `${v.toFixed(1)}km/h`
      if (metric === 'pm2_5') return `${v.toFixed(1)}µg/m³`
      if (metric === 'ozone') return `${v.toFixed(1)}µg/m³`
    }
    return v.toFixed(1)
  }
  if (source === 'cloudflare') {
    if (assetId?.startsWith('cf_domain_') || assetId?.startsWith('cf_service_')) {
      return `#${Math.round(v).toLocaleString()}`
    }
    if (assetId?.startsWith('cf_http_')) return `${v.toFixed(1)}%`
    if (assetId?.startsWith('cf_speed_')) return `${v.toFixed(1)} Mbps`
    return v.toFixed(2)
  }
  if (source === 'github') {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ★`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ★`
    return `${Math.round(v)} ★`
  }
  if (source === 'npm' || source === 'pypi' || source === 'crates_io') {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B dl`
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M dl`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K dl`
    return `${Math.round(v)} dl`
  }
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

/** Build an external link for a price tile, if available */
function getExternalLink(price: SnapshotPrice): string | null {
  switch (price.source) {
    case 'twitch':
      if (price.assetId.startsWith('twitch_stream_'))
        return `https://twitch.tv/${price.assetId.replace('twitch_stream_', '')}`
      return null
    case 'hackernews': {
      const m = price.assetId.match(/^hn_(\d+)_/)
      return m ? `https://news.ycombinator.com/item?id=${m[1]}` : null
    }
    case 'steam':
      return `https://store.steampowered.com/app/${price.assetId.replace('steam_game_', '')}`
    case 'tmdb':
      if (price.assetId.startsWith('tmdb_movie_'))
        return `https://www.themoviedb.org/movie/${price.assetId.replace('tmdb_movie_', '')}`
      if (price.assetId.startsWith('tmdb_tv_'))
        return `https://www.themoviedb.org/tv/${price.assetId.replace('tmdb_tv_', '')}`
      return null
    case 'crypto':
      return `https://www.coingecko.com/en/coins/${price.assetId}`
    case 'defi':
      if (price.assetId.startsWith('protocol_'))
        return `https://defillama.com/protocol/${price.assetId.replace('protocol_', '')}`
      if (price.assetId.startsWith('chain_')) {
        const chain = price.assetId.replace('chain_', '')
        return `https://defillama.com/chain/${chain.charAt(0).toUpperCase() + chain.slice(1)}`
      }
      return null
    case 'rates':
      return `https://fred.stlouisfed.org/series/${price.assetId}`
    case 'stocks':
      return `https://finance.yahoo.com/quote/${price.assetId}`
    case 'github': {
      const gh = price.symbol.replace('GH:', '')
      return gh.includes('/') ? `https://github.com/${gh}` : null
    }
    case 'npm': {
      const pkg = price.symbol.replace('NPM:', '')
      return `https://www.npmjs.com/package/${pkg}`
    }
    case 'pypi': {
      const pkg = price.symbol.replace('PYPI:', '')
      return `https://pypi.org/project/${pkg}/`
    }
    case 'crates_io':
      return `https://crates.io/crates/${price.assetId.replace('crate_', '')}`
    case 'backpacktf':
      return `https://backpack.tf/stats/Unique/${encodeURIComponent(price.name)}/Tradable/Craftable`
    case 'cloudflare':
      if (price.assetId.startsWith('cf_domain_')) {
        const domain = price.assetId.replace('cf_domain_', '').replace(/_/g, '.')
        return `https://radar.cloudflare.com/domains/${domain}`
      }
      return 'https://radar.cloudflare.com/'
    case 'bls':
      return `https://data.bls.gov/timeseries/${price.assetId}`
    default:
      return null
  }
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

/** Returns a tick counter that increments every second — forces re-renders of relative timestamps */
function useLiveClock() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return tick
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

function SourceCard({ source, assetCount, tick }: { source: SourceSchedule; assetCount: number; tick: number }) {
  void tick // used to force re-render for live timestamps
  const displayName = SOURCE_DISPLAY_OVERRIDES[source.sourceId] || source.displayName
  return (
    <div className="border border-white/15 bg-white/5 p-3 min-w-[180px] flex-shrink-0 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08] hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[source.status] || 'bg-white/30'} ${source.status === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="font-mono text-sm font-bold text-white">{displayName}</span>
      </div>
      <div className="space-y-1 font-mono text-xs text-white/50">
        <div className="flex justify-between">
          <span>Assets</span>
          <span className="text-white/80">{assetCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last sync</span>
          <span className="text-white/80 tabular-nums">{relativeTime(source.lastSync)}</span>
        </div>
        <div className="flex justify-between">
          <span>Next</span>
          <span className="text-white/80 tabular-nums">{relativeTime(source.estimatedNextUpdate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Interval</span>
          <span className="text-white/80">{source.syncIntervalSecs < 60 ? 'rolling' : `every ${humanInterval(source.syncIntervalSecs)}`}</span>
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
  const link = getExternalLink(price)

  // Determine display label
  let displaySymbol: string
  if (price.source === 'weather') {
    const parts = price.name.split(' ')
    displaySymbol = parts.length > 1 ? parts.slice(0, -1).join(' ') : price.name
    if (displaySymbol.length > 14) displaySymbol = displaySymbol.slice(0, 12) + '..'
  } else if (price.source === 'hackernews') {
    // Strip "(score)" / "(comments)" suffix from name, show story title
    displaySymbol = price.name.replace(/\s*\((score|comments)\)\s*$/, '').slice(0, 30)
  } else if (['steam', 'polymarket', 'tmdb', 'backpacktf', 'cloudflare', 'github', 'npm', 'pypi', 'crates_io'].includes(price.source)) {
    // Show the full name instead of symbol ID
    displaySymbol = price.name.slice(0, 30)
  } else {
    displaySymbol =
      !price.symbol || price.symbol === '-'
        ? price.name.replace(' TVL', '').slice(0, 10)
        : price.symbol
  }

  const Wrapper = link ? 'a' : 'div'
  const wrapperProps = link
    ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`p-2 border relative group transition-all duration-200 ${link ? 'cursor-pointer' : 'cursor-default'} hover:scale-[1.03] hover:z-10 hover:shadow-lg hover:shadow-black/30 ${
        isUp
          ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10'
          : isDown
            ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10'
            : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
      }`}
      title={`${price.name}\n${formatValue(value, price.source, price.assetId)}${changePct !== null ? `\n24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : ''}${price.marketCap ? `\n${formatMarketCap(price.marketCap)}` : ''}${link ? `\n${link}` : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {hasCryptoLogo && <CryptoLogo assetId={price.assetId} symbol={price.symbol} size={16} />}
        <div className="font-mono text-xs font-bold text-white truncate">{displaySymbol}</div>
        {link && (
          <svg className="w-2.5 h-2.5 text-white/30 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/60" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 1h7v7M11 1L4 8" />
          </svg>
        )}
      </div>
      <div className="font-mono text-[10px] text-white/60 truncate">
        {formatValue(value, price.source, price.assetId)}
      </div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '\u2191' : '\u2193'}{Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </Wrapper>
  )
}

function SectionHeader({ source, count, tick }: { source: SourceSchedule; count: number; tick: number }) {
  void tick
  const displayName = SOURCE_DISPLAY_OVERRIDES[source.sourceId] || source.displayName
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[source.status] || 'bg-white/30'} ${source.status === 'healthy' ? 'animate-pulse' : ''}`} />
      <span className="font-mono text-sm font-bold text-white">{displayName}</span>
      <span className="font-mono text-xs text-white/40">{count.toLocaleString()} assets</span>
      <span className="font-mono text-xs text-white/30 tabular-nums">
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
  // Progressive loading: meta loads instantly (~1KB), full snapshot loads in background (~3MB)
  const { data: meta, isLoading: metaLoading } = useMarketSnapshotMeta()
  const { data, isLoading: snapshotLoading, isError, error } = useMarketSnapshot()
  const [search, setSearch] = useState('')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cols = useColumnCount()
  const tick = useLiveClock()

  // Use meta for instant display, full data once loaded
  const sources = data?.sources ?? meta?.sources ?? []
  const generatedAtRaw = data?.generatedAt ?? meta?.generatedAt ?? null
  const pricesLoaded = !!data?.prices?.length
  // Once prices are loaded, use actual count (meta over-counts registered assets without prices)
  const totalAssets = pricesLoaded ? data!.prices.length : (meta?.totalAssets ?? 0)

  // Source schedule map for quick lookup
  const sourceMap = useMemo(() => {
    return new Map(sources.map((s) => [s.sourceId, s]))
  }, [sources])

  // Count assets per source — from full data if available, else from meta counts
  const assetCountBySource = useMemo(() => {
    if (data?.prices) {
      const counts: Record<string, number> = {}
      for (const p of data.prices) {
        counts[p.source] = (counts[p.source] || 0) + 1
      }
      return counts
    }
    return (meta?.assetCounts ?? {}) as Record<string, number>
  }, [data?.prices, meta?.assetCounts])

  // Enabled sources for tabs — hide sources with 0 assets
  const enabledSources = useMemo(() => {
    return sources.filter((s) => s.enabled && (assetCountBySource[s.sourceId] ?? 0) > 0)
  }, [sources, assetCountBySource])

  // Derive feed-type subcategories for sources that support them
  const enrichedPrices = useMemo(() => {
    if (!data?.prices) return []
    return data.prices.map((p) => {
      if (SUBCATEGORIZED_SOURCES.has(p.source)) {
        const feedType = deriveFeedType(p)
        if (feedType) return { ...p, category: feedType }
      }
      return p
    })
  }, [data?.prices])

  // Compute available subcategories for the selected source
  const availableSubcategories = useMemo(() => {
    if (!selectedSource || !SUBCATEGORIZED_SOURCES.has(selectedSource)) return []
    const counts: Record<string, number> = {}
    for (const p of enrichedPrices) {
      if (p.source === selectedSource && p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1
      }
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
  }, [enrichedPrices, selectedSource])

  // Group, filter, sort prices into sections → flat virtual rows
  const { virtualRows, totalFiltered } = useMemo(() => {
    if (!enrichedPrices.length) return { virtualRows: [] as VirtualRow[], totalFiltered: 0 }

    // Filter
    let prices = enrichedPrices
    if (selectedSource) {
      prices = prices.filter((p) => p.source === selectedSource)
    }
    if (selectedSubcategory) {
      prices = prices.filter((p) => p.category === selectedSubcategory)
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

        // Sort categories: known feed types first (by count desc), then unknowns
        const catEntries = Array.from(catGrouped.entries()).sort(([a, aList], [b, bList]) => {
          const aKnown = a in FEED_TYPE_DISPLAY_NAMES
          const bKnown = b in FEED_TYPE_DISPLAY_NAMES
          if (aKnown && !bKnown) return -1
          if (!aKnown && bKnown) return 1
          return bList.length - aList.length
        })

        for (const [cat, catPrices] of catEntries) {
          const label = FEED_TYPE_DISPLAY_NAMES[cat] || cat
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
  }, [enrichedPrices, selectedSource, selectedSubcategory, search, cols, enabledSources, sourceMap])

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

  void tick // force re-render every second for live timestamps
  const generatedAt = generatedAtRaw
    ? relativeTime(generatedAtRaw)
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
              {totalAssets > 0 && (
                <span className="text-white/40 font-mono text-sm tabular-nums flex items-center gap-1.5">
                  {totalAssets.toLocaleString()} assets
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  updated {generatedAt}
                </span>
              )}
              {metaLoading && (
                <span className="text-white/40 font-mono text-sm animate-pulse">
                  Connecting...
                </span>
              )}
            </div>
          </div>

          {/* Source schedule cards — show from meta (instant) or full data */}
          {enabledSources.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0 scrollbar-thin">
              {enabledSources.map((source) => (
                <SourceCard
                  key={source.sourceId}
                  source={source}
                  assetCount={assetCountBySource[source.sourceId] || 0}
                  tick={tick}
                />
              ))}
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-3 flex-shrink-0 space-y-2">
            <div className="flex items-start gap-3">
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border border-white/15 text-white font-mono text-sm px-3 py-1.5 rounded focus:outline-none focus:border-white/40 w-64 flex-shrink-0"
              />
              <div className="flex flex-wrap gap-1 border-b border-white/20 min-w-0">
                <button
                  type="button"
                  onClick={() => { setSelectedSource(null); setSelectedSubcategory(null) }}
                  className={`px-3 py-2 border-b-2 transition-all font-mono text-sm whitespace-nowrap ${
                    selectedSource === null
                      ? 'border-accent text-accent'
                      : 'border-transparent text-white/60 hover:text-white'
                  }`}
                >
                  All
                  <span className="ml-1 text-xs text-white/40">
                    ({totalAssets.toLocaleString()})
                  </span>
                </button>
                {enabledSources.map((s) => (
                  <button
                    key={s.sourceId}
                    type="button"
                    onClick={() => { setSelectedSource(s.sourceId); setSelectedSubcategory(null) }}
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

            {/* Subcategory filter chips — shown when a subcategorized source is selected */}
            {selectedSource && availableSubcategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(16rem+0.75rem)] animate-[fadeSlideIn_0.25s_ease-out]">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200 hover:scale-105 ${
                    selectedSubcategory === null
                      ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm shadow-accent/10'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  All
                </button>
                {availableSubcategories.map(([key, count], i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSubcategory(key)}
                    className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200 hover:scale-105 ${
                      selectedSubcategory === key
                        ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm shadow-accent/10'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:border-white/20'
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {FEED_TYPE_DISPLAY_NAMES[key] || key}
                    <span className="ml-1 text-white/30">({count.toLocaleString()})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Virtualized grid */}
          <div className="flex-1 border border-white/20 bg-black/30 overflow-hidden min-h-0">
            {isError ? (
              <div className="py-20 text-center text-red-400/80 font-mono">
                <p className="text-lg mb-2">Failed to load</p>
                <p className="text-sm text-white/40">{error?.message}</p>
              </div>
            ) : !pricesLoaded ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                {/* Animated loading indicator */}
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-spin" />
                </div>
                <div className="text-center font-mono">
                  <p className="text-lg text-white/80 mb-1">
                    Loading {totalAssets > 0 ? totalAssets.toLocaleString() : '50,000+'} markets
                  </p>
                  <p className="text-sm text-white/40">
                    {enabledSources.length > 0
                      ? `${enabledSources.length} sources across stocks, crypto, DeFi, weather, and more`
                      : 'Fetching market data from data node...'}
                  </p>
                </div>
                {/* Mini source breakdown while loading */}
                {enabledSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {enabledSources.map((s) => {
                      const count = assetCountBySource[s.sourceId] || 0
                      return (
                        <span key={s.sourceId} className="px-2 py-1 bg-white/5 border border-white/10 font-mono text-xs text-white/50">
                          {SOURCE_DISPLAY_OVERRIDES[s.sourceId] || s.displayName}: {count.toLocaleString()}
                        </span>
                      )
                    })}
                  </div>
                )}
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
                          <SectionHeader source={row.source} count={row.count} tick={tick} />
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
                        className="animate-[tileEnter_0.3s_ease-out]"
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
              {pricesLoaded
                ? <>
                    {totalFiltered.toLocaleString()} assets
                    {totalFiltered < totalAssets && ` of ${totalAssets.toLocaleString()}`}
                  </>
                : <>{totalAssets.toLocaleString()} assets</>
              }
              {' '}&middot; Auto-refreshes every 30s
            </span>
            <span>
              {pricesLoaded
                ? `Virtual scroll \u00B7 ${virtualRows.length.toLocaleString()} rows`
                : snapshotLoading ? 'Loading prices...' : ''
              }
            </span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
