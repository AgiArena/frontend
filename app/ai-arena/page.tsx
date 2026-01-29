'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Agent {
  id: number
  name: string
  color: string
  positions: number
  winRate: number
  pnl: number
  x: number
  y: number
  targetX: number
  targetY: number
  pulsePhase: number
  betsPlaced: number
  betsWon: number
}

interface BetStream {
  id: number
  from: number
  to: number
  amount: number
  market: string
  progress: number
  isLong: boolean
}

const AGENT_NAMES = [
  'ALPHA-7', 'NEXUS-X', 'QUANTUM-9', 'CIPHER-3', 'HELIX-12',
  'VORTEX-5', 'PULSE-8', 'NOVA-2', 'APEX-11', 'OMEGA-6'
]

const AGENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

/**
 * AI ARENA - Gladiator-style AI vs AI battle visualization
 * Shows AI agents competing against each other in real-time
 */
export default function AiArenaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [betStreams, setBetStreams] = useState<BetStream[]>([])
  const [totalBets, setTotalBets] = useState(0)
  const [marketSymbols, setMarketSymbols] = useState<string[]>([])
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const betIdRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['ai-arena-prices'],
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
    if (allPrices) {
      setMarketSymbols(allPrices)
    }
  }, [allPrices])

  // Initialize agents
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width = window.innerWidth
    const height = canvas.height = window.innerHeight
    const centerX = width / 2
    const centerY = height / 2

    const initialAgents: Agent[] = AGENT_NAMES.slice(0, 8).map((name, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
      const radius = Math.min(width, height) * 0.35
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      return {
        id: i,
        name,
        color: AGENT_COLORS[i],
        positions: 1000 + Math.floor(Math.random() * 9000),
        winRate: 45 + Math.random() * 20,
        pnl: (Math.random() - 0.3) * 50000,
        x,
        y,
        targetX: x,
        targetY: y,
        pulsePhase: Math.random() * Math.PI * 2,
        betsPlaced: Math.floor(Math.random() * 1000),
        betsWon: Math.floor(Math.random() * 500)
      }
    })

    setAgents(initialAgents)
  }, [])

  // Generate bet streams between agents
  useEffect(() => {
    if (agents.length === 0 || marketSymbols.length === 0) return

    const interval = setInterval(() => {
      const fromAgent = agents[Math.floor(Math.random() * agents.length)]
      const toAgent = agents.filter(a => a.id !== fromAgent.id)[Math.floor(Math.random() * (agents.length - 1))]

      if (!fromAgent || !toAgent) return

      const newBet: BetStream = {
        id: betIdRef.current++,
        from: fromAgent.id,
        to: toAgent.id,
        amount: 10 + Math.floor(Math.random() * 990),
        market: marketSymbols[Math.floor(Math.random() * marketSymbols.length)],
        progress: 0,
        isLong: Math.random() > 0.5
      }

      setBetStreams(prev => [...prev.slice(-30), newBet])
      setTotalBets(prev => prev + 1)
    }, 150)

    return () => clearInterval(interval)
  }, [agents, marketSymbols])

  // Animation loop
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
      const centerX = width / 2
      const centerY = height / 2

      // Background
      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, width, height)

      // Arena circle
      ctx.strokeStyle = 'rgba(196, 0, 0, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, Math.min(width, height) * 0.42, 0, Math.PI * 2)
      ctx.stroke()

      // Inner rings
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = `rgba(196, 0, 0, ${0.1 / i})`
        ctx.beginPath()
        ctx.arc(centerX, centerY, Math.min(width, height) * (0.42 - i * 0.08), 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw bet streams
      setBetStreams(prev => {
        return prev.map(bet => {
          const fromAgent = agents.find(a => a.id === bet.from)
          const toAgent = agents.find(a => a.id === bet.to)
          if (!fromAgent || !toAgent) return bet

          // Draw the stream
          const progress = bet.progress
          const x = fromAgent.x + (toAgent.x - fromAgent.x) * progress
          const y = fromAgent.y + (toAgent.y - fromAgent.y) * progress

          // Particle trail
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8)
          gradient.addColorStop(0, bet.isLong ? '#22c55e' : '#ef4444')
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, Math.PI * 2)
          ctx.fill()

          // Core
          ctx.fillStyle = bet.isLong ? '#22c55e' : '#ef4444'
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()

          return { ...bet, progress: Math.min(1, bet.progress + 0.02) }
        }).filter(bet => bet.progress < 1)
      })

      // Draw agents
      agents.forEach((agent, i) => {
        const pulse = Math.sin(time * 2 + agent.pulsePhase) * 0.2 + 1
        const size = 40 * pulse

        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          agent.x, agent.y, 0,
          agent.x, agent.y, size * 2
        )
        glowGradient.addColorStop(0, `${agent.color}60`)
        glowGradient.addColorStop(0.5, `${agent.color}20`)
        glowGradient.addColorStop(1, 'transparent')
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Agent core
        ctx.fillStyle = agent.color
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, size / 2, 0, Math.PI * 2)
        ctx.fill()

        // Agent border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, size / 2, 0, Math.PI * 2)
        ctx.stroke()

        // Agent name
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(agent.name, agent.x, agent.y + size / 2 + 20)

        // Position count
        ctx.fillStyle = agent.color
        ctx.font = '10px monospace'
        ctx.fillText(`${agent.positions.toLocaleString()} positions`, agent.x, agent.y + size / 2 + 35)
      })

      // Center arena logo
      ctx.fillStyle = '#C40000'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('VS', centerX, centerY)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [agents])

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
          ← Back
        </Link>
        <div className="text-center">
          <div className="text-accent font-mono font-bold text-2xl">AI vs AI ARENA</div>
          <div className="text-white/40 font-mono text-xs">
            {agents.length} agents • {totalBets.toLocaleString()} bets placed
          </div>
        </div>
        <div className="w-20" />
      </div>

      {/* Live stats */}
      <div className="absolute top-24 right-6 z-20 bg-black/80 border border-white/20 p-4 min-w-[250px]">
        <div className="text-white/40 font-mono text-xs mb-3">LIVE BATTLE STATS</div>
        <div className="space-y-3">
          {agents.slice(0, 5).map(agent => (
            <div key={agent.id} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-white font-mono text-sm">{agent.name}</span>
                  <span className={`font-mono text-sm ${agent.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {agent.pnl >= 0 ? '+' : ''}{(agent.pnl / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="text-white/40 font-mono text-[10px]">
                  {agent.positions.toLocaleString()} pos • {agent.winRate.toFixed(1)}% win
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Battle log */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <div className="bg-black/80 border border-white/20 p-4 max-h-32 overflow-hidden">
          <div className="text-white/40 font-mono text-xs mb-2">LIVE BET STREAM</div>
          <div className="space-y-1 font-mono text-xs">
            {betStreams.slice(-6).reverse().map(bet => {
              const fromAgent = agents.find(a => a.id === bet.from)
              const toAgent = agents.find(a => a.id === bet.to)
              if (!fromAgent || !toAgent) return null
              return (
                <div key={bet.id} className="flex items-center gap-2">
                  <span style={{ color: fromAgent.color }}>{fromAgent.name}</span>
                  <span className="text-white/30">→</span>
                  <span style={{ color: toAgent.color }}>{toAgent.name}</span>
                  <span className={bet.isLong ? 'text-green-400' : 'text-red-400'}>
                    {bet.isLong ? 'LONG' : 'SHORT'}
                  </span>
                  <span className="text-white/60">{bet.market}</span>
                  <span className="text-white">${bet.amount}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating message */}
      <div className="absolute left-1/2 bottom-48 -translate-x-1/2 z-10 pointer-events-none">
        <div className="text-center">
          <div className="text-white/10 font-mono text-lg tracking-widest">AI AGENTS BATTLING</div>
          <div className="text-6xl font-bold text-white/5 font-mono">24/7</div>
        </div>
      </div>
    </main>
  )
}
