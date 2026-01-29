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

interface Neuron {
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
  size: number
  activity: number // 0-1, how "active" this neuron is
  connections: string[] // IDs of connected neurons
  pulsePhase: number
}

interface Synapse {
  from: string
  to: string
  strength: number
  pulseProgress: number
  active: boolean
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
 * THE NEURAL NETWORK - Markets as neurons in a living brain
 * Connections pulse with "correlation signals"
 * Activity levels based on volume/volatility
 */
export default function MarketsNeuralPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const neuronsRef = useRef<Map<string, Neuron>>(new Map())
  const synapsesRef = useRef<Synapse[]>([])
  const [hoveredNeuron, setHoveredNeuron] = useState<Neuron | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [activityLevel, setActivityLevel] = useState(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const timeRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['neural-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=50`)
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
      return results.flatMap(r => r.prices)
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })

  // Initialize neurons and synapses
  useEffect(() => {
    if (!allPrices || !canvasRef.current) return

    const canvas = canvasRef.current
    const width = canvas.width = window.innerWidth
    const height = canvas.height = window.innerHeight
    const centerX = width / 2
    const centerY = height / 2

    const neurons = new Map<string, Neuron>()

    // Create neurons in a force-directed-ish layout
    allPrices.forEach((market, i) => {
      const layerIndex = Object.keys(SOURCE_COLORS).indexOf(market.source)
      const layerCount = allPrices.filter(p => p.source === market.source).length
      const indexInLayer = allPrices.filter((p, j) => p.source === market.source && j < i).length

      // Arrange in concentric rings by source
      const ringRadius = 150 + layerIndex * 80
      const angleOffset = (layerIndex * Math.PI) / 6
      const angle = angleOffset + (indexInLayer / layerCount) * Math.PI * 2

      const targetX = centerX + Math.cos(angle) * ringRadius
      const targetY = centerY + Math.sin(angle) * ringRadius

      // Size based on market cap
      const mc = market.marketCap ? parseFloat(market.marketCap) : parseFloat(market.value) * 1000000
      const size = Math.max(8, Math.min(25, Math.log10(mc + 1) * 3))

      // Activity based on change percentage
      const changePct = market.changePct ? Math.abs(parseFloat(market.changePct)) : 0
      const activity = Math.min(1, changePct / 10)

      neurons.set(`${market.source}-${market.assetId}`, {
        id: `${market.source}-${market.assetId}`,
        symbol: market.symbol || market.name.slice(0, 4),
        name: market.name,
        value: parseFloat(market.value),
        changePct: market.changePct ? parseFloat(market.changePct) : null,
        source: market.source,
        x: centerX + (Math.random() - 0.5) * 100, // Start clustered
        y: centerY + (Math.random() - 0.5) * 100,
        targetX,
        targetY,
        size,
        activity,
        connections: [],
        pulsePhase: Math.random() * Math.PI * 2
      })
    })

    // Create synapses (connections between related neurons)
    const synapses: Synapse[] = []
    const neuronArray = Array.from(neurons.values())

    neuronArray.forEach((neuron, i) => {
      // Connect to 2-4 nearby neurons
      const connectionCount = 2 + Math.floor(Math.random() * 3)
      const distances = neuronArray
        .filter(n => n.id !== neuron.id)
        .map(n => ({
          id: n.id,
          dist: Math.sqrt(
            Math.pow(n.targetX - neuron.targetX, 2) +
            Math.pow(n.targetY - neuron.targetY, 2)
          )
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, connectionCount + 2)

      // Prefer same-source connections but allow cross-source
      const sameSource = distances.filter(d => {
        const n = neurons.get(d.id)
        return n && n.source === neuron.source
      }).slice(0, 2)

      const diffSource = distances.filter(d => {
        const n = neurons.get(d.id)
        return n && n.source !== neuron.source
      }).slice(0, 1)

      const connections = [...sameSource, ...diffSource].map(d => d.id)

      neuron.connections = connections

      connections.forEach(targetId => {
        // Avoid duplicate synapses
        if (!synapses.find(s =>
          (s.from === neuron.id && s.to === targetId) ||
          (s.from === targetId && s.to === neuron.id)
        )) {
          synapses.push({
            from: neuron.id,
            to: targetId,
            strength: 0.3 + Math.random() * 0.7,
            pulseProgress: Math.random(),
            active: Math.random() < 0.3
          })
        }
      })
    })

    neuronsRef.current = neurons
    synapsesRef.current = synapses
  }, [allPrices])

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
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      timeRef.current += 0.016
      const time = timeRef.current

      // Dark background with subtle gradient
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      )
      gradient.addColorStop(0, '#0a0a1a')
      gradient.addColorStop(1, '#000005')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const neurons = neuronsRef.current
      const synapses = synapsesRef.current
      let newHovered: Neuron | null = null
      let totalActivity = 0

      // Move neurons toward targets
      neurons.forEach(neuron => {
        neuron.x += (neuron.targetX - neuron.x) * 0.03
        neuron.y += (neuron.targetY - neuron.y) * 0.03

        // Small floating motion
        neuron.x += Math.sin(time * 0.5 + neuron.pulsePhase) * 0.3
        neuron.y += Math.cos(time * 0.7 + neuron.pulsePhase) * 0.3

        // Update activity (fluctuate)
        neuron.activity = Math.max(0.1, Math.min(1,
          neuron.activity + (Math.random() - 0.5) * 0.05
        ))
        totalActivity += neuron.activity
      })

      setActivityLevel(totalActivity / neurons.size)

      // Draw synapses (connections)
      synapses.forEach(synapse => {
        const fromNeuron = neurons.get(synapse.from)
        const toNeuron = neurons.get(synapse.to)
        if (!fromNeuron || !toNeuron) return

        // Randomly activate/deactivate synapses
        if (Math.random() < 0.01) synapse.active = !synapse.active

        // Update pulse
        if (synapse.active) {
          synapse.pulseProgress += 0.02 * synapse.strength
          if (synapse.pulseProgress > 1) synapse.pulseProgress = 0
        }

        // Draw connection line
        const avgActivity = (fromNeuron.activity + toNeuron.activity) / 2
        ctx.strokeStyle = synapse.active
          ? `rgba(100, 150, 255, ${avgActivity * 0.4})`
          : `rgba(50, 50, 80, 0.1)`
        ctx.lineWidth = synapse.active ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(fromNeuron.x, fromNeuron.y)
        ctx.lineTo(toNeuron.x, toNeuron.y)
        ctx.stroke()

        // Draw pulse traveling along connection
        if (synapse.active && synapse.pulseProgress > 0) {
          const pulseX = fromNeuron.x + (toNeuron.x - fromNeuron.x) * synapse.pulseProgress
          const pulseY = fromNeuron.y + (toNeuron.y - fromNeuron.y) * synapse.pulseProgress

          const pulseGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 8)
          pulseGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)')
          pulseGradient.addColorStop(1, 'transparent')
          ctx.fillStyle = pulseGradient
          ctx.beginPath()
          ctx.arc(pulseX, pulseY, 8, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Draw neurons
      neurons.forEach(neuron => {
        const dx = mouseRef.current.x - neuron.x
        const dy = mouseRef.current.y - neuron.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const isHovered = dist < neuron.size + 10

        if (isHovered) newHovered = neuron

        const color = SOURCE_COLORS[neuron.source]
        const pulse = Math.sin(time * 3 + neuron.pulsePhase) * 0.3 + 0.7
        const currentActivity = neuron.activity * pulse

        // Outer glow based on activity
        const glowSize = neuron.size * (2 + currentActivity * 2)
        const glowGradient = ctx.createRadialGradient(
          neuron.x, neuron.y, neuron.size * 0.5,
          neuron.x, neuron.y, glowSize
        )
        glowGradient.addColorStop(0, isHovered ? '#ffffff' : color)
        glowGradient.addColorStop(0.3, `${color}${Math.round(currentActivity * 99).toString(16).padStart(2, '0')}`)
        glowGradient.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(neuron.x, neuron.y, glowSize, 0, Math.PI * 2)
        ctx.fill()

        // Neuron core
        ctx.fillStyle = isHovered ? '#ffffff' : color
        ctx.beginPath()
        ctx.arc(neuron.x, neuron.y, isHovered ? neuron.size * 1.3 : neuron.size, 0, Math.PI * 2)
        ctx.fill()

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.beginPath()
        ctx.arc(neuron.x - neuron.size * 0.2, neuron.y - neuron.size * 0.2, neuron.size * 0.4, 0, Math.PI * 2)
        ctx.fill()

        // Label for hovered or large neurons
        if (isHovered || neuron.size > 15) {
          ctx.font = `${isHovered ? 'bold 13px' : '10px'} monospace`
          ctx.fillStyle = isHovered ? '#ffffff' : `${color}cc`
          ctx.textAlign = 'center'
          ctx.fillText(neuron.symbol, neuron.x, neuron.y - neuron.size - 8)
        }
      })

      setHoveredNeuron(newHovered)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
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
          <div className="text-accent font-mono font-bold text-2xl tracking-wider">NEURAL MARKETS</div>
          <div className="text-white/40 font-mono text-xs">The financial brain • Live synapses</div>
        </div>
      </div>

      {/* Activity meter */}
      <div className="absolute top-24 right-6 z-20">
        <div className="text-white/40 font-mono text-xs mb-1">NETWORK ACTIVITY</div>
        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${activityLevel * 100}%` }}
          />
        </div>
        <div className="text-white/60 font-mono text-xs mt-1">
          {Math.round(activityLevel * 100)}% active
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-24 left-6 z-20">
        <div className="text-white/40 font-mono text-xs mb-2">NEURAL CLUSTERS</div>
        {Object.entries(SOURCE_COLORS).map(([source, color]) => (
          <div key={source} className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-white/60 font-mono text-xs uppercase">{source}</span>
          </div>
        ))}
      </div>

      {/* Center stats */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center opacity-20">
          <div className="text-8xl font-bold text-white font-mono">{totalCount.toLocaleString()}</div>
          <div className="text-white font-mono">NEURONS</div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Link
          href="/markets"
          className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-8 py-3 transition-colors"
        >
          EXPLORE ALL {totalCount.toLocaleString()} MARKETS →
        </Link>
      </div>

      {/* Hover tooltip */}
      {hoveredNeuron && (
        <div
          className="fixed z-50 bg-black/95 border-2 p-4 rounded-lg shadow-2xl min-w-[200px]"
          style={{
            left: Math.min(mouseRef.current.x + 20, window.innerWidth - 230),
            top: mouseRef.current.y - 20,
            borderColor: SOURCE_COLORS[hoveredNeuron.source]
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[hoveredNeuron.source] }}
            />
            <span className="text-white/60 font-mono text-xs uppercase">{hoveredNeuron.source}</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{hoveredNeuron.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-3">{hoveredNeuron.name}</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40 font-mono text-xs">PRICE</span>
              <span className="text-white font-mono font-bold">
                {formatValue(hoveredNeuron.value, hoveredNeuron.source)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 font-mono text-xs">24H CHANGE</span>
              <span className={`font-mono font-bold ${
                hoveredNeuron.changePct !== null && hoveredNeuron.changePct >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {hoveredNeuron.changePct !== null
                  ? `${hoveredNeuron.changePct >= 0 ? '+' : ''}${hoveredNeuron.changePct.toFixed(2)}%`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 font-mono text-xs">ACTIVITY</span>
              <span className="text-cyan-400 font-mono">
                {Math.round(hoveredNeuron.activity * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 font-mono text-xs">CONNECTIONS</span>
              <span className="text-white font-mono">
                {hoveredNeuron.connections.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
