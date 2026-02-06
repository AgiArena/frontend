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
  useMarketSnapshotBySources,
  usePrefetchMarketSnapshot,
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
  bls: 'Labor Stats',
  bchain: 'Bitcoin On-Chain',
  goes_xray: 'Solar X-Ray',
  tides: 'NOAA Tides',
  usgs_water: 'USGS Water',
  sec_13f: 'SEC 13F Filings',
  watttime: 'Grid Carbon',
  caiso: 'CA Energy Grid',
  energy_charts: 'EU Energy',
  opensky: 'Aviation Tracking',
  anilist: 'Anime & Manga',
  fourchan: '4chan Activity',
  twse: 'Taiwan Stocks',
}

// Category groupings for hierarchical navigation
interface CategoryGroup {
  id: string
  name: string
  icon: string
  sources: string[]
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'finance',
    name: 'Finance',
    icon: '💹',
    sources: ['stocks', 'twse', 'crypto', 'defi', 'rates', 'bonds', 'ecb', 'futures', 'cftc'],
  },
  {
    id: 'predictions',
    name: 'Predictions',
    icon: '🎯',
    sources: ['polymarket'],
  },
  {
    id: 'economics',
    name: 'Economics',
    icon: '📊',
    sources: ['bls', 'worldbank', 'imf', 'fred', 'congress', 'sec_13f', 'finra'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: '🎮',
    sources: ['twitch', 'steam', 'backpacktf', 'tmdb', 'anilist', 'hackernews', 'fourchan'],
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: '💻',
    sources: ['github', 'npm', 'pypi', 'crates_io', 'cloudflare'],
  },
  {
    id: 'environment',
    name: 'Environment',
    icon: '🌍',
    sources: ['weather', 'tides', 'usgs_water', 'goes_xray'],
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: '⚡',
    sources: ['eia', 'opec', 'watttime', 'caiso', 'energy_charts'],
  },
  {
    id: 'commodities',
    name: 'Commodities',
    icon: '🛢️',
    sources: ['opec', 'eia', 'zillow', 'bchain'],
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '✈️',
    sources: ['opensky'],
  },
]

