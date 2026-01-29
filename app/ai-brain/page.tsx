'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface MarketPrice {
  source: string
  symbol: string
  name: string
  value: string
  changePct: string | null
}

interface ProcessingItem {
  id: number
  source: string
  symbol: string
  action: string
  timestamp: number
  status: 'processing' | 'complete' | 'decision'
}

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stocks: '#00D4AA',
  defi: '#627EEA',
  rates: '#FFD700',
  ecb: '#00BFFF',
  bls: '#FF69B4',
}

const ACTIONS = [
  'Analyzing price action',
  'Calculating correlation',
  'Evaluating momentum',
  'Checking volume profile',
  'Scanning for patterns',
  'Measuring volatility',
  'Assessing sentiment',
  'Computing fair value',
  'Detecting anomalies',
  'Updating position'
]

/**
 * AI BRAIN - Real-time visualization of AI processing thousands of markets
 * Shows the "firehose" of data being processed
 */
export default function AiBrainPage() {
  const [processingQueue, setProcessingQueue] = useState<ProcessingItem[]>([])
  const [stats, setStats] = useState({
    processed: 0,
    decisions: 0,
    marketsWatching: 0,
    throughput: 0
  })
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({})
  const queueIdRef = useRef(0)
  const marketsRef = useRef<MarketPrice[]>([])

  const { data: allPrices } = useQuery({
    queryKey: ['ai-brain-prices'],
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

      const counts: Record<string, number> = {}
      let total = 0
      results.forEach(r => {
        counts[r.source] = r.total
        total += r.total
      })
      setSourceCounts(counts)
      setStats(prev => ({ ...prev, marketsWatching: total }))

      return results.flatMap(r => r.prices)
    },
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (allPrices) {
      marketsRef.current = allPrices
    }
  }, [allPrices])

  // Simulate processing queue
  useEffect(() => {
    const interval = setInterval(() => {
      const markets = marketsRef.current
      if (markets.length === 0) return

      // Add new processing items
      const newItems: ProcessingItem[] = []
      const batchSize = 3 + Math.floor(Math.random() * 5)

      for (let i = 0; i < batchSize; i++) {
        const market = markets[Math.floor(Math.random() * markets.length)]
        const isDecision = Math.random() < 0.1 // 10% are decisions

        newItems.push({
          id: queueIdRef.current++,
          source: market.source,
          symbol: market.symbol || market.name.slice(0, 6),
          action: isDecision
            ? `${Math.random() > 0.5 ? 'LONG' : 'SHORT'} position opened`
            : ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
          timestamp: Date.now(),
          status: isDecision ? 'decision' : 'processing'
        })
      }

      setProcessingQueue(prev => {
        const updated = [...newItems, ...prev].slice(0, 50) // Keep last 50
        return updated
      })

      // Update stats
      setStats(prev => ({
        ...prev,
        processed: prev.processed + batchSize,
        decisions: prev.decisions + newItems.filter(i => i.status === 'decision').length,
        throughput: batchSize * 10 // items per second estimate
      }))

      // Mark items as complete after delay
      setTimeout(() => {
        setProcessingQueue(prev =>
          prev.map(item =>
            newItems.find(n => n.id === item.id) && item.status === 'processing'
              ? { ...item, status: 'complete' }
              : item
          )
        )
      }, 500)
    }, 100) // Very fast updates

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="min-h-screen bg-[#050508] text-white font-mono overflow-hidden">
      {/* Scanlines effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }} />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur">
          <div className="max-w-[1800px] mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-white/60 hover:text-white text-sm">
              ← EXIT
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs">ONLINE</span>
              </div>
              <div className="text-accent font-bold">AGIARENA AI CORE</div>
            </div>
            <div className="text-white/40 text-xs">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Stats */}
          <div className="w-80 border-r border-white/10 p-4 flex flex-col">
            <div className="text-white/40 text-xs mb-4">SYSTEM STATUS</div>

            <div className="space-y-4 mb-6">
              <div className="bg-white/5 border border-white/10 p-4">
                <div className="text-white/40 text-[10px]">MARKETS WATCHING</div>
                <div className="text-3xl font-bold text-accent">
                  {stats.marketsWatching.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4">
                <div className="text-white/40 text-[10px]">ANALYSES THIS SESSION</div>
                <div className="text-3xl font-bold text-white">
                  {stats.processed.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4">
                <div className="text-white/40 text-[10px]">DECISIONS MADE</div>
                <div className="text-3xl font-bold text-green-400">
                  {stats.decisions.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4">
                <div className="text-white/40 text-[10px]">THROUGHPUT</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {stats.throughput}/s
                </div>
              </div>
            </div>

            <div className="text-white/40 text-xs mb-2">SOURCE DISTRIBUTION</div>
            <div className="space-y-2 flex-1">
              {Object.entries(sourceCounts).map(([source, count]) => (
                <div key={source}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: SOURCE_COLORS[source] }}>{source.toUpperCase()}</span>
                    <span className="text-white/40">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / stats.marketsWatching) * 100}%`,
                        backgroundColor: SOURCE_COLORS[source]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/markets"
              className="mt-4 block text-center bg-accent hover:bg-accent/80 text-white py-3 transition-colors"
            >
              VIEW ALL MARKETS →
            </Link>
          </div>

          {/* Center - Processing visualization */}
          <div className="flex-1 flex flex-col">
            {/* Brain visualization */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {/* Pulsing brain */}
              <div className="relative">
                {/* Outer rings */}
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="absolute inset-0 border-2 border-accent/20 rounded-full animate-ping"
                    style={{
                      width: `${200 + i * 100}px`,
                      height: `${200 + i * 100}px`,
                      left: `${-(i * 50)}px`,
                      top: `${-(i * 50)}px`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: '3s'
                    }}
                  />
                ))}

                {/* Core */}
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-accent to-red-900 flex items-center justify-center shadow-2xl shadow-accent/30">
                  <div className="text-center">
                    <div className="text-5xl font-bold">AI</div>
                    <div className="text-xs text-white/60">PROCESSING</div>
                  </div>
                </div>
              </div>

              {/* Floating data points */}
              {processingQueue.slice(0, 20).map((item, i) => {
                const angle = (i / 20) * Math.PI * 2
                const radius = 180 + Math.sin(Date.now() / 1000 + i) * 20
                const x = Math.cos(angle) * radius
                const y = Math.sin(angle) * radius

                return (
                  <div
                    key={item.id}
                    className="absolute text-xs transition-all duration-300"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      color: SOURCE_COLORS[item.source],
                      opacity: item.status === 'complete' ? 0.3 : 1
                    }}
                  >
                    {item.symbol}
                  </div>
                )
              })}
            </div>

            {/* Ticker tape */}
            <div className="h-8 bg-black/50 border-t border-white/10 flex items-center overflow-hidden">
              <div className="animate-marquee whitespace-nowrap flex gap-8">
                {processingQueue.slice(0, 30).map(item => (
                  <span
                    key={item.id}
                    className="text-xs"
                    style={{ color: SOURCE_COLORS[item.source] }}
                  >
                    {item.symbol}: {item.action}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel - Live feed */}
          <div className="w-96 border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-white/40 text-xs">LIVE PROCESSING FEED</div>
                <div className="text-green-400 text-xs">{processingQueue.length} in queue</div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="p-2 space-y-1">
                {processingQueue.map(item => (
                  <div
                    key={item.id}
                    className={`
                      p-2 text-xs border-l-2 transition-all duration-300
                      ${item.status === 'decision' ? 'bg-green-500/10 border-green-500' :
                        item.status === 'complete' ? 'bg-white/5 border-white/20 opacity-50' :
                        'bg-white/5 border-white/10'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SOURCE_COLORS[item.source] }}
                        />
                        <span className="font-bold" style={{ color: SOURCE_COLORS[item.source] }}>
                          {item.symbol}
                        </span>
                      </div>
                      <span className="text-white/30 text-[10px]">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`mt-1 ${item.status === 'decision' ? 'text-green-400 font-bold' : 'text-white/60'}`}>
                      {item.status === 'processing' && '⏳ '}
                      {item.status === 'complete' && '✓ '}
                      {item.status === 'decision' && '🎯 '}
                      {item.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for marquee */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </main>
  )
}
