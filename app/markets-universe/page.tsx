'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  marketCap?: string | null
}

interface Particle {
  id: string
  x: number
  y: number
  size: number
  symbol: string
  name: string
  value: number
  changePct: number | null
  source: string
  vx: number
  vy: number
}

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#F7931A',    // Bitcoin orange
  stocks: '#00D4AA',    // Green
  defi: '#627EEA',      // Ethereum blue
  rates: '#FFD700',     // Gold
  ecb: '#00BFFF',       // Light blue
  bls: '#FF69B4',       // Pink
}

const SOURCE_INFO = [
  { key: 'crypto', emoji: '₿', name: 'Crypto', count: '18,000+' },
  { key: 'stocks', emoji: '📈', name: 'Stocks', count: '8,000+' },
  { key: 'defi', emoji: '🔗', name: 'DeFi', count: '200+' },
  { key: 'rates', emoji: '🏛️', name: 'Rates', count: '50+' },
  { key: 'ecb', emoji: '💱', name: 'Forex', count: '150+' },
  { key: 'bls', emoji: '📊', name: 'Economic', count: '100+' },
]

function formatValue(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

function UniverseCanvas({ particles, hoveredId, setHoveredId }: {
  particles: Particle[]
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>(particles)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    particlesRef.current = particles
  }, [particles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }

      // Check hover
      const p = particlesRef.current.find(p => {
        const dx = p.x - mouseRef.current.x
        const dy = p.y - mouseRef.current.y
        return Math.sqrt(dx * dx + dy * dy) < p.size + 5
      })
      setHoveredId(p?.id || null)
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight

      ctx.clearRect(0, 0, width, height)

      // Draw particles
      particlesRef.current.forEach(p => {
        // Gentle drift
        p.x += p.vx
        p.y += p.vy

        // Bounce off edges
        if (p.x < p.size || p.x > width - p.size) p.vx *= -1
        if (p.y < p.size || p.y > height - p.size) p.vy *= -1

        // Keep in bounds
        p.x = Math.max(p.size, Math.min(width - p.size, p.x))
        p.y = Math.max(p.size, Math.min(height - p.size, p.y))

        const isHovered = p.id === hoveredId
        const color = SOURCE_COLORS[p.source] || '#ffffff'
        const alpha = isHovered ? 1 : 0.7

        // Glow effect
        ctx.beginPath()
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, `${color}${isHovered ? '60' : '30'}`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.fillStyle = color
        ctx.globalAlpha = alpha
        ctx.arc(p.x, p.y, isHovered ? p.size * 1.5 : p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        // Symbol label for larger particles
        if (p.size > 4 || isHovered) {
          ctx.font = `${isHovered ? 'bold 12px' : '10px'} monospace`
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText(p.symbol, p.x, p.y - p.size - 6)
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [hoveredId, setHoveredId])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
    />
  )
}

export default function MarketsUniversePage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch sample from each source
  const { data: allPrices } = useQuery({
    queryKey: ['universe-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=500`)
          if (!res.ok) return { prices: [], total: 0, source }
          const data = await res.json()
          return {
            prices: data.prices as MarketPrice[],
            total: data.pagination?.total || 0,
            source
          }
        })
      )
      return results
    },
    staleTime: 60 * 1000,
  })

  // Calculate total and create particles
  const particles = useMemo(() => {
    if (!allPrices) return []

    let total = 0
    const allParticles: Particle[] = []

    allPrices.forEach(({ prices, total: sourceTotal, source }) => {
      total += sourceTotal

      // Take up to 100 from each source for display
      const sample = prices.slice(0, 100)
      sample.forEach((p, i) => {
        const mc = p.marketCap ? parseFloat(p.marketCap) : parseFloat(p.value)
        const size = Math.max(3, Math.min(12, Math.log10(mc + 1) * 1.5))

        allParticles.push({
          id: `${source}-${p.assetId}`,
          x: Math.random() * 800 + 100,
          y: Math.random() * 400 + 50,
          size,
          symbol: p.symbol || p.name.slice(0, 4),
          name: p.name,
          value: parseFloat(p.value),
          changePct: p.changePct ? parseFloat(p.changePct) : null,
          source,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        })
      })
    })

    setTotalCount(total)
    return allParticles
  }, [allPrices])

  const hoveredParticle = particles.find(p => p.id === hoveredId)

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col">
        {/* Hero section */}
        <div className="text-center py-12 px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white font-mono mb-4">
            BET ON <span className="text-accent">ANYTHING</span>
          </h1>
          <p className="text-2xl md:text-4xl font-mono text-white/80 mb-2">
            <span className="text-accent font-bold">{totalCount.toLocaleString()}</span> markets. One platform.
          </p>
          <p className="text-white/40 font-mono text-sm">
            Each dot below is a tradeable market. Hover to explore.
          </p>
        </div>

        {/* Universe visualization */}
        <div className="flex-1 relative mx-4 mb-4 border border-white/20 bg-black/50 rounded-lg overflow-hidden min-h-[400px]">
          <UniverseCanvas
            particles={particles}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />

          {/* Hover tooltip */}
          {hoveredParticle && (
            <div className="absolute top-4 right-4 bg-black/90 border border-white/30 p-4 rounded-lg font-mono min-w-[200px]">
              <div className="text-lg font-bold text-white mb-1">
                {hoveredParticle.symbol}
              </div>
              <div className="text-white/60 text-sm mb-2">
                {hoveredParticle.name}
              </div>
              <div className="text-white text-lg">
                {formatValue(hoveredParticle.value)}
              </div>
              {hoveredParticle.changePct !== null && (
                <div className={`text-sm ${hoveredParticle.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {hoveredParticle.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredParticle.changePct).toFixed(2)}%
                </div>
              )}
              <div className="text-white/40 text-xs mt-2 pt-2 border-t border-white/20">
                Source: {hoveredParticle.source}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
            {SOURCE_INFO.map(s => (
              <div key={s.key} className="flex items-center gap-2 bg-black/70 px-3 py-1 rounded border border-white/10">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[s.key] }}
                />
                <span className="text-white/80 font-mono text-xs">
                  {s.emoji} {s.name}
                </span>
                <span className="text-white/40 font-mono text-xs">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category cards */}
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SOURCE_INFO.map(s => (
              <div
                key={s.key}
                className="border border-white/20 bg-white/5 p-4 text-center hover:border-white/40 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className="text-white font-mono font-bold">{s.name}</div>
                <div className="text-accent font-mono text-xl font-bold">{s.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Search CTA */}
        <div className="max-w-2xl mx-auto px-4 pb-12">
          <div className="border border-white/30 bg-white/5 p-1 flex items-center">
            <span className="text-white/40 px-4 font-mono">🔍</span>
            <input
              type="text"
              placeholder={`Search ${totalCount.toLocaleString()} markets...`}
              className="flex-1 bg-transparent text-white font-mono py-3 outline-none placeholder:text-white/40"
            />
            <Link
              href="/markets"
              className="bg-accent text-white font-mono font-bold px-6 py-3 hover:bg-accent/80 transition-colors"
            >
              EXPLORE
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
