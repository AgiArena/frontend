'use client'

import { useState, useEffect, useRef } from 'react'
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

interface Position {
  id: string
  symbol: string
  name: string
  source: string
  value: number
  changePct: number | null
  position: 'LONG' | 'SHORT'
  size: number
  pnl: number
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

const SOURCE_NAMES: Record<string, string> = {
  crypto: 'CoinGecko',
  stocks: 'Nasdaq',
  defi: 'DefiLlama',
  rates: 'Fed/Treasury',
  ecb: 'ECB Forex',
  bls: 'BLS Economic',
}

function formatPnl(pnl: number): string {
  const prefix = pnl >= 0 ? '+' : ''
  if (Math.abs(pnl) >= 1e6) return `${prefix}$${(pnl / 1e6).toFixed(1)}M`
  if (Math.abs(pnl) >= 1e3) return `${prefix}$${(pnl / 1e3).toFixed(1)}K`
  return `${prefix}$${pnl.toFixed(0)}`
}

/**
 * AI PORTFOLIO - Visualize an AI agent holding 10,000+ positions simultaneously
 * Shows the "impossible" scale that only AI can achieve
 */
export default function AiPortfolioPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Position[]>([])
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null)
  const [stats, setStats] = useState({
    totalPositions: 0,
    totalPnl: 0,
    winRate: 0,
    sources: {} as Record<string, number>
  })
  const mouseRef = useRef({ x: 0, y: 0 })
  const timeRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['ai-portfolio-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=2000`)
          if (!res.ok) return { prices: [], total: 0, source }
          const data = await res.json()
          return {
            prices: (data.prices as MarketPrice[]).map(p => ({ ...p, source })),
            total: data.pagination?.total || 0,
            source
          }
        })
      )
      return results
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  // Create positions from market data
  useEffect(() => {
    if (!allPrices || !canvasRef.current) return

    const canvas = canvasRef.current
    const width = canvas.width = window.innerWidth
    const height = canvas.height = window.innerHeight

    const positions: Position[] = []
    const sourceCounts: Record<string, number> = {}
    let totalPnl = 0
    let wins = 0

    allPrices.forEach(sourceData => {
      sourceCounts[sourceData.source] = sourceData.prices.length

      sourceData.prices.forEach((market, i) => {
        const changePct = market.changePct ? parseFloat(market.changePct) : (Math.random() - 0.5) * 10
        const position: 'LONG' | 'SHORT' = Math.random() > 0.5 ? 'LONG' : 'SHORT'
        const size = 100 + Math.random() * 900 // $100 - $1000 per position
        const pnl = position === 'LONG'
          ? size * (changePct / 100)
          : size * (-changePct / 100)

        totalPnl += pnl
        if (pnl > 0) wins++

        // Distribute across canvas
        const angle = Math.random() * Math.PI * 2
        const radius = 100 + Math.random() * Math.min(width, height) * 0.4

        positions.push({
          id: `${market.source}-${market.assetId}`,
          symbol: market.symbol || market.name.slice(0, 4),
          name: market.name,
          source: market.source,
          value: parseFloat(market.value),
          changePct,
          position,
          size,
          pnl,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius
        })
      })
    })

    positionsRef.current = positions
    setStats({
      totalPositions: positions.length,
      totalPnl,
      winRate: positions.length > 0 ? (wins / positions.length) * 100 : 0,
      sources: sourceCounts
    })
  }, [allPrices])

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      timeRef.current += 0.016
      const time = timeRef.current

      // Dark gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      )
      gradient.addColorStop(0, '#0f0f1a')
      gradient.addColorStop(1, '#000000')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw connection lines to center (AI brain)
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ctx.strokeStyle = 'rgba(100, 100, 150, 0.03)'
      ctx.lineWidth = 1
      positionsRef.current.forEach(pos => {
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      })

      // Draw positions
      let newHovered: Position | null = null

      positionsRef.current.forEach((pos, i) => {
        // Gentle floating motion
        const floatX = Math.sin(time * 0.5 + i * 0.1) * 2
        const floatY = Math.cos(time * 0.7 + i * 0.1) * 2
        const x = pos.x + floatX
        const y = pos.y + floatY

        // Check hover
        const dx = mouseRef.current.x - x
        const dy = mouseRef.current.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const isHovered = dist < 15

        if (isHovered) newHovered = pos

        // Color based on P&L
        const color = pos.pnl >= 0 ? '#22c55e' : '#ef4444'
        const size = isHovered ? 8 : 4

        // Glow
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
        glowGradient.addColorStop(0, `${color}60`)
        glowGradient.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(x, y, size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = isHovered ? '#ffffff' : color
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw AI "brain" at center
      const brainPulse = Math.sin(time * 2) * 0.2 + 1
      const brainGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 80 * brainPulse
      )
      brainGradient.addColorStop(0, 'rgba(196, 0, 0, 0.8)')
      brainGradient.addColorStop(0.5, 'rgba(196, 0, 0, 0.3)')
      brainGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = brainGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, 80 * brainPulse, 0, Math.PI * 2)
      ctx.fill()

      // AI core
      ctx.fillStyle = '#C40000'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('AI', centerX, centerY)

      setHoveredPosition(newHovered)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          ← Back
        </Link>
        <div className="text-right">
          <div className="text-accent font-mono font-bold text-xl">AI AGENT PORTFOLIO</div>
          <div className="text-white/40 font-mono text-xs">Live • {stats.totalPositions.toLocaleString()} positions</div>
        </div>
      </div>

      {/* Stats panel */}
      <div className="absolute top-24 left-6 z-20 bg-black/80 border border-white/20 p-4 min-w-[280px]">
        <div className="text-white/40 font-mono text-xs mb-3">PORTFOLIO OVERVIEW</div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-white/40 font-mono text-[10px]">POSITIONS</div>
            <div className="text-white font-mono font-bold text-2xl">
              {stats.totalPositions.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-white/40 font-mono text-[10px]">TOTAL P&L</div>
            <div className={`font-mono font-bold text-2xl ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPnl(stats.totalPnl)}
            </div>
          </div>
          <div>
            <div className="text-white/40 font-mono text-[10px]">WIN RATE</div>
            <div className="text-white font-mono font-bold text-2xl">
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-white/40 font-mono text-[10px]">SOURCES</div>
            <div className="text-white font-mono font-bold text-2xl">
              {Object.keys(stats.sources).length}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3">
          <div className="text-white/40 font-mono text-[10px] mb-2">COVERAGE BY SOURCE</div>
          {Object.entries(stats.sources).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2" style={{ backgroundColor: SOURCE_COLORS[source] }} />
                <span className="text-white/60 font-mono text-xs">{SOURCE_NAMES[source]}</span>
              </div>
              <span className="text-white font-mono text-xs">{count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center message */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center mt-40">
          <div className="text-white/10 font-mono text-sm tracking-widest">ONE AGENT</div>
          <div className="text-6xl md:text-8xl font-bold text-white/5 font-mono">
            {stats.totalPositions.toLocaleString()}
          </div>
          <div className="text-white/10 font-mono text-sm tracking-widest">SIMULTANEOUS POSITIONS</div>
        </div>
      </div>

      {/* Human comparison */}
      <div className="absolute bottom-24 left-6 z-20 bg-black/80 border border-white/10 p-4 max-w-xs">
        <div className="text-white/40 font-mono text-xs mb-2">MEANWHILE, A HUMAN TRADER...</div>
        <div className="flex items-center gap-4">
          <div className="text-4xl">🧑‍💼</div>
          <div>
            <div className="text-white font-mono">3-5 positions</div>
            <div className="text-white/40 font-mono text-xs">needs sleep, gets emotional</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="absolute bottom-6 right-6 z-20">
        <Link
          href="/markets"
          className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-6 py-3 transition-colors"
        >
          EXPLORE ALL MARKETS →
        </Link>
      </div>

      {/* Hover tooltip */}
      {hoveredPosition && (
        <div
          className="fixed z-50 bg-black/95 border p-4 rounded-lg shadow-2xl min-w-[200px]"
          style={{
            left: Math.min(mouseRef.current.x + 20, window.innerWidth - 230),
            top: mouseRef.current.y - 20,
            borderColor: hoveredPosition.pnl >= 0 ? '#22c55e' : '#ef4444'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2" style={{ backgroundColor: SOURCE_COLORS[hoveredPosition.source] }} />
            <span className="text-white/60 font-mono text-xs">{SOURCE_NAMES[hoveredPosition.source]}</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">{hoveredPosition.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-2">{hoveredPosition.name}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-white/40 font-mono text-[10px]">POSITION</div>
              <div className={`font-mono font-bold ${hoveredPosition.position === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredPosition.position}
              </div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-[10px]">SIZE</div>
              <div className="text-white font-mono">${hoveredPosition.size.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-[10px]">CHANGE</div>
              <div className={`font-mono ${hoveredPosition.changePct !== null && hoveredPosition.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredPosition.changePct !== null ? `${hoveredPosition.changePct >= 0 ? '+' : ''}${hoveredPosition.changePct.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-[10px]">P&L</div>
              <div className={`font-mono font-bold ${hoveredPosition.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPnl(hoveredPosition.pnl)}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
