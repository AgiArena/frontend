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
 * VERSION 3: Nested squares - competitors shown INSIDE AgiArena
 * Visual: tiny competitor boxes in the corner of massive AgiArena grid
 */
export default function MarketsScaleV3Page() {
  const [hoveredMarket, setHoveredMarket] = useState<HoveredMarket | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { data: allPrices, isLoading } = useQuery({
    queryKey: ['scale-v3-prices'],
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
      return results.flatMap(r => r.prices.slice(0, 2000))
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

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <Header />

      <div className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-mono mb-2">
              THE <span className="text-accent">SCALE</span> DIFFERENCE
            </h1>
            <p className="text-white/40 font-mono text-sm">
              The tiny boxes show what competitors offer. The rest is AgiArena.
            </p>
          </div>

          {/* Main visualization - AgiArena with nested competitors */}
          <div className="flex justify-center mb-8">
            <div
              className="border-2 border-accent bg-black relative"
              style={{
                width: 'min(700px, 90vw)',
                height: 'min(500px, 60vh)'
              }}
            >
              {/* Market dots background */}
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/40 font-mono animate-pulse">Loading markets...</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-wrap gap-[1px] p-2 overflow-hidden">
                  {allPrices?.map((market, i) => {
                    const changePct = market.changePct ? parseFloat(market.changePct) : null
                    const isUp = changePct !== null && changePct >= 0
                    return (
                      <div
                        key={`${market.source}-${market.assetId}-${i}`}
                        className="w-[5px] h-[5px] cursor-pointer hover:scale-[4] hover:z-50 transition-transform"
                        style={{
                          backgroundColor: isUp ? '#22c55e' : changePct !== null ? '#ef4444' : SOURCE_COLORS[market.source],
                          opacity: 0.6
                        }}
                        onMouseEnter={(e) => handleHover(market, e)}
                        onMouseLeave={() => setHoveredMarket(null)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Competitor boxes - nested in top-left corner */}
              <div className="absolute top-4 left-4 flex items-end gap-2 z-20">
                {/* Polymarket */}
                <div className="flex flex-col items-center">
                  <div
                    className="bg-[#6366f1] border-2 border-white flex items-center justify-center"
                    style={{ width: '24px', height: '24px' }}
                  >
                    <span className="text-white font-mono text-[6px] font-bold">400</span>
                  </div>
                  <span className="text-[8px] font-mono text-white/60 mt-1">Polymarket</span>
                </div>

                {/* Binance */}
                <div className="flex flex-col items-center">
                  <div
                    className="bg-[#f0b90b] border-2 border-white flex items-center justify-center"
                    style={{ width: '45px', height: '45px' }}
                  >
                    <span className="text-black font-mono text-[8px] font-bold">1,500</span>
                  </div>
                  <span className="text-[8px] font-mono text-white/60 mt-1">Binance</span>
                </div>
              </div>

              {/* AgiArena label - center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-black/95 border-2 border-accent px-8 py-6 text-center">
                  <div className="text-accent font-mono text-sm mb-1">AGIARENA</div>
                  <div className="text-5xl md:text-7xl font-bold text-white font-mono">
                    {agiArenaCount.toLocaleString()}
                  </div>
                  <div className="text-white/60 font-mono text-sm mt-1">tradeable markets</div>
                </div>
              </div>

              {/* "This is what they have" annotation */}
              <div className="absolute top-20 left-4 z-20">
                <svg width="100" height="40" className="text-white/40">
                  <path d="M 70 5 Q 40 5 20 35" stroke="currentColor" fill="none" strokeWidth="1" strokeDasharray="3,3" />
                  <polygon points="18,30 22,38 14,36" fill="currentColor" />
                </svg>
                <span className="absolute top-0 left-16 text-[10px] font-mono text-white/40 whitespace-nowrap">
                  This is what<br />they offer
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent font-mono">
                {Math.round(agiArenaCount / 400)}x
              </div>
              <div className="text-white/40 font-mono text-sm">vs Polymarket</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent font-mono">
                {Math.round(agiArenaCount / 1500)}x
              </div>
              <div className="text-white/40 font-mono text-sm">vs Binance</div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { emoji: '₿', name: 'Crypto', count: '18K', color: SOURCE_COLORS.crypto },
              { emoji: '📈', name: 'Stocks', count: '8K', color: SOURCE_COLORS.stocks },
              { emoji: '🔗', name: 'DeFi', count: '200', color: SOURCE_COLORS.defi },
              { emoji: '🏛️', name: 'Rates', count: '50', color: SOURCE_COLORS.rates },
              { emoji: '💱', name: 'Forex', count: '150', color: SOURCE_COLORS.ecb },
              { emoji: '📊', name: 'Economic', count: '100', color: SOURCE_COLORS.bls },
            ].map(cat => (
              <div
                key={cat.name}
                className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2"
              >
                <span>{cat.emoji}</span>
                <span className="font-mono text-sm text-white">{cat.name}</span>
                <span className="font-mono text-sm font-bold" style={{ color: cat.color }}>{cat.count}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/markets" className="bg-accent text-white font-mono font-bold px-8 py-4 hover:bg-accent/80 transition-colors">
              EXPLORE ALL {agiArenaCount.toLocaleString()} MARKETS →
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
