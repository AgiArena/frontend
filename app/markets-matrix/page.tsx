'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
}

interface FallingTicker {
  id: number
  symbol: string
  name: string
  value: number
  changePct: number | null
  source: string
  x: number
  y: number
  speed: number
  opacity: number
  size: number
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
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

/**
 * THE MATRIX - Falling ticker symbols like Matrix rain
 * Premium effect that shows the depth of available markets
 */
export default function MarketsMatrixPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickersRef = useRef<FallingTicker[]>([])
  const [hoveredTicker, setHoveredTicker] = useState<FallingTicker | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const marketsRef = useRef<MarketPrice[]>([])

  const { data: allPrices } = useQuery({
    queryKey: ['matrix-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=2000`)
          if (!res.ok) return { prices: [], total: 0 }
          const data = await res.json()
          return {
            prices: (data.prices as MarketPrice[]).map(p => ({ ...p, source })),
            total: data.pagination?.total || 0
          }
        })
      )
      const total = results.reduce((acc, r) => acc + r.total, 0)
      setTotalCount(total)
      return results.flatMap(r => r.prices)
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (allPrices) {
      marketsRef.current = allPrices
    }
  }, [allPrices])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let tickerId = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const createTicker = (): FallingTicker | null => {
      const markets = marketsRef.current
      if (markets.length === 0) return null

      const market = markets[Math.floor(Math.random() * markets.length)]
      return {
        id: tickerId++,
        symbol: market.symbol || market.name.slice(0, 6),
        name: market.name,
        value: parseFloat(market.value),
        changePct: market.changePct ? parseFloat(market.changePct) : null,
        source: market.source,
        x: Math.random() * canvas.width,
        y: -50,
        speed: 1 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.7,
        size: 10 + Math.random() * 6
      }
    }

    // Initial tickers
    for (let i = 0; i < 100; i++) {
      const ticker = createTicker()
      if (ticker) {
        ticker.y = Math.random() * canvas.height
        tickersRef.current.push(ticker)
      }
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Spawn new tickers
      if (Math.random() < 0.3 && tickersRef.current.length < 200) {
        const ticker = createTicker()
        if (ticker) tickersRef.current.push(ticker)
      }

      let newHovered: FallingTicker | null = null

      tickersRef.current.forEach((ticker, index) => {
        if (!isPaused) {
          ticker.y += ticker.speed
        }

        // Check hover
        const dx = mouseRef.current.x - ticker.x
        const dy = mouseRef.current.y - ticker.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const isHovered = dist < 40

        if (isHovered) {
          newHovered = ticker
        }

        // Color based on change
        const isUp = ticker.changePct !== null && ticker.changePct >= 0
        const baseColor = isHovered
          ? '#ffffff'
          : isUp
            ? '#22c55e'
            : ticker.changePct !== null
              ? '#ef4444'
              : SOURCE_COLORS[ticker.source] || '#00ff00'

        // Glow effect for hovered
        if (isHovered) {
          ctx.shadowColor = '#C40000'
          ctx.shadowBlur = 20
        } else {
          ctx.shadowBlur = 0
        }

        // Draw ticker symbol
        ctx.font = `${isHovered ? 'bold ' : ''}${ticker.size}px monospace`
        ctx.fillStyle = baseColor
        ctx.globalAlpha = isHovered ? 1 : ticker.opacity
        ctx.fillText(ticker.symbol, ticker.x, ticker.y)

        // Draw trail
        if (!isHovered) {
          for (let i = 1; i <= 5; i++) {
            ctx.globalAlpha = ticker.opacity * (1 - i * 0.2)
            ctx.fillText(ticker.symbol, ticker.x, ticker.y - i * ticker.size * 1.2)
          }
        }

        ctx.globalAlpha = 1
        ctx.shadowBlur = 0

        // Remove if off screen
        if (ticker.y > canvas.height + 100) {
          tickersRef.current.splice(index, 1)
        }
      })

      setHoveredTicker(newHovered)

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [isPaused])

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          ← Back
        </Link>
        <div className="text-right">
          <div className="text-accent font-mono font-bold text-xl">AGIARENA</div>
          <div className="text-white/40 font-mono text-xs">THE MATRIX</div>
        </div>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center">
          <div className="text-8xl md:text-[12rem] font-bold text-white font-mono opacity-90 tracking-tighter">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-2xl md:text-4xl text-accent font-mono font-bold -mt-4">
            TRADEABLE MARKETS
          </div>
          <div className="text-white/40 font-mono text-sm mt-4">
            hover any symbol for details
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTicker && (
        <div
          className="fixed z-50 bg-black/95 border border-accent p-4 rounded-lg shadow-2xl min-w-[200px]"
          style={{
            left: mouseRef.current.x + 20,
            top: mouseRef.current.y - 20,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[hoveredTicker.source] }}
            />
            <span className="text-white/60 font-mono text-xs uppercase">{hoveredTicker.source}</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{hoveredTicker.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-2">{hoveredTicker.name}</div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatValue(hoveredTicker.value, hoveredTicker.source)}
          </div>
          {hoveredTicker.changePct !== null && (
            <div className={`font-mono ${hoveredTicker.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredTicker.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredTicker.changePct).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-20">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="bg-white/10 hover:bg-white/20 text-white font-mono px-4 py-2 transition-colors"
        >
          {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
        <Link
          href="/markets"
          className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-6 py-2 transition-colors"
        >
          EXPLORE ALL →
        </Link>
      </div>

      {/* Category legend */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-1 z-20">
        {Object.entries(SOURCE_COLORS).map(([source, color]) => (
          <div key={source} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-white/40 font-mono text-xs uppercase">{source}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
