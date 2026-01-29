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
  marketCap?: string | null
}

interface Star {
  id: string
  symbol: string
  name: string
  value: number
  changePct: number | null
  source: string
  x: number
  y: number
  size: number
  brightness: number
  twinkleSpeed: number
  twinklePhase: number
}

interface Constellation {
  name: string
  emoji: string
  color: string
  stars: Star[]
  centerX: number
  centerY: number
}

const SOURCE_CONFIG: Record<string, { name: string; emoji: string; color: string }> = {
  crypto: { name: 'Crypto', emoji: '₿', color: '#F7931A' },
  stocks: { name: 'Stocks', emoji: '📈', color: '#00D4AA' },
  defi: { name: 'DeFi', emoji: '🔗', color: '#627EEA' },
  rates: { name: 'Rates', emoji: '🏛️', color: '#FFD700' },
  ecb: { name: 'Forex', emoji: '💱', color: '#00BFFF' },
  bls: { name: 'Economic', emoji: '📊', color: '#FF69B4' },
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
 * THE CONSTELLATION - Markets as stars in the night sky
 * Each category forms a constellation, hover to see connections
 */
export default function MarketsConstellationPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [constellations, setConstellations] = useState<Constellation[]>([])
  const [hoveredStar, setHoveredStar] = useState<Star | null>(null)
  const [activeConstellation, setActiveConstellation] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const timeRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['constellation-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=500`)
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

  // Create constellations from data
  useEffect(() => {
    if (!allPrices || !canvasRef.current) return

    const canvas = canvasRef.current
    const width = canvas.width = window.innerWidth
    const height = canvas.height = window.innerHeight

    // Position constellations in a circle
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.35

    const newConstellations: Constellation[] = allPrices.map((sourceData, i) => {
      const angle = (i / allPrices.length) * Math.PI * 2 - Math.PI / 2
      const cx = centerX + Math.cos(angle) * radius
      const cy = centerY + Math.sin(angle) * radius
      const config = SOURCE_CONFIG[sourceData.source]

      // Create stars from markets
      const stars: Star[] = sourceData.prices.slice(0, 80).map((market, j) => {
        const starAngle = (j / 80) * Math.PI * 2 + Math.random() * 0.5
        const starRadius = 30 + Math.random() * 120
        const mc = market.marketCap ? parseFloat(market.marketCap) : parseFloat(market.value)
        const size = Math.max(1, Math.min(6, Math.log10(mc + 1) * 0.8))

        return {
          id: `${sourceData.source}-${market.assetId}`,
          symbol: market.symbol || market.name.slice(0, 4),
          name: market.name,
          value: parseFloat(market.value),
          changePct: market.changePct ? parseFloat(market.changePct) : null,
          source: sourceData.source,
          x: cx + Math.cos(starAngle) * starRadius,
          y: cy + Math.sin(starAngle) * starRadius,
          size,
          brightness: 0.4 + Math.random() * 0.6,
          twinkleSpeed: 0.5 + Math.random() * 2,
          twinklePhase: Math.random() * Math.PI * 2
        }
      })

      return {
        name: config.name,
        emoji: config.emoji,
        color: config.color,
        stars,
        centerX: cx,
        centerY: cy
      }
    })

    setConstellations(newConstellations)
  }, [allPrices])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      timeRef.current += 0.016
      const time = timeRef.current

      // Clear with slight trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw background stars (distant)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * canvas.width
        const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * canvas.height
        const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5
        ctx.globalAlpha = twinkle * 0.3
        ctx.beginPath()
        ctx.arc(x, y, 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      let newHovered: Star | null = null

      constellations.forEach(constellation => {
        const isActive = activeConstellation === constellation.name || activeConstellation === null

        // Draw constellation lines (connect nearest neighbors)
        if (isActive && constellation.stars.length > 1) {
          ctx.strokeStyle = constellation.color
          ctx.lineWidth = 0.5
          ctx.globalAlpha = activeConstellation === constellation.name ? 0.4 : 0.1

          // Simple nearest-neighbor connections
          constellation.stars.slice(0, 20).forEach((star, i) => {
            const nextStar = constellation.stars[(i + 1) % Math.min(20, constellation.stars.length)]
            ctx.beginPath()
            ctx.moveTo(star.x, star.y)
            ctx.lineTo(nextStar.x, nextStar.y)
            ctx.stroke()
          })
        }
        ctx.globalAlpha = 1

        // Draw stars
        constellation.stars.forEach(star => {
          const dx = mouseRef.current.x - star.x
          const dy = mouseRef.current.y - star.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const isHovered = dist < 15

          if (isHovered) newHovered = star

          // Twinkle effect
          const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7
          const brightness = star.brightness * twinkle

          // Star glow
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4)
          gradient.addColorStop(0, isHovered ? '#ffffff' : constellation.color)
          gradient.addColorStop(0.5, `${constellation.color}40`)
          gradient.addColorStop(1, 'transparent')

          ctx.globalAlpha = isActive ? brightness : 0.1
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2)
          ctx.fill()

          // Star core
          ctx.fillStyle = isHovered ? '#ffffff' : constellation.color
          ctx.globalAlpha = isActive ? 1 : 0.2
          ctx.beginPath()
          ctx.arc(star.x, star.y, isHovered ? star.size * 2 : star.size, 0, Math.PI * 2)
          ctx.fill()

          // Label for larger/hovered stars
          if ((star.size > 3 || isHovered) && isActive) {
            ctx.font = `${isHovered ? 'bold 12px' : '9px'} monospace`
            ctx.fillStyle = isHovered ? '#ffffff' : constellation.color
            ctx.globalAlpha = isHovered ? 1 : 0.6
            ctx.textAlign = 'center'
            ctx.fillText(star.symbol, star.x, star.y - star.size * 3 - 5)
          }
        })

        // Constellation label
        ctx.font = 'bold 14px monospace'
        ctx.fillStyle = constellation.color
        ctx.globalAlpha = isActive ? 1 : 0.3
        ctx.textAlign = 'center'
        ctx.fillText(
          `${constellation.emoji} ${constellation.name.toUpperCase()}`,
          constellation.centerX,
          constellation.centerY
        )
        ctx.font = '11px monospace'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText(
          `${constellation.stars.length}+ markets`,
          constellation.centerX,
          constellation.centerY + 18
        )

        ctx.globalAlpha = 1
      })

      setHoveredStar(newHovered)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [constellations, activeConstellation])

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          ← Back
        </Link>
        <div className="text-right">
          <div className="text-accent font-mono font-bold text-xl">AGIARENA</div>
          <div className="text-white/40 font-mono text-xs">THE CONSTELLATION</div>
        </div>
      </div>

      {/* Center stats */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center bg-black/60 px-8 py-6 rounded-full border border-white/10">
          <div className="text-6xl md:text-8xl font-bold text-white font-mono">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-accent font-mono text-sm">MARKETS IN THE UNIVERSE</div>
        </div>
      </div>

      {/* Constellation selector */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <button
          onClick={() => setActiveConstellation(null)}
          className={`px-3 py-2 font-mono text-xs transition-colors ${
            activeConstellation === null
              ? 'bg-white text-black'
              : 'bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          ALL
        </button>
        {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveConstellation(activeConstellation === config.name ? null : config.name)}
            className={`px-3 py-2 font-mono text-xs transition-colors ${
              activeConstellation === config.name
                ? 'text-black'
                : 'bg-white/10 text-white/60 hover:text-white'
            }`}
            style={{
              backgroundColor: activeConstellation === config.name ? config.color : undefined
            }}
          >
            {config.emoji} {config.name}
          </button>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredStar && (
        <div
          className="fixed z-50 bg-black/95 border p-4 rounded-lg shadow-2xl min-w-[180px]"
          style={{
            left: mouseRef.current.x + 20,
            top: mouseRef.current.y - 20,
            borderColor: SOURCE_CONFIG[hoveredStar.source]?.color || '#fff'
          }}
        >
          <div className="text-lg font-bold text-white font-mono">{hoveredStar.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-2">{hoveredStar.name}</div>
          <div className="text-xl font-bold text-white font-mono">
            {formatValue(hoveredStar.value, hoveredStar.source)}
          </div>
          {hoveredStar.changePct !== null && (
            <div className={`font-mono text-sm ${hoveredStar.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredStar.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredStar.changePct).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="absolute bottom-6 right-6 z-20">
        <Link
          href="/markets"
          className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-6 py-3 transition-colors"
        >
          EXPLORE ALL →
        </Link>
      </div>
    </main>
  )
}
