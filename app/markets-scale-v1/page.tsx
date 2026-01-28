'use client'

import { useState } from 'react'
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
}

interface HoveredMarket {
  symbol: string
  name: string
  value: number
  changePct: number | null
  source: string
  x: number
  y: number
}

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stocks: '#00D4AA',
  defi: '#627EEA',
  rates: '#FFD700',
  ecb: '#00BFFF',
  bls: '#FF69B4',
}

function formatValue(v: number, source: string): string {
  if (source === 'rates' || source === 'bls') return `${v.toFixed(2)}%`
  if (source === 'ecb') return v.toFixed(4)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(6)}`
}

/**
 * VERSION 1: Side-by-side comparison with proportional squares
 * Shows competitors as small boxes next to massive AgiArena grid
 */
export default function MarketsScaleV1Page() {
  const [hoveredMarket, setHoveredMarket] = useState<HoveredMarket | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { data: allPrices, isLoading } = useQuery({
    queryKey: ['scale-v1-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=3000`)
          if (!res.ok) return { prices: [], total: 0, source }
          const data = await res.json()
          return {
            prices: (data.prices as MarketPrice[]).map(p => ({ ...p, source })),
            total: data.pagination?.total || 0,
            source
          }
        })
      )
      const total = results.reduce((acc, r) => acc + r.total, 0)
      setTotalCount(total)
      return results.flatMap(r => r.prices.slice(0, 1500))
    },
    staleTime: 60 * 1000,
  })

  const handleHover = (market: MarketPrice, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredMarket({
      symbol: market.symbol || market.name.slice(0, 6),
      name: market.name,
      value: parseFloat(market.value),
      changePct: market.changePct ? parseFloat(market.changePct) : null,
      source: market.source,
      x: rect.left + rect.width / 2,
      y: rect.top
    })
  }

  // Competitor data
  const competitors = [
    { name: 'POLYMARKET', count: 400, color: '#6366f1' },
    { name: 'BINANCE', count: 1500, color: '#f0b90b' },
  ]

  const agiArenaCount = totalCount || 50000

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <Header />

      <div className="flex-1 px-4 py-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-mono mb-2">
              MARKET <span className="text-accent">COVERAGE</span>
            </h1>
            <p className="text-white/40 font-mono text-sm">
              Area represents number of tradeable markets. Hover any square for details.
            </p>
          </div>

          {/* Side by side comparison */}
          <div className="flex flex-wrap items-end justify-center gap-6 mb-8">
            {/* Competitors */}
            {competitors.map(comp => {
              const size = Math.sqrt(comp.count) * 2
              return (
                <div key={comp.name} className="flex flex-col items-center">
                  <div
                    className="border border-white/30 bg-white/5 flex items-center justify-center"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderColor: comp.color
                    }}
                  >
                    <span className="text-white/60 font-mono text-xs">{comp.count}</span>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-mono text-xs" style={{ color: comp.color }}>{comp.name}</div>
                  </div>
                </div>
              )
            })}

            {/* AgiArena - THE BIG ONE */}
            <div className="flex flex-col items-center">
              <div
                className="border-2 border-accent bg-black relative overflow-hidden"
                style={{
                  width: 'min(500px, 70vw)',
                  height: 'min(350px, 45vh)'
                }}
              >
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/40 font-mono animate-pulse">Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-[1px] p-1">
                      {allPrices?.map((market, i) => {
                        const changePct = market.changePct ? parseFloat(market.changePct) : null
                        const isUp = changePct !== null && changePct >= 0
                        return (
                          <div
                            key={`${market.source}-${market.assetId}-${i}`}
                            className="w-[5px] h-[5px] cursor-pointer hover:scale-[3] hover:z-50 transition-transform"
                            style={{
                              backgroundColor: isUp ? '#22c55e' : changePct !== null ? '#ef4444' : SOURCE_COLORS[market.source] || '#fff',
                              opacity: 0.7
                            }}
                            onMouseEnter={(e) => handleHover(market, e)}
                            onMouseLeave={() => setHoveredMarket(null)}
                          />
                        )
                      })}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/90 px-4 py-3 border border-accent">
                        <div className="text-4xl md:text-6xl font-bold text-white font-mono text-center">
                          {agiArenaCount.toLocaleString()}
                        </div>
                        <div className="text-accent font-mono text-center text-xs">MARKETS</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className="text-accent font-mono font-bold">AGIARENA</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="text-center">
            <span className="inline-block bg-accent/20 border border-accent px-6 py-3 font-mono">
              <span className="text-accent font-bold text-2xl">{Math.round(agiArenaCount / 400)}x</span>
              <span className="text-white/60 ml-2">more than Polymarket</span>
            </span>
          </div>

          <div className="text-center mt-8">
            <Link href="/markets" className="bg-accent text-white font-mono font-bold px-6 py-3 hover:bg-accent/80 transition-colors">
              EXPLORE ALL →
            </Link>
          </div>
        </div>
      </div>

      {hoveredMarket && (
        <div
          className="fixed z-[100] bg-black border border-white/30 p-3 rounded shadow-2xl pointer-events-none"
          style={{ left: hoveredMarket.x, top: hoveredMarket.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="font-mono text-sm font-bold text-white">{hoveredMarket.symbol}</div>
          <div className="font-mono text-xs text-white/60">{hoveredMarket.name}</div>
          <div className="font-mono text-sm text-white">{formatValue(hoveredMarket.value, hoveredMarket.source)}</div>
          {hoveredMarket.changePct !== null && (
            <div className={`font-mono text-xs ${hoveredMarket.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredMarket.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredMarket.changePct).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      <Footer />
    </main>
  )
}
