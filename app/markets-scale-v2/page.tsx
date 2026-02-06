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
 * VERSION 2: Vertical stacked bars
 * Shows competitors as thin bars, AgiArena as massive block
 */
export default function MarketsScaleV2Page() {
  const [hoveredMarket, setHoveredMarket] = useState<HoveredMarket | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { data: allPrices, isLoading } = useQuery({
    queryKey: ['scale-v2-prices'],
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

  const agiArenaCount = totalCount || 50000
  const maxCount = agiArenaCount

  const platforms = [
    { name: 'Polymarket', count: 400, color: '#6366f1', desc: 'Prediction markets' },
    { name: 'Binance', count: 1500, color: '#f0b90b', desc: 'Crypto pairs' },
    { name: 'AGIARENA', count: agiArenaCount, color: '#C40000', desc: 'Everything', isMain: true },
  ]

  return (
    <main className="min-h-screen bg-primary flex flex-col">
      <Header />

      <div className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-semibold text-primary mb-2">
              TRADEABLE <span className="text-accent">MARKETS</span>
            </h1>
            <p className="text-muted font-mono text-sm">
              Bar height = number of markets
            </p>
          </div>

          {/* Horizontal bar chart */}
          <div className="space-y-6 mb-12">
            {platforms.map(platform => {
              const widthPercent = (platform.count / maxCount) * 100
              return (
                <div key={platform.name} className="flex items-center gap-4">
                  <div className="w-28 text-right">
                    <div className="font-mono text-sm" style={{ color: platform.color }}>
                      {platform.name}
                    </div>
                    <div className="font-mono text-xs text-muted">{platform.desc}</div>
                  </div>

                  <div className="flex-1 relative">
                    {platform.isMain ? (
                      // AgiArena - show actual market dots
                      <div
                        className="border-2 relative overflow-hidden"
                        style={{
                          borderColor: platform.color,
                          width: `${widthPercent}%`,
                          minWidth: '200px',
                          height: '120px'
                        }}
                      >
                        {isLoading ? (
                          <div className="w-full h-full flex items-center justify-center bg-accent/10">
                            <span className="text-muted font-mono animate-pulse">Loading...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-[1px] p-1 h-full overflow-hidden">
                              {allPrices?.map((market, i) => {
                                const changePct = market.changePct ? parseFloat(market.changePct) : null
                                const isUp = changePct !== null && changePct >= 0
                                return (
                                  <div
                                    key={`${market.source}-${market.assetId}-${i}`}
                                    className="w-[4px] h-[4px] cursor-pointer hover:scale-[4] hover:z-50 transition-transform"
                                    style={{
                                      backgroundColor: isUp ? 'var(--green)' : changePct !== null ? 'var(--red-loss)' : SOURCE_COLORS[market.source],
                                      opacity: 0.7
                                    }}
                                    onMouseEnter={(e) => handleHover(market, e)}
                                    onMouseLeave={() => setHoveredMarket(null)}
                                  />
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      // Competitors - simple bar
                      <div
                        className="h-8 flex items-center justify-end pr-2"
                        style={{
                          width: `${widthPercent}%`,
                          minWidth: '40px',
                          backgroundColor: platform.color,
                          opacity: 0.3
                        }}
                      />
                    )}
                  </div>

                  <div className="w-20 text-left">
                    <span
                      className="font-mono font-bold"
                      style={{ color: platform.color }}
                    >
                      {platform.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Multiplier */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 bg-primary border border-accent px-8 py-4">
              <span className="text-6xl font-bold text-accent font-mono">
                {Math.round(agiArenaCount / 400)}x
              </span>
              <div className="text-left">
                <div className="text-primary font-mono">more markets</div>
                <div className="text-muted font-mono text-sm">than Polymarket</div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/markets" className="bg-accent text-primary font-mono font-bold px-6 py-3 hover:bg-accent/80 transition-colors">
              EXPLORE ALL MARKETS →
            </Link>
          </div>
        </div>
      </div>

      {hoveredMarket && (
        <div
          className="fixed z-[100] bg-primary border border p-3 rounded shadow-2xl pointer-events-none"
          style={{ left: hoveredMarket.x, top: hoveredMarket.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="font-mono text-sm font-semibold text-primary">{hoveredMarket.symbol}</div>
          <div className="font-mono text-xs text-secondary">{hoveredMarket.name}</div>
          <div className="font-mono text-sm text-primary">{formatValue(hoveredMarket.value, hoveredMarket.source)}</div>
          {hoveredMarket.changePct !== null && (
            <div className={`font-mono text-xs ${hoveredMarket.changePct >= 0 ? 'text-green' : 'text-red-loss'}`}>
              {hoveredMarket.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredMarket.changePct).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      <Footer />
    </main>
  )
}
