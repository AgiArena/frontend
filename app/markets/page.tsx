'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const ITEMS_PER_PAGE = 200

/**
 * Market sources configuration - based on actual backend data
 */
const MARKET_SOURCES: Record<string, {
  name: string
  emoji: string
  description: string
  source: string
  updateFreq: string
  hasLogos: boolean
}> = {
  crypto: {
    name: 'Crypto',
    emoji: '₿',
    description: '18,000+ tokens via CoinGecko',
    source: 'crypto',
    updateFreq: '10 min',
    hasLogos: true,
  },
  stocks: {
    name: 'Stocks',
    emoji: '📈',
    description: 'US equities via Finnhub',
    source: 'stocks',
    updateFreq: '5 min',
    hasLogos: false,
  },
  defi: {
    name: 'DeFi TVL',
    emoji: '🔗',
    description: 'Protocol TVL via DefiLlama',
    source: 'defi',
    updateFreq: '1 hour',
    hasLogos: false,
  },
  rates: {
    name: 'Rates',
    emoji: '🏛️',
    description: 'Treasury yields & Fed rates',
    source: 'rates',
    updateFreq: 'Daily',
    hasLogos: false,
  },
  forex: {
    name: 'Forex',
    emoji: '💱',
    description: 'Currency pairs via ECB',
    source: 'ecb',
    updateFreq: 'Daily',
    hasLogos: false,
  },
  economic: {
    name: 'Economic',
    emoji: '📊',
    description: 'CPI, Jobs, GDP via BLS',
    source: 'bls',
    updateFreq: 'Monthly',
    hasLogos: false,
  },
}

interface MarketPrice {
  source: string
  assetId: string
  symbol: string
  name: string
  value: string
  changePct: string | null
  fetchedAt: string
  category: string | null
  marketCap?: string | null
  volume24h?: string | null
  imageUrl?: string | null
}

