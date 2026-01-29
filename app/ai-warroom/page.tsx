'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Agent {
  id: string
  name: string
  color: string
  strategy: string
  markets: number
  activeBets: number
  winStreak: number
  pnl: number
  lastAction: string
  lastActionTime: number
}

interface MarketBattle {
  id: number
  symbol: string
  source: string
  agents: { id: string; position: 'LONG' | 'SHORT'; size: number }[]
  longTotal: number
  shortTotal: number
}

const STRATEGIES = [
  'Momentum Hunter', 'Mean Reversion', 'Arbitrage Bot', 'Trend Following',
  'Volatility Trader', 'News Reactor', 'Pattern Scanner', 'Quant Alpha'
]

const AGENT_DATA = [
  { name: 'ALPHA-7', color: '#FF6B6B', emoji: '🔴' },
  { name: 'NEXUS-X', color: '#4ECDC4', emoji: '🟢' },
  { name: 'QUANTUM-9', color: '#45B7D1', emoji: '🔵' },
  { name: 'CIPHER-3', color: '#96CEB4', emoji: '🟤' },
  { name: 'HELIX-12', color: '#FFEAA7', emoji: '🟡' },
  { name: 'VORTEX-5', color: '#DDA0DD', emoji: '🟣' },
]

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stocks: '#00D4AA',
  defi: '#627EEA',
}

/**
 * AI WAR ROOM - Command center showing AI agents' strategies clashing
 * Multiple screens, live feeds, strategic overlays
 */
