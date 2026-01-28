'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Market type configuration
 */
const MARKET_TYPES: Record<string, {
  name: string
  emoji: string
  description: string
  sources: string[]
  updateFreq: string
}> = {
  crypto: {
    name: 'Crypto',
    emoji: '₿',
    description: '18,000+ tokens via CoinGecko',
    sources: ['crypto'],
    updateFreq: '10 min',
  },
  stocks: {
    name: 'Stocks',
    emoji: '📈',
    description: 'S&P 500, NASDAQ via Finnhub',
    sources: ['stocks'],
    updateFreq: '5 min',
  },
  weather: {
    name: 'Weather',
    emoji: '🌤️',
    description: 'Global weather data via Open-Meteo',
    sources: ['weather'],
    updateFreq: '30 min',
  },
  predictions: {
    name: 'Predictions',
    emoji: '🔮',
    description: 'Prediction markets via Polymarket',
    sources: ['polymarket'],
    updateFreq: '1 hour',
  },
  defi: {
    name: 'DeFi',
    emoji: '🔗',
    description: 'Protocol TVL via DefiLlama',
    sources: ['defi'],
    updateFreq: '1 hour',
  },
  fx: {
    name: 'FX',
    emoji: '💱',
    description: 'EUR/USD and major pairs',
    sources: ['ecb'],
    updateFreq: 'Daily',
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
}

function PriceTile({ price }: { price: MarketPrice }) {
  const value = parseFloat(price.value)
  const changePct = price.changePct ? parseFloat(price.changePct) : null
  const isUp = changePct !== null && changePct >= 0
  const isDown = changePct !== null && changePct < 0

  // Format price based on value
  const formatValue = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`
    if (v >= 1) return `$${v.toFixed(2)}`
    if (v >= 0.01) return `$${v.toFixed(4)}`
    return `$${v.toFixed(6)}`
  }

  return (
    <div
      className={`p-2 border transition-all hover:scale-105 hover:z-10 ${
        isUp ? 'border-green-500/30 bg-green-500/5' :
        isDown ? 'border-red-500/30 bg-red-500/5' :
        'border-white/10 bg-white/5'
      }`}
      title={`${price.name}\n${price.symbol}: ${formatValue(value)}${changePct !== null ? ` (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)` : ''}`}
    >
      <div className="font-mono text-xs font-bold text-white truncate">
        {price.symbol}
      </div>
      <div className="font-mono text-[10px] text-white/60 truncate">
        {formatValue(value)}
      </div>
      {changePct !== null && (
        <div className={`font-mono text-[10px] ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '↑' : '↓'}{Math.abs(changePct).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

function MarketTypeTab({
  typeId,
  config,
  isSelected,
  onClick,
  count
}: {
  typeId: string
  config: typeof MARKET_TYPES[string]
  isSelected: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 border-b-2 transition-all font-mono text-sm ${
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
  const [selectedType, setSelectedType] = useState<string>('crypto')
  const selectedConfig = MARKET_TYPES[selectedType]

  // Fetch ALL prices for selected source (large limit for massive effect)
  const { data: pricesData, isLoading } = useQuery({
    queryKey: ['market-prices-all', selectedType],
    queryFn: async () => {
      const source = selectedConfig.sources[0]
      const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=5000`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      return res.json() as Promise<{ prices: MarketPrice[]; pagination: { total: number } }>
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  // Sort by market cap
  const prices = useMemo(() => {
    if (!pricesData?.prices) return []
    return [...pricesData.prices].sort((a, b) => {
      const mcA = a.marketCap ? parseFloat(a.marketCap) : 0
      const mcB = b.marketCap ? parseFloat(b.marketCap) : 0
      return mcB - mcA
    })
  }, [pricesData])

  const total = pricesData?.pagination?.total || 0

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Page header */}
          <div className="mb-4">
            <Link href="/" className="text-white/60 hover:text-white font-mono text-sm mb-2 inline-block">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white font-mono">Markets</h1>
            <p className="text-white/40 font-mono text-sm">
              {total.toLocaleString()} assets tracked in real-time
            </p>
          </div>

          {/* Market type tabs */}
          <div className="flex flex-wrap gap-1 border-b border-white/20 mb-4 overflow-x-auto">
            {Object.entries(MARKET_TYPES).map(([typeId, config]) => (
              <MarketTypeTab
                key={typeId}
                typeId={typeId}
                config={config}
                isSelected={selectedType === typeId}
                onClick={() => setSelectedType(typeId)}
                count={selectedType === typeId ? total : undefined}
              />
            ))}
          </div>

          {/* Grid of price tiles */}
          <div className="border border-white/20 bg-black/50 overflow-hidden">
            <div className="h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                // Loading skeleton grid
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-px bg-white/5">
                  {Array.from({ length: 200 }).map((_, i) => (
                    <div key={i} className="p-2 bg-terminal animate-pulse">
                      <div className="h-3 w-10 bg-white/10 rounded mb-1" />
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : prices.length > 0 ? (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-px bg-white/10">
                  {prices.map((price) => (
                    <PriceTile key={`${price.source}-${price.assetId}`} price={price} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-white/40 font-mono">
                  No data available for {selectedConfig.name}
                </div>
              )}
            </div>
          </div>

          {/* Stats footer */}
          <div className="flex justify-between items-center mt-4 text-xs font-mono text-white/40">
            <span>Showing {prices.length.toLocaleString()} of {total.toLocaleString()} assets</span>
            <span>Updated every {selectedConfig.updateFreq}</span>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