function formatValue(v: number, source: string): string {
  // For rates/percentages
  if (source === 'rates' || source === 'bls') {
    return `${v.toFixed(2)}%`
  }
  // For forex (exchange rates around 1)
  if (source === 'ecb') {
    return v.toFixed(4)
  }
  // For large values (TVL, market cap)
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

function CryptoLogo({ assetId, symbol, size = 20 }: { assetId: string; symbol: string; size?: number }) {
  const [hasError, setHasError] = useState(false)
  const localPath = `/logos/crypto/${assetId}.png`

  if (hasError) {
    // Fallback to first letter
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
      src={localPath}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full"
      onError={() => setHasError(true)}
      unoptimized
    />
  )
}

function PriceTile({ price, source, hasLogos }: { price: MarketPrice; source: string; hasLogos: boolean }) {
  const value = parseFloat(price.value)
  const changePct = price.changePct ? parseFloat(price.changePct) : null
  const isUp = changePct !== null && changePct >= 0
  const isDown = changePct !== null && changePct < 0

  // Build tooltip with more details
  const tooltipLines = [
    price.name,
    `Price: ${formatValue(value, source)}`,
  ]
  if (changePct !== null) {
    tooltipLines.push(`24h: ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`)
  }
  if (price.marketCap) {
    tooltipLines.push(formatMarketCap(price.marketCap))
  }
  if (price.volume24h) {
    const vol = parseFloat(price.volume24h)
    if (vol >= 1e6) tooltipLines.push(`Vol: $${(vol / 1e6).toFixed(1)}M`)
    else if (vol >= 1e3) tooltipLines.push(`Vol: $${(vol / 1e3).toFixed(0)}K`)
  }

  // Use name for display if symbol is empty or just "-"
  const displaySymbol = (!price.symbol || price.symbol === '-')
    ? price.name.replace(' TVL', '').slice(0, 10)
    : price.symbol

  return (
    <div
      className={`p-2 border transition-all cursor-default hover:scale-105 hover:z-10 relative group ${
        isUp ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/60' :
        isDown ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/60' :
        'border-white/10 bg-white/5 hover:border-white/30'
      }`}
    >
      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/20 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
        {tooltipLines.map((line, i) => (
          <div key={i} className={`font-mono text-xs ${i === 0 ? 'text-white font-bold' : 'text-white/70'}`}>
            {line}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {hasLogos && (
          <CryptoLogo assetId={price.assetId} symbol={price.symbol} size={16} />
        )}
        <div className="font-mono text-xs font-bold text-white truncate">
          {displaySymbol}
        </div>
      </div>
      <div className="font-mono text-[10px] text-white/60 truncate">
        {formatValue(value, source)}
      </div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '↑' : '↓'}{Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

function SourceTab({
  id,
  config,
  isSelected,
  onClick,
  count
}: {
  id: string
  config: typeof MARKET_SOURCES[string]
  isSelected: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 border-b-2 transition-all font-mono text-sm whitespace-nowrap ${
        isSelected
          ? 'border-accent text-accent'
          : 'border-transparent text-white/60 hover:text-white'
      }`}
    >
      <span className="mr-1">{config.emoji}</span>
      {config.name}
      {count !== undefined && count > 0 && (
        <span className="ml-1 text-xs text-white/40">({count.toLocaleString()})</span>
      )}
    </button>
  )
}

export default function MarketsPage() {
  const [selectedSource, setSelectedSource] = useState<string>('crypto')
  const config = MARKET_SOURCES[selectedSource]
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Infinite query for paginated data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['market-prices-infinite', selectedSource],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`${API_URL}/api/market-prices?source=${config.source}&page=${pageParam}&limit=${ITEMS_PER_PAGE}`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      return res.json() as Promise<{ prices: MarketPrice[]; pagination: { total: number; hasMore: boolean } }>
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination.hasMore) {
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  // Flatten and sort all pages
  const prices = useMemo(() => {
    if (!data?.pages) return []
    const allPrices = data.pages.flatMap(page => page.prices)
    return [...allPrices].sort((a, b) => {
      const mcA = a.marketCap ? parseFloat(a.marketCap) : parseFloat(a.value)
      const mcB = b.marketCap ? parseFloat(b.marketCap) : parseFloat(b.value)
      return mcB - mcA
    })
  }, [data])

  const total = data?.pages[0]?.pagination?.total || 0

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isFetchingNextPage || !hasNextPage) return

    const { scrollTop, scrollHeight, clientHeight } = container
    // Load more when user scrolls within 500px of bottom
    if (scrollHeight - scrollTop - clientHeight < 500) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Reset scroll position when source changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [selectedSource])

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      <Header />

      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 py-4 h-full flex flex-col">
          {/* Page header */}
          <div className="mb-3 flex-shrink-0">
            <Link href="/" className="text-white/60 hover:text-white font-mono text-sm mb-1 inline-block">
              ← Back
            </Link>
            <div className="flex items-baseline gap-4">
              <h1 className="text-2xl font-bold text-white font-mono">Markets</h1>
              <span className="text-white/40 font-mono text-sm">
                {total.toLocaleString()} assets • Updated every {config.updateFreq}
              </span>
            </div>
          </div>

          {/* Source tabs */}
          <div className="flex gap-1 border-b border-white/20 mb-3 overflow-x-auto flex-shrink-0">
            {Object.entries(MARKET_SOURCES).map(([id, cfg]) => (
              <SourceTab
                key={id}
                id={id}
                config={cfg}
                isSelected={selectedSource === id}
                onClick={() => setSelectedSource(id)}
                count={selectedSource === id ? total : undefined}
              />
            ))}
          </div>

          {/* Grid container - takes remaining height */}
          <div className="flex-1 border border-white/20 bg-black/30 overflow-hidden min-h-0">
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto overflow-x-hidden"
            >
              {isLoading ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 xl:grid-cols-18 2xl:grid-cols-22 gap-px bg-white/5">
                  {Array.from({ length: 300 }).map((_, i) => (
                    <div key={i} className="p-2 bg-terminal animate-pulse">
                      <div className="h-3 w-10 bg-white/10 rounded mb-1" />
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : prices.length > 0 ? (
                <>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 xl:grid-cols-18 2xl:grid-cols-22 gap-px bg-white/10">
                    {prices.map((price) => (
                      <PriceTile
                        key={`${price.source}-${price.assetId}`}
                        price={price}
                        source={config.source}
                        hasLogos={config.hasLogos}
                      />
                    ))}
                  </div>
                  {/* Loading indicator for infinite scroll */}
                  {isFetchingNextPage && (
                    <div className="py-4 text-center">
                      <div className="inline-flex items-center gap-2 text-white/60 font-mono text-sm">
                        <span className="animate-spin">⟳</span>
                        Loading more...
                      </div>
                    </div>
                  )}
                  {/* End indicator */}
                  {!hasNextPage && prices.length > 0 && (
                    <div className="py-4 text-center text-white/40 font-mono text-xs">
                      All {total.toLocaleString()} assets loaded
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-white/40 font-mono">
                  <p className="text-lg mb-2">No data for {config.name}</p>
                  <p className="text-sm">Data sync may be in progress</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex justify-between items-center mt-2 text-xs font-mono text-white/40 flex-shrink-0">
            <span>Showing {prices.length.toLocaleString()} of {total.toLocaleString()}</span>
            <span>{config.description}</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
