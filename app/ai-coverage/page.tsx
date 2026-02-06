'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface SourceData {
  source: string
  name: string
  icon: string
  color: string
  total: number
  sample: string[]
  description: string
}

const SOURCE_CONFIG: Record<string, { name: string; icon: string; color: string; description: string }> = {
  crypto: {
    name: 'CoinGecko',
    icon: '🦎',
    color: '#8DC63F',
    description: 'Every token. Every chain. Every meme coin.'
  },
  stocks: {
    name: 'US Equities',
    icon: '📈',
    color: '#00D4AA',
    description: 'NYSE, NASDAQ, every ticker symbol.'
  },
  defi: {
    name: 'DefiLlama',
    icon: '🦙',
    color: '#627EEA',
    description: 'Every DeFi protocol. Every TVL metric.'
  },
  rates: {
    name: 'Fed & Treasury',
    icon: '🏛️',
    color: '#FFD700',
    description: 'Interest rates, yields, monetary policy.'
  },
  ecb: {
    name: 'ECB Forex',
    icon: '💱',
    color: '#00BFFF',
    description: 'Every major currency pair.'
  },
  bls: {
    name: 'BLS Economic',
    icon: '📊',
    color: '#FF69B4',
    description: 'CPI, jobs, GDP, inflation data.'
  },
}

