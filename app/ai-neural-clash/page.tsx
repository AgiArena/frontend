'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Neuron {
  x: number
  y: number
  layer: number
  activation: number
  side: 'left' | 'right'
}

interface DataPacket {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  type: 'attack' | 'defense' | 'data'
  side: 'left' | 'right'
}

interface BattleEvent {
  id: number
  time: number
  winner: 'left' | 'right'
  market: string
  leftBet: { position: 'LONG' | 'SHORT'; amount: number }
  rightBet: { position: 'LONG' | 'SHORT'; amount: number }
}

/**
 * AI NEURAL CLASH - Two neural networks visualized battling
 * Data streams flow between them representing bets
 */
export default function AiNeuralClashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [leftScore, setLeftScore] = useState({ wins: 0, pnl: 0, name: 'ALPHA-7' })
  const [rightScore, setRightScore] = useState({ wins: 0, pnl: 0, name: 'NEXUS-X' })
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([])
  const [marketSymbols, setMarketSymbols] = useState<string[]>([])
  const [totalClashes, setTotalClashes] = useState(0)

  const neuronsRef = useRef<Neuron[]>([])
  const packetsRef = useRef<DataPacket[]>([])
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const packetIdRef = useRef(0)
  const eventIdRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['ai-neural-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=200`)
          if (!res.ok) return []
          const data = await res.json()
          return data.prices?.map((p: { symbol: string; name: string }) => p.symbol || p.name.slice(0, 6)) || []
        })
      )
      return results.flat()
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (allPrices) setMarketSymbols(allPrices)
  }, [allPrices])

  // Initialize neural networks
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width = window.innerWidth
    const height = canvas.height = window.innerHeight

    const neurons: Neuron[] = []
    const layers = [8, 12, 16, 12, 8]
    const layerSpacing = 120

    // Left network
    layers.forEach((count, layerIdx) => {
      const x = 150 + layerIdx * layerSpacing
      const startY = height / 2 - (count * 40) / 2

      for (let i = 0; i < count; i++) {
        neurons.push({
          x,
          y: startY + i * 40,
          layer: layerIdx,
          activation: Math.random(),
          side: 'left'
        })
      }
    })

    // Right network (mirrored)
    layers.forEach((count, layerIdx) => {
      const x = width - 150 - layerIdx * layerSpacing
      const startY = height / 2 - (count * 40) / 2

      for (let i = 0; i < count; i++) {
        neurons.push({
          x,
          y: startY + i * 40,
          layer: layerIdx,
          activation: Math.random(),
          side: 'right'
        })
      }
    })

    neuronsRef.current = neurons
  }, [])

  // Generate clash events
  useEffect(() => {
    if (marketSymbols.length === 0) return

    const interval = setInterval(() => {
      const market = marketSymbols[Math.floor(Math.random() * marketSymbols.length)]
      const leftPos = Math.random() > 0.5 ? 'LONG' : 'SHORT' as 'LONG' | 'SHORT'
      const rightPos = Math.random() > 0.5 ? 'LONG' : 'SHORT' as 'LONG' | 'SHORT'
      const winner = Math.random() > 0.5 ? 'left' : 'right' as 'left' | 'right'
      const amount = 50 + Math.floor(Math.random() * 450)

      const event: BattleEvent = {
        id: eventIdRef.current++,
        time: Date.now(),
        winner,
        market,
        leftBet: { position: leftPos, amount },
        rightBet: { position: rightPos, amount }
      }

      setBattleEvents(prev => [event, ...prev].slice(0, 15))
      setTotalClashes(prev => prev + 1)

      if (winner === 'left') {
        setLeftScore(prev => ({ ...prev, wins: prev.wins + 1, pnl: prev.pnl + amount * 0.5 }))
        setRightScore(prev => ({ ...prev, pnl: prev.pnl - amount * 0.3 }))
      } else {
        setRightScore(prev => ({ ...prev, wins: prev.wins + 1, pnl: prev.pnl + amount * 0.5 }))
        setLeftScore(prev => ({ ...prev, pnl: prev.pnl - amount * 0.3 }))
      }

      // Create data packet
      const canvas = canvasRef.current
      if (!canvas) return
      const width = canvas.width
      const height = canvas.height

      const newPacket: DataPacket = {
        id: packetIdRef.current++,
        x: winner === 'left' ? width - 150 : 150,
        y: height / 2 + (Math.random() - 0.5) * 200,
        targetX: winner === 'left' ? 150 : width - 150,
        targetY: height / 2 + (Math.random() - 0.5) * 200,
        progress: 0,
        type: 'attack',
        side: winner
      }

      packetsRef.current.push(newPacket)
    }, 400)

    return () => clearInterval(interval)
  }, [marketSymbols])

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      timeRef.current += 0.016
      const time = timeRef.current

      const width = canvas.width
      const height = canvas.height

      // Background
      const bgGradient = ctx.createLinearGradient(0, 0, width, 0)
      bgGradient.addColorStop(0, '#0a0515')
      bgGradient.addColorStop(0.5, '#050508')
      bgGradient.addColorStop(1, '#051505')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Center clash zone
      const centerX = width / 2
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 10])
      ctx.beginPath()
      ctx.moveTo(centerX, 0)
      ctx.lineTo(centerX, height)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw "VS" in center
      const vsPulse = Math.sin(time * 3) * 0.3 + 1
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * vsPulse})`
      ctx.font = `bold ${60 * vsPulse}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚡', centerX, height / 2)

      // Draw neural networks
      const neurons = neuronsRef.current

      // Draw connections
      const layers = [8, 12, 16, 12, 8]
      let leftOffset = 0
      let rightOffset = neurons.filter(n => n.side === 'left').length

      layers.forEach((count, layerIdx) => {
        if (layerIdx === 0) {
          leftOffset += count
          return
        }

        const prevCount = layers[layerIdx - 1]

        // Left network connections
        for (let i = 0; i < count; i++) {
          const neuron = neurons[leftOffset - prevCount + Math.floor(Math.random() * prevCount)]
          const target = neurons[leftOffset + i]
          if (neuron && target && neuron.side === 'left' && target.side === 'left') {
            ctx.strokeStyle = `rgba(196, 0, 0, ${0.1 + neuron.activation * 0.2})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(neuron.x, neuron.y)
            ctx.lineTo(target.x, target.y)
            ctx.stroke()
          }
        }

        leftOffset += count
      })

      // Draw neurons
      neurons.forEach((neuron) => {
        // Update activation
        neuron.activation = Math.sin(time * 2 + neuron.x * 0.01 + neuron.y * 0.01) * 0.5 + 0.5

        const baseColor = neuron.side === 'left' ? '#C40000' : '#00C440'
        const size = 6 + neuron.activation * 4

        // Glow
        const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, size * 3)
        glow.addColorStop(0, `${baseColor}60`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(neuron.x, neuron.y, size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = baseColor
        ctx.beginPath()
        ctx.arc(neuron.x, neuron.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw data packets
      packetsRef.current = packetsRef.current.filter(packet => {
        packet.progress += 0.015
        if (packet.progress >= 1) return false

        const x = packet.x + (packet.targetX - packet.x) * packet.progress
        const y = packet.y + (packet.targetY - packet.y) * packet.progress

        // Trail
        const trailLength = 30
        for (let i = 0; i < trailLength; i++) {
          const trailProgress = packet.progress - i * 0.01
          if (trailProgress < 0) continue
          const tx = packet.x + (packet.targetX - packet.x) * trailProgress
          const ty = packet.y + (packet.targetY - packet.y) * trailProgress
          const alpha = (1 - i / trailLength) * 0.5

          ctx.fillStyle = packet.side === 'left'
            ? `rgba(196, 0, 0, ${alpha})`
            : `rgba(0, 196, 64, ${alpha})`
          ctx.beginPath()
          ctx.arc(tx, ty, 3 - i * 0.05, 0, Math.PI * 2)
          ctx.fill()
        }

        // Packet core
        ctx.fillStyle = packet.side === 'left' ? '#FF4444' : '#44FF44'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()

        return true
      })

      // Team labels
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#C40000'
      ctx.fillText(leftScore.name, 350, 80)
      ctx.fillStyle = '#00C440'
      ctx.fillText(rightScore.name, width - 350, 80)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [leftScore.name, rightScore.name])

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          ← Back
        </Link>
        <div className="text-center">
          <div className="text-white/40 font-mono text-xs">NEURAL NETWORK BATTLE</div>
          <div className="text-xl font-bold font-mono">
            <span className="text-red-500">{leftScore.name}</span>
            <span className="text-white/40 mx-4">VS</span>
            <span className="text-green-500">{rightScore.name}</span>
          </div>
        </div>
        <div className="text-white/40 font-mono text-sm">
          {totalClashes.toLocaleString()} clashes
        </div>
      </div>

      {/* Left score panel */}
      <div className="absolute top-32 left-6 z-20 bg-black/80 border border-red-500/50 p-4 min-w-[200px]">
        <div className="text-red-500 font-mono font-bold text-lg mb-3">{leftScore.name}</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Wins:</span>
            <span className="text-white font-mono">{leftScore.wins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">P&L:</span>
            <span className={`font-mono ${leftScore.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {leftScore.pnl >= 0 ? '+' : ''}${(leftScore.pnl / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </div>

      {/* Right score panel */}
      <div className="absolute top-32 right-6 z-20 bg-black/80 border border-green-500/50 p-4 min-w-[200px]">
        <div className="text-green-500 font-mono font-bold text-lg mb-3">{rightScore.name}</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Wins:</span>
            <span className="text-white font-mono">{rightScore.wins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">P&L:</span>
            <span className={`font-mono ${rightScore.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rightScore.pnl >= 0 ? '+' : ''}${(rightScore.pnl / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <div className="bg-black/80 border border-white/20 p-4">
          <div className="text-white/40 font-mono text-xs mb-2">LIVE CLASH FEED</div>
          <div className="space-y-1 max-h-40 overflow-hidden">
            {battleEvents.slice(0, 8).map(event => (
              <div key={event.id} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-white/30">{new Date(event.time).toLocaleTimeString()}</span>
                <span className={event.winner === 'left' ? 'text-red-500' : 'text-green-500'}>
                  {event.winner === 'left' ? leftScore.name : rightScore.name}
                </span>
                <span className="text-yellow-400">⚡ WON</span>
                <span className="text-white">{event.market}</span>
                <span className="text-white/40">
                  ({event.leftBet.position} vs {event.rightBet.position})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating stats */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <div className="text-center">
          <div className="text-white/5 font-mono text-8xl font-bold">
            {totalClashes.toLocaleString()}
          </div>
          <div className="text-white/10 font-mono tracking-widest">MARKET CLASHES</div>
        </div>
      </div>
    </main>
  )
}
