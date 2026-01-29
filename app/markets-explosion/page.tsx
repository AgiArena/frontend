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

interface Particle {
  id: string
  symbol: string
  name: string
  value: number
  changePct: number | null
  source: string
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  size: number
  phase: 'exploding' | 'settling' | 'settled'
}

const SOURCE_CONFIG: Record<string, { color: string; angle: number }> = {
  crypto: { color: '#F7931A', angle: -90 },
  stocks: { color: '#00D4AA', angle: -30 },
  defi: { color: '#627EEA', angle: 30 },
  rates: { color: '#FFD700', angle: 90 },
  ecb: { color: '#00BFFF', angle: 150 },
  bls: { color: '#FF69B4', angle: 210 },
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
 * THE EXPLOSION - Big bang that settles into organized view
 * Markets explode from center, then organize by category
 */
export default function MarketsExplosionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const [phase, setPhase] = useState<'loading' | 'countdown' | 'exploding' | 'settling' | 'settled'>('loading')
  const [countdown, setCountdown] = useState(3)
  const [hoveredParticle, setHoveredParticle] = useState<Particle | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const explosionTimeRef = useRef(0)

  const { data: allPrices, isLoading } = useQuery({
    queryKey: ['explosion-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=800`)
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
      return results.flatMap(r => r.prices.slice(0, 150))
    },
    staleTime: 60 * 1000,
  })

  // Countdown and trigger explosion
  useEffect(() => {
    if (isLoading || !allPrices) return

    setPhase('countdown')
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setPhase('exploding')
          return 0
        }
        return prev - 1
      })
    }, 800)

    return () => clearInterval(countdownInterval)
  }, [isLoading, allPrices])

  // Initialize particles when explosion starts
  useEffect(() => {
    if (phase !== 'exploding' || !allPrices || !canvasRef.current) return

    const canvas = canvasRef.current
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Create particles at center
    particlesRef.current = allPrices.map((market, i) => {
      const config = SOURCE_CONFIG[market.source]
      const baseAngle = (config.angle * Math.PI) / 180
      const spread = Math.PI / 3 // 60 degree spread per category
      const angle = baseAngle + (Math.random() - 0.5) * spread
      const distance = 150 + Math.random() * 300
      const speed = 5 + Math.random() * 15

      const targetX = centerX + Math.cos(angle) * distance
      const targetY = centerY + Math.sin(angle) * distance

      return {
        id: `${market.source}-${market.assetId}`,
        symbol: market.symbol || market.name.slice(0, 4),
        name: market.name,
        value: parseFloat(market.value),
        changePct: market.changePct ? parseFloat(market.changePct) : null,
        source: market.source,
        x: centerX,
        y: centerY,
        targetX,
        targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        phase: 'exploding' as const
      }
    })

    explosionTimeRef.current = Date.now()

    // Transition to settling after 2 seconds
    setTimeout(() => setPhase('settling'), 2000)
  }, [phase, allPrices])

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

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

    const animate = () => {
      // Clear with trail effect during explosion
      if (phase === 'exploding') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      let newHovered: Particle | null = null
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Draw explosion shockwave
      if (phase === 'exploding') {
        const elapsed = Date.now() - explosionTimeRef.current
        const waveRadius = elapsed * 0.5
        const waveOpacity = Math.max(0, 1 - elapsed / 2000)

        ctx.strokeStyle = `rgba(196, 0, 0, ${waveOpacity})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2)
        ctx.stroke()

        // Inner glow
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, waveRadius)
        gradient.addColorStop(0, `rgba(196, 0, 0, ${waveOpacity * 0.3})`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        const config = SOURCE_CONFIG[particle.source]

        if (phase === 'exploding') {
          // Explode outward
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.98
          particle.vy *= 0.98
        } else if (phase === 'settling' || phase === 'settled') {
          // Ease toward target
          const dx = particle.targetX - particle.x
          const dy = particle.targetY - particle.y
          particle.x += dx * 0.08
          particle.y += dy * 0.08

          // Small floating motion when settled
          if (phase === 'settled') {
            particle.x += Math.sin(Date.now() * 0.001 + particle.targetX) * 0.3
            particle.y += Math.cos(Date.now() * 0.001 + particle.targetY) * 0.3
          }
        }

        // Check hover
        const mx = mouseRef.current.x - particle.x
        const my = mouseRef.current.y - particle.y
        const dist = Math.sqrt(mx * mx + my * my)
        const isHovered = dist < 20

        if (isHovered) newHovered = particle

        // Draw particle glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        )
        gradient.addColorStop(0, isHovered ? '#ffffff' : config.color)
        gradient.addColorStop(0.5, `${config.color}40`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Draw particle core
        ctx.fillStyle = isHovered ? '#ffffff' : config.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, isHovered ? particle.size * 1.5 : particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Draw symbol on hover
        if (isHovered) {
          ctx.font = 'bold 11px monospace'
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText(particle.symbol, particle.x, particle.y - particle.size * 2 - 8)
        }
      })

      // Draw category labels when settling/settled
      if (phase === 'settling' || phase === 'settled') {
        Object.entries(SOURCE_CONFIG).forEach(([source, config]) => {
          const angle = (config.angle * Math.PI) / 180
          const labelDist = Math.min(canvas.width, canvas.height) * 0.42
          const x = centerX + Math.cos(angle) * labelDist
          const y = centerY + Math.sin(angle) * labelDist

          ctx.font = 'bold 14px monospace'
          ctx.fillStyle = config.color
          ctx.textAlign = 'center'
          ctx.globalAlpha = phase === 'settled' ? 1 : 0.5
          ctx.fillText(source.toUpperCase(), x, y)
          ctx.globalAlpha = 1
        })
      }

      setHoveredParticle(newHovered)

      // Check if settled
      if (phase === 'settling') {
        const allSettled = particlesRef.current.every(p => {
          const dx = p.targetX - p.x
          const dy = p.targetY - p.y
          return Math.sqrt(dx * dx + dy * dy) < 5
        })
        if (allSettled) setPhase('settled')
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [phase])

  const triggerExplosion = () => {
    setPhase('countdown')
    setCountdown(3)
    explosionTimeRef.current = 0
  }

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
          <div className="text-white/40 font-mono text-xs">THE BIG BANG</div>
        </div>
      </div>

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="text-[200px] font-bold text-accent font-mono animate-pulse">
              {countdown}
            </div>
            <div className="text-white/60 font-mono">markets loading...</div>
          </div>
        </div>
      )}

      {/* Center stats (after explosion) */}
      {(phase === 'settling' || phase === 'settled') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <div className="text-6xl md:text-8xl font-bold text-white font-mono">
              {totalCount.toLocaleString()}
            </div>
            <div className="text-accent font-mono">MARKETS EXPLODED</div>
          </div>
        </div>
      )}

      {/* Controls */}
      {phase === 'settled' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-20">
          <button
            onClick={triggerExplosion}
            className="bg-white/10 hover:bg-white/20 text-white font-mono px-4 py-2 transition-colors"
          >
            💥 REPLAY
          </button>
          <Link
            href="/markets"
            className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-6 py-2 transition-colors"
          >
            EXPLORE ALL →
          </Link>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredParticle && phase !== 'countdown' && (
        <div
          className="fixed z-50 bg-black/95 border border-accent p-4 rounded-lg shadow-2xl"
          style={{
            left: mouseRef.current.x + 20,
            top: mouseRef.current.y - 20,
          }}
        >
          <div className="text-lg font-bold text-white font-mono">{hoveredParticle.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-2">{hoveredParticle.name}</div>
          <div className="text-xl font-bold text-white font-mono">
            {formatValue(hoveredParticle.value, hoveredParticle.source)}
          </div>
          {hoveredParticle.changePct !== null && (
            <div className={`font-mono ${hoveredParticle.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {hoveredParticle.changePct >= 0 ? '↑' : '↓'} {Math.abs(hoveredParticle.changePct).toFixed(2)}%
            </div>
          )}
        </div>
      )}
    </main>
  )
}