export default function AiWarroomPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [marketBattles, setMarketBattles] = useState<MarketBattle[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [totalVolume, setTotalVolume] = useState(0)
  const battleIdRef = useRef(0)
  const [clockTime, setClockTime] = useState(new Date())

  const { data: allPrices } = useQuery({
    queryKey: ['ai-warroom-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=100`)
          if (!res.ok) return { prices: [], source }
          const data = await res.json()
          return {
            prices: data.prices?.map((p: { symbol: string; name: string }) => ({
              symbol: p.symbol || p.name.slice(0, 6),
              source
            })) || [],
            source
          }
        })
      )
      return results.flatMap(r => r.prices)
    },
    staleTime: 30 * 1000,
  })

  // Initialize agents
  useEffect(() => {
    const initialAgents = AGENT_DATA.map((data, i) => ({
      id: `agent-${i}`,
      name: data.name,
      color: data.color,
      strategy: STRATEGIES[i % STRATEGIES.length],
      markets: 1500 + Math.floor(Math.random() * 3500),
      activeBets: 50 + Math.floor(Math.random() * 200),
      winStreak: Math.floor(Math.random() * 15),
      pnl: (Math.random() - 0.3) * 100000,
      lastAction: 'Scanning markets...',
      lastActionTime: Date.now()
    }))
    setAgents(initialAgents)
    setSelectedAgent(initialAgents[0])
  }, [])

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setClockTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Generate market battles
  useEffect(() => {
    if (!allPrices || allPrices.length === 0 || agents.length === 0) return

    const interval = setInterval(() => {
      const market = allPrices[Math.floor(Math.random() * allPrices.length)]
      const numAgents = 2 + Math.floor(Math.random() * 4)
      const shuffledAgents = [...agents].sort(() => Math.random() - 0.5).slice(0, numAgents)

      const battleAgents = shuffledAgents.map(agent => ({
        id: agent.id,
        position: Math.random() > 0.5 ? 'LONG' : 'SHORT' as 'LONG' | 'SHORT',
        size: 100 + Math.floor(Math.random() * 900)
      }))

      const longTotal = battleAgents.filter(a => a.position === 'LONG').reduce((acc, a) => acc + a.size, 0)
      const shortTotal = battleAgents.filter(a => a.position === 'SHORT').reduce((acc, a) => acc + a.size, 0)

      const newBattle: MarketBattle = {
        id: battleIdRef.current++,
        symbol: market.symbol,
        source: market.source,
        agents: battleAgents,
        longTotal,
        shortTotal
      }

      setMarketBattles(prev => [newBattle, ...prev].slice(0, 20))
      setTotalVolume(prev => prev + longTotal + shortTotal)

      // Update agent actions
      setAgents(prev => prev.map(agent => {
        const inBattle = battleAgents.find(a => a.id === agent.id)
        if (inBattle) {
          return {
            ...agent,
            lastAction: `${inBattle.position} ${market.symbol} $${inBattle.size}`,
            lastActionTime: Date.now(),
            activeBets: agent.activeBets + 1
          }
        }
        return agent
      }))
    }, 800)

    return () => clearInterval(interval)
  }, [allPrices, agents])

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Top status bar */}
      <div className="bg-black/80 border-b border-white/10 px-4 py-2 flex justify-between items-center">
        <Link href="/" className="text-white/60 hover:text-white text-sm">
          ← EXIT WAR ROOM
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs">ALL SYSTEMS NOMINAL</span>
          </div>
          <div className="text-accent font-bold">AGIARENA COMMAND CENTER</div>
          <div className="text-white/40 text-xs">{clockTime.toLocaleTimeString()}</div>
        </div>
        <div className="text-white/40 text-xs">
          VOL: ${(totalVolume / 1000).toFixed(1)}K
        </div>
      </div>

      <div className="flex h-[calc(100vh-44px)]">
        {/* Left panel - Agent roster */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="text-white/40 text-xs mb-1">ACTIVE COMBATANTS</div>
            <div className="text-2xl font-bold text-accent">{agents.length} AI AGENTS</div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`
                  p-3 border cursor-pointer transition-all
                  ${selectedAgent?.id === agent.id
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                    <span className="font-bold" style={{ color: agent.color }}>{agent.name}</span>
                  </div>
                  <span className={`text-sm ${agent.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {agent.pnl >= 0 ? '+' : ''}${(agent.pnl / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="text-white/40 text-xs mb-1">{agent.strategy}</div>
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>{agent.markets.toLocaleString()} mkts</span>
                  <span>{agent.activeBets} active</span>
                  <span>🔥 {agent.winStreak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Battle map */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div className="text-white/40 text-xs">LIVE MARKET BATTLES</div>
            <div className="flex items-center gap-4 text-xs">
              {Object.entries(SOURCE_COLORS).map(([source, color]) => (
                <div key={source} className="flex items-center gap-1">
                  <span className="w-2 h-2" style={{ backgroundColor: color }} />
                  <span className="text-white/40">{source}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {marketBattles.map(battle => (
                <div
                  key={battle.id}
                  className="border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2"
                        style={{ backgroundColor: SOURCE_COLORS[battle.source] }}
                      />
                      <span className="font-bold text-white">{battle.symbol}</span>
                    </div>
                    <span className="text-white/40 text-xs">
                      {battle.agents.length} agents
                    </span>
                  </div>

                  {/* Battle bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400">LONG ${battle.longTotal}</span>
                      <span className="text-red-400">SHORT ${battle.shortTotal}</span>
                    </div>
                    <div className="h-2 bg-white/10 flex overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(battle.longTotal / (battle.longTotal + battle.shortTotal)) * 100}%`
                        }}
                      />
                      <div className="flex-1 bg-red-500" />
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex flex-wrap gap-1">
                    {battle.agents.map((battleAgent, i) => {
                      const agent = agents.find(a => a.id === battleAgent.id)
                      if (!agent) return null
                      return (
                        <span
                          key={i}
                          className={`
                            px-2 py-0.5 text-[10px] border
                            ${battleAgent.position === 'LONG'
                              ? 'border-green-500/50 text-green-400'
                              : 'border-red-500/50 text-red-400'
                            }
                          `}
                          style={{ backgroundColor: `${agent.color}20` }}
                        >
                          {agent.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Selected agent details */}
        <div className="w-96 border-l border-white/10 flex flex-col">
          {selectedAgent ? (
            <>
              <div
                className="p-4 border-b"
                style={{ borderColor: selectedAgent.color, backgroundColor: `${selectedAgent.color}10` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: selectedAgent.color }}
                  >
                    {selectedAgent.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-xl" style={{ color: selectedAgent.color }}>
                      {selectedAgent.name}
                    </div>
                    <div className="text-white/40 text-sm">{selectedAgent.strategy}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 p-3">
                    <div className="text-white/40 text-[10px]">MARKETS COVERED</div>
                    <div className="text-2xl font-bold" style={{ color: selectedAgent.color }}>
                      {selectedAgent.markets.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3">
                    <div className="text-white/40 text-[10px]">ACTIVE BETS</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedAgent.activeBets}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3">
                    <div className="text-white/40 text-[10px]">WIN STREAK</div>
                    <div className="text-2xl font-bold text-orange-400">
                      🔥 {selectedAgent.winStreak}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3">
                    <div className="text-white/40 text-[10px]">SESSION P&L</div>
                    <div className={`text-2xl font-bold ${selectedAgent.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedAgent.pnl >= 0 ? '+' : ''}${(selectedAgent.pnl / 1000).toFixed(1)}K
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3">
                  <div className="text-white/40 text-[10px] mb-2">LAST ACTION</div>
                  <div className="text-white font-bold">{selectedAgent.lastAction}</div>
                  <div className="text-white/30 text-xs">
                    {Math.floor((Date.now() - selectedAgent.lastActionTime) / 1000)}s ago
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3">
                  <div className="text-white/40 text-[10px] mb-2">STRATEGY DESCRIPTION</div>
                  <div className="text-white/60 text-sm">
                    {selectedAgent.strategy === 'Momentum Hunter' && 'Identifies and rides strong price movements across multiple timeframes.'}
                    {selectedAgent.strategy === 'Mean Reversion' && 'Bets on prices returning to historical averages after extreme moves.'}
                    {selectedAgent.strategy === 'Arbitrage Bot' && 'Exploits price discrepancies across different markets and venues.'}
                    {selectedAgent.strategy === 'Trend Following' && 'Follows established trends with dynamic position sizing.'}
                    {selectedAgent.strategy === 'Volatility Trader' && 'Profits from changes in market volatility levels.'}
                    {selectedAgent.strategy === 'News Reactor' && 'Rapidly analyzes and trades on breaking market news.'}
                  </div>
                </div>
              </div>

              <div className="mt-auto p-4 border-t border-white/10">
                <div className="text-center text-white/30 text-xs">
                  This agent is analyzing {selectedAgent.markets.toLocaleString()} markets
                  <br />and managing {selectedAgent.activeBets} active positions simultaneously
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30">
              Select an agent to view details
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
