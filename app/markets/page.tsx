'use client'

import { useState } from 'react'
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
    name: 'Cryptocurrency',
    emoji: '₿',
    description: 'BTC, ETH, SOL and 18,000+ tokens tracked via CoinGecko',
    sources: ['crypto'],
    updateFreq: '10 min',
  },
  stocks: {
    name: 'US Stocks',
    emoji: '📈',
    description: 'S&P 500, NASDAQ components via Finnhub',
    sources: ['stocks'],
    updateFreq: '5 min (market hours)',
  },
  defi: {
    name: 'DeFi TVL',
    emoji: '🔗',
    description: 'Protocol TVL rankings via DefiLlama',
    sources: ['defi'],
    updateFreq: '1 hour',
  },
  rates: {
    name: 'Interest Rates',
    emoji: '🏛️',
    description: 'Treasury yields and Fed rates',
    sources: ['rates'],
    updateFreq: 'Daily',
  },
  fx: {
    name: 'Foreign Exchange',
    emoji: '💱',
    description: 'EUR/USD and major pairs via ECB',
    sources: ['ecb'],
    updateFreq: 'Daily',
  },
  economic: {
    name: 'Economic Data',
    emoji: '📊',
    description: 'Labor statistics via BLS',
    sources: ['bls'],
    updateFreq: 'Monthly',
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
}

interface MarketStats {
  totalAssets: number
  activeAssets: number
  lastSyncAt: string | null
}

function MarketTypeCard({
  typeId,
  config,
  isSelected,
  onClick
}: {
  typeId: string
  config: typeof MARKET_TYPES[string]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 border text-left transition-all ${
        isSelected
          ? 'border-accent bg-accent/10'
          : 'border-white/20 hover:border-white/40 bg-terminal'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{config.emoji}</span>
        <div>
          <h3 className="text-white font-mono font-bold">{config.name}</h3>
          <p className="text-white/40 text-xs font-mono">{config.updateFreq}</p>
        </div>
      </div>
      <p className="text-white/60 text-sm font-mono">{config.description}</p>
    </button>
  )
}

function PriceRow({ price }: { price: MarketPrice }) {
  const value = parseFloat(price.value)
  const changePct = price.changePct ? parseFloat(price.changePct) : null
  const lastUpdate = new Date(price.fetchedAt)
  const minutesAgo = Math.round((Date.now() - lastUpdate.getTime()) / 60000)

  return (
    <tr className="border-b border-white/10 hover:bg-white/5">
      <td className="py-3 px-4 font-mono text-white font-bold">{price.symbol}</td>
      <td className="py-3 px-4 font-mono text-white/60 text-sm hidden md:table-cell">{price.name}</td>
      <td className="py-3 px-4 font-mono text-white text-right">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 })}
      </td>
      <td className="py-3 px-4 font-mono text-right">
        {changePct !== null ? (
          <span className={changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        ) : (
          <span className="text-white/30">-</span>
        )}
      </td>
      <td className="py-3 px-4 font-mono text-white/40 text-sm text-right hidden sm:table-cell">
        {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}
      </td>
    </tr>
  )
}

export default function MarketsPage() {
  const [selectedType, setSelectedType] = useState<string>('crypto')
  const selectedConfig = MARKET_TYPES[selectedType]

  // Fetch prices for selected source
  const { data: pricesData, isLoading } = useQuery({
    queryKey: ['market-prices', selectedType],
    queryFn: async () => {
      const source = selectedConfig.sources[0]
      const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=100`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      return res.json() as Promise<{ prices: MarketPrice[]; pagination: { total: number } }>
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  })

  // Fetch stats for selected source
  const { data: statsData } = useQuery({
    queryKey: ['market-stats', selectedType],
    queryFn: async () => {
      const source = selectedConfig.sources[0]
      const res = await fetch(`${API_URL}/api/market-stats/${source}`)
      if (!res.ok) return null
      return res.json() as Promise<{ stats: MarketStats }>
    },
    staleTime: 5 * 60 * 1000,
  })

  const prices = pricesData?.prices || []
  const total = pricesData?.pagination?.total || 0
  const stats = statsData?.stats

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="max-w-6xl mx-auto p-6">
          {/* Page header */}
          <div className="mb-8">
            <Link href="/" className="text-white/60 hover:text-white font-mono text-sm mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-white font-mono">Tracked Markets</h1>
            <p className="text-white/60 font-mono mt-2">
              Real-time data sources powering AgiArena bets
            </p>
          </div>

          {/* Market type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {Object.entries(MARKET_TYPES).map(([typeId, config]) => (
              <MarketTypeCard
                key={typeId}
                typeId={typeId}
                config={config}
                isSelected={selectedType === typeId}
                onClick={() => setSelectedType(typeId)}
              />
            ))}
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 border border-white/20 bg-black/50">
            <div>
              <span className="text-white/40 text-xs font-mono">SOURCE</span>
              <p className="text-white font-mono font-bold">{selectedConfig.sources.join(', ')}</p>
            </div>
            <div>
              <span className="text-white/40 text-xs font-mono">ASSETS</span>
              <p className="text-white font-mono font-bold">{total.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-white/40 text-xs font-mono">UPDATE FREQ</span>
              <p className="text-accent font-mono font-bold">{selectedConfig.updateFreq}</p>
            </div>
            {stats?.lastSyncAt && (
              <div>
                <span className="text-white/40 text-xs font-mono">LAST SYNC</span>
                <p className="text-white font-mono font-bold">
                  {new Date(stats.lastSyncAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {/* Prices table */}
          <div className="border border-white/20 bg-terminal overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-black/50">
                  <th className="py-3 px-4 text-left font-mono text-white/60 text-xs uppercase">Symbol</th>
                  <th className="py-3 px-4 text-left font-mono text-white/60 text-xs uppercase hidden md:table-cell">Name</th>
                  <th className="py-3 px-4 text-right font-mono text-white/60 text-xs uppercase">Price</th>
                  <th className="py-3 px-4 text-right font-mono text-white/60 text-xs uppercase">24h</th>
                  <th className="py-3 px-4 text-right font-mono text-white/60 text-xs uppercase hidden sm:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton rows
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/10">
                      <td className="py-3 px-4"><div className="h-4 w-16 skeleton rounded" /></td>
                      <td className="py-3 px-4 hidden md:table-cell"><div className="h-4 w-32 skeleton rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-20 skeleton rounded ml-auto" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-16 skeleton rounded ml-auto" /></td>
                      <td className="py-3 px-4 hidden sm:table-cell"><div className="h-4 w-16 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : prices.length > 0 ? (
                  prices.map((price) => (
                    <PriceRow key={`${price.source}-${price.assetId}`} price={price} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40 font-mono">
                      No data available for this market type
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-white/30 text-xs font-mono text-center mt-6">
            All bets resolved using on-chain keeper consensus (3-of-5 majority)
          </p>
        </div>
      </div>

      <Footer />
    </main>
  )
}
