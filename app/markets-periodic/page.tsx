'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface MarketPrice {
  source: string
  assetId: string
  symbol: string
  name: string
  value: string
  changePct: string | null
  marketCap?: string | null
  volume24h?: string | null
}

interface Element {
  number: number
  symbol: string
  name: string
  value: number
  changePct: number | null
  marketCap: number
  volume: number
  source: string
  group: number // column
  period: number // row
  category: string
}

const SOURCE_CONFIG: Record<string, { name: string; color: string; bgColor: string }> = {
  crypto: { name: 'Crypto', color: '#F7931A', bgColor: 'rgba(247, 147, 26, 0.15)' },
  stocks: { name: 'Stocks', color: '#00D4AA', bgColor: 'rgba(0, 212, 170, 0.15)' },
  defi: { name: 'DeFi', color: '#627EEA', bgColor: 'rgba(98, 126, 234, 0.15)' },
  rates: { name: 'Rates', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' },
  ecb: { name: 'Forex', color: '#00BFFF', bgColor: 'rgba(0, 191, 255, 0.15)' },
  bls: { name: 'Economic', color: '#FF69B4', bgColor: 'rgba(255, 105, 180, 0.15)' },
}

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

function formatMcap(mc: number): string {
  if (mc >= 1e12) return `${(mc / 1e12).toFixed(1)}T`
  if (mc >= 1e9) return `${(mc / 1e9).toFixed(1)}B`
  if (mc >= 1e6) return `${(mc / 1e6).toFixed(0)}M`
  if (mc >= 1e3) return `${(mc / 1e3).toFixed(0)}K`
  return mc.toFixed(0)
}

function ElementCard({
  element,
  isSelected,
  onSelect,
  onHover
}: {
  element: Element
  isSelected: boolean
  onSelect: () => void
  onHover: (el: Element | null) => void
}) {
  const config = SOURCE_CONFIG[element.source]
  const isUp = element.changePct !== null && element.changePct >= 0

  return (
    <div
      className={`
        relative p-1 cursor-pointer transition-all duration-200
        border-2 hover:scale-110 hover:z-50
        ${isSelected ? 'scale-110 z-50 shadow-2xl' : ''}
      `}
      style={{
        backgroundColor: isSelected ? config.color : config.bgColor,
        borderColor: isSelected ? '#ffffff' : config.color,
        gridColumn: element.group,
        gridRow: element.period,
        minWidth: '70px',
        minHeight: '70px'
      }}
      onClick={onSelect}
      onMouseEnter={() => onHover(element)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Atomic number */}
      <div
        className="absolute top-1 left-1 text-[9px] font-mono"
        style={{ color: isSelected ? '#000' : config.color }}
      >
        {element.number}
      </div>

      {/* Change indicator */}
      <div
        className={`absolute top-1 right-1 text-[9px] font-mono font-bold ${
          isUp ? 'text-green-400' : element.changePct !== null ? 'text-red-400' : 'text-white/30'
        }`}
      >
        {element.changePct !== null ? `${isUp ? '+' : ''}${element.changePct.toFixed(1)}%` : '—'}
      </div>

      {/* Symbol */}
      <div
        className="text-center mt-3 font-mono font-bold text-lg"
        style={{ color: isSelected ? '#000' : '#fff' }}
      >
        {element.symbol.slice(0, 4)}
      </div>

      {/* Name (truncated) */}
      <div
        className="text-center font-mono text-[8px] truncate px-1"
        style={{ color: isSelected ? '#000' : 'rgba(255,255,255,0.6)' }}
      >
        {element.name.slice(0, 10)}
      </div>

      {/* Market cap */}
      <div
        className="text-center font-mono text-[9px] mt-0.5"
        style={{ color: isSelected ? '#000' : 'rgba(255,255,255,0.4)' }}
      >
        {formatMcap(element.marketCap)}
      </div>
    </div>
  )
}

/**
 * THE PERIODIC TABLE - Markets organized like chemical elements
 * Each element is a market with atomic-number-style metadata
 * Organized by category (like element groups) and ranked by market cap
 */
export default function MarketsPeriodicPage() {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null)
  const [filterSource, setFilterSource] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { data: allPrices, isLoading } = useQuery({
    queryKey: ['periodic-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=200`)
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
      return results
    },
    staleTime: 60 * 1000,
  })

  // Convert to periodic table elements
  const elements = useMemo(() => {
    if (!allPrices) return []

    const result: Element[] = []
    let globalNumber = 1

    // Define grid layout: 18 columns (like real periodic table)
    const columns = 18
    const sourceGroups: Record<string, number[]> = {
      crypto: [1, 2, 3], // columns 1-3
      stocks: [4, 5, 6, 7], // columns 4-7
      defi: [8, 9, 10], // columns 8-10
      rates: [11, 12, 13], // columns 11-13
      ecb: [14, 15, 16], // columns 14-16
      bls: [17, 18], // columns 17-18
    }

    allPrices.forEach(sourceData => {
      const groups = sourceGroups[sourceData.source]
      if (!groups) return

      // Sort by market cap
      const sorted = [...sourceData.prices].sort((a, b) => {
        const mcA = a.marketCap ? parseFloat(a.marketCap) : parseFloat(a.value)
        const mcB = b.marketCap ? parseFloat(b.marketCap) : parseFloat(b.value)
        return mcB - mcA
      })

      sorted.slice(0, 42).forEach((market, i) => {
        const groupIndex = i % groups.length
        const period = Math.floor(i / groups.length) + 1

        if (period > 7) return // Max 7 periods

        result.push({
          number: globalNumber++,
          symbol: market.symbol || market.name.slice(0, 4),
          name: market.name,
          value: parseFloat(market.value),
          changePct: market.changePct ? parseFloat(market.changePct) : null,
          marketCap: market.marketCap ? parseFloat(market.marketCap) : parseFloat(market.value) * 1000000,
          volume: market.volume24h ? parseFloat(market.volume24h) : 0,
          source: market.source,
          group: groups[groupIndex],
          period,
          category: SOURCE_CONFIG[market.source].name
        })
      })
    })

    return result
  }, [allPrices])

  const filteredElements = filterSource
    ? elements.filter(e => e.source === filterSource)
    : elements

  const displayElement = hoveredElement || selectedElement

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
            ← Back
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold font-mono text-accent">PERIODIC TABLE OF MARKETS</h1>
            <p className="text-white/40 font-mono text-xs">{totalCount.toLocaleString()} elements discovered</p>
          </div>
          <Link
            href="/markets"
            className="bg-accent hover:bg-accent/80 text-white font-mono text-sm px-4 py-2 transition-colors"
          >
            FULL LIST →
          </Link>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Category legend / filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => setFilterSource(null)}
            className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
              filterSource === null
                ? 'bg-white text-black border-white'
                : 'border-white/30 text-white/60 hover:text-white'
            }`}
          >
            ALL ({elements.length})
          </button>
          {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
            const count = elements.filter(e => e.source === key).length
            return (
              <button
                key={key}
                onClick={() => setFilterSource(filterSource === key ? null : key)}
                className={`px-3 py-1.5 font-mono text-xs border transition-colors ${
                  filterSource === key
                    ? 'text-black'
                    : 'text-white/60 hover:text-white'
                }`}
                style={{
                  backgroundColor: filterSource === key ? config.color : 'transparent',
                  borderColor: config.color
                }}
              >
                {config.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Selected element detail */}
        {displayElement && (
          <div
            className="mb-6 p-6 border-2 rounded-lg max-w-2xl mx-auto"
            style={{
              borderColor: SOURCE_CONFIG[displayElement.source].color,
              backgroundColor: SOURCE_CONFIG[displayElement.source].bgColor
            }}
          >
            <div className="flex items-start gap-6">
              {/* Big symbol */}
              <div className="text-center">
                <div className="text-6xl font-bold font-mono" style={{ color: SOURCE_CONFIG[displayElement.source].color }}>
                  {displayElement.symbol.slice(0, 4)}
                </div>
                <div className="text-white/40 font-mono text-xs">#{displayElement.number}</div>
              </div>

              {/* Details */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/40 font-mono text-xs">NAME</div>
                  <div className="text-white font-mono font-bold">{displayElement.name}</div>
                </div>
                <div>
                  <div className="text-white/40 font-mono text-xs">CATEGORY</div>
                  <div className="font-mono font-bold" style={{ color: SOURCE_CONFIG[displayElement.source].color }}>
                    {displayElement.category}
                  </div>
                </div>
                <div>
                  <div className="text-white/40 font-mono text-xs">PRICE</div>
                  <div className="text-white font-mono font-bold text-xl">
                    {formatValue(displayElement.value, displayElement.source)}
                  </div>
                </div>
                <div>
                  <div className="text-white/40 font-mono text-xs">24H CHANGE</div>
                  <div className={`font-mono font-bold text-xl ${
                    displayElement.changePct !== null && displayElement.changePct >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {displayElement.changePct !== null
                      ? `${displayElement.changePct >= 0 ? '+' : ''}${displayElement.changePct.toFixed(2)}%`
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-white/40 font-mono text-xs">MARKET CAP</div>
                  <div className="text-white font-mono">${formatMcap(displayElement.marketCap)}</div>
                </div>
                <div>
                  <div className="text-white/40 font-mono text-xs">VOLUME 24H</div>
                  <div className="text-white font-mono">${formatMcap(displayElement.volume)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Periodic table grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="text-white/40 font-mono animate-pulse">Discovering elements...</div>
          </div>
        ) : (
          <div
            className="grid gap-1 justify-center"
            style={{
              gridTemplateColumns: 'repeat(18, minmax(70px, 80px))',
              gridTemplateRows: 'repeat(7, minmax(70px, 80px))'
            }}
          >
            {filteredElements.map(element => (
              <ElementCard
                key={element.number}
                element={element}
                isSelected={selectedElement?.number === element.number}
                onSelect={() => setSelectedElement(
                  selectedElement?.number === element.number ? null : element
                )}
                onHover={setHoveredElement}
              />
            ))}
          </div>
        )}

        {/* Column labels */}
        <div className="mt-8 flex justify-center gap-4 text-center">
          {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-4 h-4" style={{ backgroundColor: config.bgColor, border: `1px solid ${config.color}` }} />
              <span className="text-white/60 font-mono text-xs">{config.name}</span>
            </div>
          ))}
        </div>

        {/* Fun facts */}
        <div className="mt-12 text-center border-t border-white/10 pt-8">
          <div className="text-white/20 font-mono text-xs mb-2">DID YOU KNOW?</div>
          <div className="text-white/40 font-mono text-sm max-w-xl mx-auto">
            Unlike the actual periodic table with 118 elements, the AgiArena periodic table contains
            <span className="text-accent font-bold"> {totalCount.toLocaleString()} </span>
            tradeable market elements — and we're discovering more every day.
          </div>
        </div>
      </div>
    </main>
  )
}
