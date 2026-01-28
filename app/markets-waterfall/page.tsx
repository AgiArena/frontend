'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface MarketPrice {
  source: string
  assetId: string
  symbol: string
  name: string
  value: string
  changePct: string | null
  marketCap?: string | null
}

interface ColumnConfig {
  key: string
  title: string
  emoji: string
  source: string
  countLabel: string
}

const COLUMNS: ColumnConfig[] = [
  { key: 'crypto', title: 'CRYPTO', emoji: '₿', source: 'crypto', countLabel: '18,000+' },
  { key: 'stocks', title: 'STOCKS', emoji: '📈', source: 'stocks', countLabel: '8,000+' },
  { key: 'macro', title: 'MACRO', emoji: '🏛️', source: 'rates', countLabel: '400+' },
]

function formatValue(v: number, source: string): string {
  if (source === 'rates' || source === 'bls') return `${v.toFixed(2)}%`
  if (source === 'ecb') return v.toFixed(4)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

function ScrollingColumn({
  config,
  prices,
  speed = 1,
  direction = 'down'
}: {
  config: ColumnConfig
  prices: MarketPrice[]
  speed?: number
  direction?: 'up' | 'down'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (prices.length === 0) return

    const itemHeight = 48 // Height of each row
    const totalHeight = prices.length * itemHeight

    const animate = () => {
      setOffset(prev => {
        const next = direction === 'down'
          ? prev + speed * 0.5
          : prev - speed * 0.5

        // Loop around
        if (direction === 'down' && next > totalHeight) return 0
        if (direction === 'up' && next < -totalHeight) return 0
        return next
      })
    }

    const interval = setInterval(animate, 50)
    return () => clearInterval(interval)
  }, [prices.length, speed, direction])

  // Double the items for seamless loop
  const displayItems = [...prices, ...prices]

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className="border-b border-white/20 pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.emoji}</span>
            <span className="text-white font-mono font-bold">{config.title}</span>
          </div>
          <span className="text-accent font-mono font-bold text-lg">{config.countLabel}</span>
        </div>
      </div>

      {/* Scrolling content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
      >
        {/* Fade overlay top */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />

        {/* Fade overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

        <div
          className="absolute w-full"
          style={{
            transform: `translateY(-${offset}px)`,
          }}
        >
          {displayItems.map((price, i) => {
            const value = parseFloat(price.value)
            const changePct = price.changePct ? parseFloat(price.changePct) : null
            const isUp = changePct !== null && changePct >= 0
            const displaySymbol = price.symbol || price.name.slice(0, 6)

            return (
              <div
                key={`${price.assetId}-${i}`}
                className="h-12 flex items-center justify-between px-2 border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs ${isUp ? 'text-green-400' : changePct !== null ? 'text-red-400' : 'text-white/40'}`}>
                    {isUp ? '↑' : changePct !== null ? '↓' : '•'}
                  </span>
                  <span className="text-white font-mono font-bold truncate">
                    {displaySymbol}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white/80 font-mono text-sm">
                    {formatValue(value, config.source)}
                  </div>
                  {changePct !== null && (
                    <div className={`font-mono text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{changePct.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ComparisonSlam({ totalCount }: { totalCount: number }) {
  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Others */}
          <div className="border border-white/20 bg-white/5 p-8 text-center">
            <div className="text-white/40 font-mono text-sm mb-2">POLYMARKET</div>
            <div className="text-6xl md:text-8xl font-bold text-white/60 font-mono">
              ~50
            </div>
            <div className="text-white/40 font-mono text-sm mt-2">markets</div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-mono text-white/30">
              <span className="border border-white/10 px-2 py-1">US Elections</span>
              <span className="border border-white/10 px-2 py-1">Sports</span>
              <span className="border border-white/10 px-2 py-1">Crypto (5)</span>
            </div>
          </div>

          {/* VS divider */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-white/20 font-mono text-2xl font-bold">
            vs
          </div>

          {/* AgiArena */}
          <div className="border-2 border-accent bg-accent/10 p-8 text-center relative overflow-hidden">
            {/* Animated glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/20 to-transparent animate-pulse" />

            <div className="relative">
              <div className="text-accent font-mono text-sm mb-2 font-bold">AGIARENA</div>
              <div className="text-6xl md:text-8xl font-bold text-white font-mono">
                {totalCount.toLocaleString()}
              </div>
              <div className="text-white/60 font-mono text-sm mt-2">markets and counting</div>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-mono">
                <span className="border border-accent/50 bg-accent/20 text-white px-2 py-1">₿ Crypto 18K+</span>
                <span className="border border-accent/50 bg-accent/20 text-white px-2 py-1">📈 Stocks 8K+</span>
                <span className="border border-accent/50 bg-accent/20 text-white px-2 py-1">🏛️ Macro</span>
                <span className="border border-accent/50 bg-accent/20 text-white px-2 py-1">💱 Forex</span>
                <span className="border border-accent/50 bg-accent/20 text-white px-2 py-1">🔗 DeFi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multiplier callout */}
        <div className="text-center mt-8">
          <span className="inline-block bg-accent text-white font-mono font-bold text-2xl px-6 py-3">
            {Math.round(totalCount / 50)}x MORE MARKETS
          </span>
        </div>
      </div>
    </div>
  )
}

export default function MarketsWaterfallPage() {
  const [totalCount, setTotalCount] = useState(0)

  // Fetch data for each column
  const { data: cryptoPrices } = useQuery({
    queryKey: ['waterfall-crypto'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market-prices?source=crypto&limit=200`)
      if (!res.ok) return { prices: [], total: 0 }
      const data = await res.json()
      return { prices: data.prices as MarketPrice[], total: data.pagination?.total || 0 }
    },
    staleTime: 60 * 1000,
  })

  const { data: stocksPrices } = useQuery({
    queryKey: ['waterfall-stocks'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market-prices?source=stocks&limit=200`)
      if (!res.ok) return { prices: [], total: 0 }
      const data = await res.json()
      return { prices: data.prices as MarketPrice[], total: data.pagination?.total || 0 }
    },
    staleTime: 60 * 1000,
  })

  const { data: macroPrices } = useQuery({
    queryKey: ['waterfall-macro'],
    queryFn: async () => {
      // Combine rates, forex, economic
      const sources = ['rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=100`)
          if (!res.ok) return { prices: [], total: 0 }
          const data = await res.json()
          return { prices: data.prices as MarketPrice[], total: data.pagination?.total || 0 }
        })
      )
      return {
        prices: results.flatMap(r => r.prices),
        total: results.reduce((acc, r) => acc + r.total, 0)
      }
    },
    staleTime: 60 * 1000,
  })

  // Fetch DeFi for total count
  const { data: defiPrices } = useQuery({
    queryKey: ['waterfall-defi'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market-prices?source=defi&limit=1`)
      if (!res.ok) return { total: 0 }
      const data = await res.json()
      return { total: data.pagination?.total || 0 }
    },
    staleTime: 60 * 1000,
  })

  // Calculate total
  useEffect(() => {
    const crypto = cryptoPrices?.total || 0
    const stocks = stocksPrices?.total || 0
    const macro = macroPrices?.total || 0
    const defi = defiPrices?.total || 0
    setTotalCount(crypto + stocks + macro + defi)
  }, [cryptoPrices?.total, stocksPrices?.total, macroPrices?.total, defiPrices?.total])

  // Sort by market cap
  const sortedCrypto = useMemo(() => {
    if (!cryptoPrices?.prices) return []
    return [...cryptoPrices.prices].sort((a, b) => {
      const mcA = a.marketCap ? parseFloat(a.marketCap) : 0
      const mcB = b.marketCap ? parseFloat(b.marketCap) : 0
      return mcB - mcA
    })
  }, [cryptoPrices?.prices])

  const sortedStocks = useMemo(() => {
    if (!stocksPrices?.prices) return []
    return [...stocksPrices.prices].sort((a, b) => {
      const vA = parseFloat(a.value)
      const vB = parseFloat(b.value)
      return vB - vA
    })
  }, [stocksPrices?.prices])

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <Header />

      {/* Comparison slam - hero */}
      <ComparisonSlam totalCount={totalCount} />

      {/* Waterfall section */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white font-mono">LIVE MARKET FEED</h2>
            <p className="text-white/40 font-mono text-sm mt-2">
              Real-time prices flowing from {totalCount.toLocaleString()} tradeable markets
            </p>
          </div>

          {/* Three columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
            <div className="border border-white/20 bg-black/50 p-4">
              <ScrollingColumn
                config={COLUMNS[0]}
                prices={sortedCrypto}
                speed={1}
                direction="down"
              />
            </div>
            <div className="border border-white/20 bg-black/50 p-4">
              <ScrollingColumn
                config={COLUMNS[1]}
                prices={sortedStocks}
                speed={0.8}
                direction="up"
              />
            </div>
            <div className="border border-white/20 bg-black/50 p-4">
              <ScrollingColumn
                config={COLUMNS[2]}
                prices={macroPrices?.prices || []}
                speed={0.5}
                direction="down"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="border-2 border-accent bg-accent/10 p-1 flex items-center">
          <span className="text-white/60 px-4 font-mono text-xl">🔍</span>
          <input
            type="text"
            placeholder={`Search ${totalCount.toLocaleString()} markets...`}
            className="flex-1 bg-transparent text-white font-mono py-4 text-lg outline-none placeholder:text-white/40"
          />
          <Link
            href="/markets"
            className="bg-accent text-white font-mono font-bold px-8 py-4 text-lg hover:bg-accent/80 transition-colors"
          >
            EXPLORE ALL
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  )
}