function SourceCard({
  data,
  index,
  isExpanded,
  onToggle
}: {
  data: SourceData
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const [visibleSamples, setVisibleSamples] = useState<string[]>([])

  // Cycling sample tickers
  useEffect(() => {
    if (data.sample.length === 0) return

    const interval = setInterval(() => {
      const randomSamples = [...data.sample]
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
      setVisibleSamples(randomSamples)
    }, 2000)

    setVisibleSamples(data.sample.slice(0, 8))
    return () => clearInterval(interval)
  }, [data.sample])

  return (
    <div
      className={`
        border-2 transition-all duration-500 cursor-pointer
        ${isExpanded ? 'col-span-2 row-span-2' : ''}
      `}
      style={{
        borderColor: data.color,
        backgroundColor: `${data.color}10`,
        animationDelay: `${index * 100}ms`
      }}
      onClick={onToggle}
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-4xl mb-2">{data.icon}</div>
            <div className="font-mono font-bold text-xl" style={{ color: data.color }}>
              {data.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl md:text-5xl font-semibold text-primary">
              {data.total.toLocaleString()}
            </div>
            <div className="text-muted font-mono text-xs">markets</div>
          </div>
        </div>

        {/* Description */}
        <div className="text-secondary font-mono text-sm mb-4">
          {data.description}
        </div>

        {/* Sample tickers - scrolling */}
        <div className="flex-1 overflow-hidden">
          <div className="text-primary/30 font-mono text-[10px] mb-2">SAMPLE COVERAGE</div>
          <div className="flex flex-wrap gap-1">
            {visibleSamples.map((symbol, i) => (
              <span
                key={`${symbol}-${i}`}
                className="px-2 py-0.5 text-xs font-mono transition-all duration-300"
                style={{
                  backgroundColor: `${data.color}30`,
                  color: data.color
                }}
              >
                {symbol}
              </span>
            ))}
            {data.total > 8 && (
              <span className="px-2 py-0.5 text-xs font-mono text-primary/30">
                +{(data.total - 8).toLocaleString()} more
              </span>
            )}
          </div>
        </div>

        {/* Coverage bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
            <span>AI COVERAGE</span>
            <span>100%</span>
          </div>
          <div className="h-2 bg-hover rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: '100%',
                backgroundColor: data.color
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AI COVERAGE - Shows that one AI covers EVERYTHING from each source
 * "All of CoinGecko. All of DefiLlama. All of it."
 */
export default function AiCoveragePage() {
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [totalMarkets, setTotalMarkets] = useState(0)

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ['ai-coverage-sources'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=50`)
          if (!res.ok) return null
          const data = await res.json()
          const config = SOURCE_CONFIG[source]
          return {
            source,
            name: config.name,
            icon: config.icon,
            color: config.color,
            description: config.description,
            total: data.pagination?.total || 0,
            sample: data.prices?.map((p: { symbol: string; name: string }) => p.symbol || p.name.slice(0, 6)) || []
          } as SourceData
        })
      )
      return results.filter(Boolean) as SourceData[]
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (sourcesData) {
      setTotalMarkets(sourcesData.reduce((acc, s) => acc + s.total, 0))
    }
  }, [sourcesData])

  return (
    <main className="min-h-screen bg-primary text-primary">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary/95 backdrop-blur border-b border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-secondary hover:text-primary font-mono text-sm">
            ← Back
          </Link>
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-bold font-mono">
              <span className="text-accent">ONE AI.</span> TOTAL COVERAGE.
            </h1>
          </div>
          <Link
            href="/markets"
            className="bg-accent hover:bg-accent/80 text-primary font-mono text-sm px-4 py-2"
          >
            EXPLORE →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero stat */}
        <div className="text-center mb-12">
          <div className="text-muted font-mono text-sm mb-2">TOTAL MARKET COVERAGE</div>
          <div className="text-7xl md:text-9xl font-semibold text-primary">
            {totalMarkets.toLocaleString()}
          </div>
          <div className="text-muted font-mono mt-2">
            markets tracked by a single AI agent
          </div>
        </div>

        {/* Source grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="text-muted font-mono animate-pulse">Loading coverage data...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {sourcesData?.map((source, i) => (
              <SourceCard
                key={source.source}
                data={source}
                index={i}
                isExpanded={expandedSource === source.source}
                onToggle={() => setExpandedSource(
                  expandedSource === source.source ? null : source.source
                )}
              />
            ))}
          </div>
        )}

        {/* The impossible comparison */}
        <div className="border border bg-surface p-8 mb-12">
          <div className="text-center mb-8">
            <div className="text-muted font-mono text-sm mb-2">THE IMPOSSIBLE COMPARISON</div>
            <div className="text-2xl font-bold font-mono text-primary">
              What would it take for a human to track {totalMarkets.toLocaleString()} markets?
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 border border">
              <div className="text-5xl mb-4">⏰</div>
              <div className="text-3xl font-semibold text-primary mb-2">
                {Math.round(totalMarkets * 0.5).toLocaleString()}
              </div>
              <div className="text-secondary font-mono text-sm">
                hours to review each market once<br />
                <span className="text-primary/30">(30 sec per market)</span>
              </div>
            </div>

            <div className="text-center p-6 border border">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-3xl font-semibold text-primary mb-2">
                {Math.round(totalMarkets / 8 / 365).toLocaleString()}
              </div>
              <div className="text-secondary font-mono text-sm">
                years working 8h/day<br />
                <span className="text-primary/30">(just to see each once)</span>
              </div>
            </div>

            <div className="text-center p-6 border border">
              <div className="text-5xl mb-4">🧠</div>
              <div className="text-3xl font-semibold text-primary mb-2">
                IMPOSSIBLE
              </div>
              <div className="text-secondary font-mono text-sm">
                for humans to hold in memory<br />
                <span className="text-primary/30">(working memory: ~7 items)</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <div className="inline-block bg-accent/20 border border-accent px-6 py-3">
              <span className="text-accent font-mono font-bold text-lg">
                Our AI does it in real-time. 24/7. No coffee breaks.
              </span>
            </div>
          </div>
        </div>

        {/* Live feed simulation */}
        <div className="border border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-muted font-mono text-sm">LIVE AI PROCESSING FEED</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-green font-mono text-xs">ACTIVE</span>
            </div>
          </div>

          <div className="font-mono text-xs space-y-1 h-32 overflow-hidden">
            {sourcesData?.flatMap(s => s.sample.slice(0, 3).map(sym => ({
              source: s.source,
              symbol: sym,
              color: s.color
            }))).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-secondary animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <span className="text-primary/30">{new Date().toLocaleTimeString()}</span>
                <span style={{ color: item.color }}>[{item.source.toUpperCase()}]</span>
                <span>Analyzing {item.symbol}...</span>
                <span className="text-green">✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