// Build reverse lookup: sourceId → categoryId
const SOURCE_TO_CATEGORY: Record<string, string> = {}
for (const group of CATEGORY_GROUPS) {
  for (const source of group.sources) {
    if (!SOURCE_TO_CATEGORY[source]) {
      SOURCE_TO_CATEGORY[source] = group.id
    }
  }
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
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M viewers`
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K viewers`
    return `${Math.round(v)} viewers`
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
  healthy: 'bg-green',
  stale: 'bg-yellow',
  pending: 'bg-accent',
  disabled: 'bg-hover',
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
        className="rounded-full bg-hover flex items-center justify-center text-secondary font-bold"
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
    <div className="border bg-surface rounded-xl p-3 min-w-[180px] flex-shrink-0 transition-colors duration-150 hover:border-hover">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[source.status] || 'bg-hover'} ${source.status === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="font-mono text-sm font-bold text-primary">{displayName}</span>
      </div>
      <div className="space-y-1 font-mono text-xs text-muted">
        <div className="flex justify-between">
          <span>Assets</span>
          <span className="text-secondary">{assetCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Last sync</span>
          <span className="text-secondary tabular-nums">{relativeTime(source.lastSync)}</span>
        </div>
        <div className="flex justify-between">
          <span>Next</span>
          <span className="text-secondary tabular-nums">{relativeTime(source.estimatedNextUpdate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Interval</span>
          <span className="text-secondary">{source.syncIntervalSecs < 60 ? 'rolling' : `every ${humanInterval(source.syncIntervalSecs)}`}</span>
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
      className={`p-2 rounded-lg border relative group transition-colors duration-150 ${link ? 'cursor-pointer' : 'cursor-default'} ${
        isUp
          ? 'border-green/25 bg-green-muted hover:border-hover'
          : isDown
            ? 'border-red-loss/25 bg-red-loss-muted hover:border-hover'
            : 'border bg-surface hover:border-hover'
      }`}
      title={`${price.name}\n${formatValue(value, price.source, price.assetId)}${changePct !== null ? `\n24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : ''}${price.marketCap ? `\n${formatMarketCap(price.marketCap)}` : ''}${link ? `\n${link}` : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {hasCryptoLogo && <CryptoLogo assetId={price.assetId} symbol={price.symbol} size={16} />}
        <div className="font-mono text-xs font-bold text-primary truncate">{displaySymbol}</div>
        {link && (
          <svg className="w-2.5 h-2.5 text-muted flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group- group-hover:text-secondary" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 1h7v7M11 1L4 8" />
          </svg>
        )}
      </div>
      <div className="font-mono text-[10px] text-secondary truncate">
        {formatValue(value, price.source, price.assetId)}
      </div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green' : 'text-red-loss'}`}>
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
    <div className="flex items-center gap-3 px-3 py-2 bg-surface border-b border">
      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[source.status] || 'bg-hover'} ${source.status === 'healthy' ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-semibold text-primary">{displayName}</span>
      <span className="font-data text-xs text-muted">{count.toLocaleString()} assets</span>
      <span className="font-data text-xs text-muted tabular-nums">
        synced {relativeTime(source.lastSync)} &middot; every {humanInterval(source.syncIntervalSecs)}
      </span>
    </div>
  )
}

function SubSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border">
      <span className="text-xs text-secondary">{label}</span>
      <span className="font-data text-[10px] text-muted">{count.toLocaleString()}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  // Progressive loading: meta loads instantly (~1KB), filtered snapshot loads fast
  const { data: meta, isLoading: metaLoading } = useMarketSnapshotMeta()
  const [search, setSearch] = useState('')
  // Default to 'entertainment' category (hackernews, twitch, steam, etc) for faster initial load
  const [selectedCategory, setSelectedCategory] = useState<string | null>('entertainment')
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cols = useColumnCount()
  const tick = useLiveClock()

  // Determine which sources to fetch based on selected category
  const sourcesToFetch = useMemo(() => {
    if (!selectedCategory) return [] // Empty = fetch all via full snapshot
    const group = CATEGORY_GROUPS.find((g) => g.id === selectedCategory)
    return group ? group.sources : []
  }, [selectedCategory])

  // Progressive fetch: only fetch selected category's sources when category is selected
  const { data: filteredData, isLoading: filteredLoading, isError: filteredError, error: filteredErrorMsg } = useMarketSnapshotBySources(sourcesToFetch)
  // Full snapshot for "All" view (lazy - only fetched when user clicks "All")
  const { data: fullData, isLoading: fullLoading, isError: fullError, error: fullErrorMsg } = useMarketSnapshot()

  // Prefetch other categories in background after initial load
  const prefetchSnapshot = usePrefetchMarketSnapshot()
  const [hasPrefetched, setHasPrefetched] = useState(false)

  useEffect(() => {
    // Once initial data is loaded, prefetch other categories in background
    if (filteredData && !hasPrefetched) {
      setHasPrefetched(true)

      // Prefetch order: Finance first, then others
      const prefetchOrder = [
        'finance',       // stocks, crypto, defi, etc
        'technology',    // github, npm, pypi, etc
        'predictions',   // polymarket
        'economics',     // bls, worldbank, etc
        'environment',   // weather, tides, etc
        'energy',        // eia, opec, etc
        'commodities',   // opec, eia, zillow, etc
        'transport',     // opensky
      ]

      // Stagger prefetches to not overwhelm the server
      prefetchOrder.forEach((categoryId, index) => {
        if (categoryId === selectedCategory) return // Skip current category
        const group = CATEGORY_GROUPS.find((g) => g.id === categoryId)
        if (group) {
          setTimeout(() => {
            prefetchSnapshot(group.sources)
          }, (index + 1) * 500) // 500ms delay between each
        }
      })
    }
  }, [filteredData, hasPrefetched, selectedCategory, prefetchSnapshot])

  // Use filtered data when category is selected, full data otherwise
  const data = selectedCategory && sourcesToFetch.length > 0 ? filteredData : fullData
  const snapshotLoading = selectedCategory && sourcesToFetch.length > 0 ? filteredLoading : fullLoading
  const isError = selectedCategory && sourcesToFetch.length > 0 ? filteredError : fullError
  const error = selectedCategory && sourcesToFetch.length > 0 ? filteredErrorMsg : fullErrorMsg

  // Use meta for instant display, full data once loaded
  const sources = data?.sources ?? meta?.sources ?? []
  const generatedAtRaw = data?.generatedAt ?? meta?.generatedAt ?? null
  const pricesLoaded = !!data?.prices?.length
  // Global total from meta (stable, for header display)
  const totalAssetsGlobal = meta?.totalAssets ?? 0
  // Current view count (filtered category)
  const totalAssetsInView = pricesLoaded ? data!.prices.length : 0
  // For backward compat
  const totalAssets = totalAssetsGlobal

  // Source schedule map for quick lookup
  const sourceMap = useMemo(() => {
    return new Map(sources.map((s) => [s.sourceId, s]))
  }, [sources])

  // Count assets per source — always use meta for category nav counts (stable across filters)
  // Use full data counts when available, else meta counts
  const assetCountBySourceForNav = useMemo(() => {
    // For category navigation, prefer fullData counts (or meta) to keep all categories visible
    if (fullData?.prices) {
      const counts: Record<string, number> = {}
      for (const p of fullData.prices) {
        counts[p.source] = (counts[p.source] || 0) + 1
      }
      return counts
    }
    return (meta?.assetCounts ?? {}) as Record<string, number>
  }, [fullData?.prices, meta?.assetCounts])

  // Count assets in current view (for display only)
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

  // Enabled sources for tabs — hide sources with 0 assets (use stable nav counts)
  const enabledSources = useMemo(() => {
    return sources.filter((s) => s.enabled && (assetCountBySourceForNav[s.sourceId] ?? 0) > 0)
  }, [sources, assetCountBySourceForNav])

  // Category groups with their asset counts (use stable nav counts)
  const categoryGroupsWithCounts = useMemo(() => {
    return CATEGORY_GROUPS.map((group) => {
      const groupSources = group.sources.filter((s) => (assetCountBySourceForNav[s] ?? 0) > 0)
      const totalAssets = groupSources.reduce((sum, s) => sum + (assetCountBySourceForNav[s] || 0), 0)
      return { ...group, sources: groupSources, totalAssets }
    }).filter((g) => g.totalAssets > 0)
  }, [assetCountBySourceForNav])

  // Sources in the selected category (for secondary filter)
  const sourcesInCategory = useMemo(() => {
    if (!selectedCategory) return enabledSources
    const group = categoryGroupsWithCounts.find((g) => g.id === selectedCategory)
    if (!group) return enabledSources
    return enabledSources.filter((s) => group.sources.includes(s.sourceId))
  }, [selectedCategory, categoryGroupsWithCounts, enabledSources])

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

    // Filter by category first
    if (selectedCategory) {
      const group = CATEGORY_GROUPS.find((g) => g.id === selectedCategory)
      if (group) {
        prices = prices.filter((p) => group.sources.includes(p.source))
      }
    }

    // Then filter by specific source if selected
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
    // Use sources in current category if filtered, otherwise all enabled
    const relevantSources = selectedCategory
      ? sourcesInCategory
      : enabledSources
    const sourceOrder = relevantSources.map((s) => s.sourceId)

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
  }, [enrichedPrices, selectedCategory, selectedSource, selectedSubcategory, search, cols, enabledSources, sourcesInCategory, sourceMap])

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
    <main className="min-h-screen bg-primary flex flex-col">
      <Header />

      <div className="flex-1 overflow-hidden bg-primary" >
        <div className="max-w-[1800px] mx-auto px-4 py-4 h-full flex flex-col bg-primary" >
          {/* Page header */}
          <div className="mb-3 flex-shrink-0">
            <Link href="/" className="text-secondary hover:text-primary text-sm mb-1 inline-block">
              &larr; Back
            </Link>
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">Market Data</h1>
              {totalAssetsGlobal > 0 && (
                <span className="text-muted font-mono text-sm tabular-nums flex items-center gap-1.5">
                  {totalAssetsGlobal.toLocaleString()} assets
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                  updated {generatedAt}
                </span>
              )}
              {metaLoading && (
                <span className="text-muted font-mono text-sm animate-pulse">
                  Connecting...
                </span>
              )}
            </div>
          </div>

          {/* Source schedule cards — show from meta (instant) or full data, filtered by category */}
          {(selectedCategory ? sourcesInCategory : enabledSources).length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0 scrollbar-hide bg-primary" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(selectedCategory ? sourcesInCategory : enabledSources).map((source) => (
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
            {/* Search + Category tabs */}
            <div className="flex items-start gap-3">
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-input border rounded-lg text-primary text-sm px-4 py-2 focus:outline-none focus:ring-1 focus:ring-accent/10 focus:border-accent-border placeholder:text-muted w-56 flex-shrink-0"
              />
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {categoryGroupsWithCounts.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => { setSelectedCategory(group.id); setSelectedSource(null); setSelectedSubcategory(null) }}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors duration-150 ${
                      selectedCategory === group.id
                        ? 'bg-accent-muted text-accent border border-accent-border'
                        : 'text-secondary rounded-full hover:bg-hover hover:text-primary'
                    }`}
                  >
                    <span>{group.icon}</span>
                    {group.name}
                    <span className="text-xs text-muted">
                      ({group.totalAssets.toLocaleString()})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source filter chips — shown when a category is selected */}
            {selectedCategory && sourcesInCategory.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(14rem+0.75rem)] animate-[fadeSlideIn_0.25s_ease-out]">
                <button
                  type="button"
                  onClick={() => { setSelectedSource(null); setSelectedSubcategory(null) }}
                  className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200  ${
                    selectedSource === null
                      ? 'bg-accent-muted text-accent border border-accent-border'
                      : 'bg-surface text-muted border border hover:text-primary hover:border'
                  }`}
                >
                  All Sources
                </button>
                {sourcesInCategory.map((s, i) => (
                  <button
                    key={s.sourceId}
                    type="button"
                    onClick={() => { setSelectedSource(s.sourceId); setSelectedSubcategory(null) }}
                    className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200  ${
                      selectedSource === s.sourceId
                        ? 'bg-accent-muted text-accent border border-accent-border'
                        : 'bg-surface text-muted border border hover:text-primary hover:border'
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {SOURCE_DISPLAY_OVERRIDES[s.sourceId] || s.displayName}
                    <span className="ml-1 text-muted">({(assetCountBySource[s.sourceId] || 0).toLocaleString()})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Subcategory filter chips — shown when a subcategorized source is selected */}
            {selectedSource && availableSubcategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5 pl-[calc(14rem+0.75rem)] animate-[fadeSlideIn_0.25s_ease-out]">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200  ${
                    selectedSubcategory === null
                      ? 'bg-hover text-primary border border-hover'
                      : 'bg-surface text-muted border border hover:text-primary hover:border'
                  }`}
                >
                  All Types
                </button>
                {availableSubcategories.map(([key, count], i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedSubcategory(key)}
                    className={`px-2.5 py-1 rounded-full font-mono text-xs transition-all duration-200  ${
                      selectedSubcategory === key
                        ? 'bg-hover text-primary border border-hover'
                        : 'bg-surface text-muted border border hover:text-primary hover:border'
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {FEED_TYPE_DISPLAY_NAMES[key] || key}
                    <span className="ml-1 text-muted">({count.toLocaleString()})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Virtualized grid */}
          <div className="flex-1 border rounded-xl bg-surface overflow-hidden min-h-0">
            {isError ? (
              <div className="py-20 text-center text-red-loss/80 font-mono bg-primary">
                <p className="text-lg mb-2">Failed to load</p>
                <p className="text-sm text-muted">{error?.message}</p>
              </div>
            ) : !pricesLoaded ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 bg-primary">
                {/* Animated loading indicator */}
                <div className="relative">
                  <div className="w-16 h-16 border-2 border rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-spin" />
                </div>
                <div className="text-center font-mono">
                  <p className="text-lg text-secondary mb-1">
                    Loading {totalAssetsGlobal > 0 ? totalAssetsGlobal.toLocaleString() : '50,000+'} markets
                  </p>
                  <p className="text-sm text-muted">
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
                        <span key={s.sourceId} className="px-2 py-1 bg-surface border border font-mono text-xs text-muted">
                          {SOURCE_DISPLAY_OVERRIDES[s.sourceId] || s.displayName}: {count.toLocaleString()}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : virtualRows.length > 0 ? (
              <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin bg-primary" >
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                    
                    // Hide until virtualizer has calculated positions (prevents stacking flash)
                    visibility: virtualizer.getTotalSize() > 0 ? 'visible' : 'hidden',
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
              <div className="py-20 text-center text-muted font-mono">
                <p className="text-lg mb-2">No data found</p>
                <p className="text-sm">
                  {search ? 'Try a different search term' : 'Data sync may be in progress'}
                </p>
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex justify-between items-center mt-2 text-xs font-mono text-muted flex-shrink-0">
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
