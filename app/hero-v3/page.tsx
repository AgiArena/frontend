'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMarketSnapshot, type SnapshotPrice } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE SIGNAL" — Tinder-style rapid card swipe through markets
// Swipe right = YES, left = NO, or skip
// A constellation grows in the background with each decision
// ---------------------------------------------------------------------------

type Decision = 'yes' | 'no'

interface Star {
  x: number
  y: number
  size: number
  color: string
  opacity: number
}

function ConstellationBg({ stars }: { stars: Star[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

    // Draw connecting lines between nearby stars
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, stars.length); j++) {
        const dx = stars[i].x - stars[j].x
        const dy = stars[i].y - stars[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          ctx.beginPath()
          ctx.moveTo(stars[i].x, stars[i].y)
          ctx.lineTo(stars[j].x, stars[j].y)
          ctx.strokeStyle = `rgba(196, 0, 0, ${0.1 * (1 - dist / 150)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    // Draw stars
    for (const star of stars) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fillStyle = star.color
      ctx.globalAlpha = star.opacity
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }, [stars])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}

function SwipeCard({
  price,
  onDecision,
  onSkip,
  exitDirection,
}: {
  price: SnapshotPrice
  onDecision: (d: Decision) => void
  onSkip: () => void
  exitDirection: 'left' | 'right' | null
}) {
  const changePct = price.changePct ? parseFloat(price.changePct) : 0
  const value = parseFloat(price.value)
  const dragRef = useRef<{ startX: number; currentX: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [dragOffset, setDragOffset] = useState(0)

  function formatVal(v: number, source: string): string {
    if (source === 'rates' || source === 'bls' || source === 'bonds') return `${v.toFixed(2)}%`
    if (source === 'weather') return `${v.toFixed(1)}`
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    if (v >= 1) return `$${v.toFixed(2)}`
    return `$${v.toFixed(4)}`
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, currentX: e.clientX }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    dragRef.current.currentX = e.clientX
    setDragOffset(e.clientX - dragRef.current.startX)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return
    const offset = dragRef.current.currentX - dragRef.current.startX
    dragRef.current = null
    if (offset > 80) {
      onDecision('yes')
    } else if (offset < -80) {
      onDecision('no')
    }
    setDragOffset(0)
  }, [onDecision])

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'y') onDecision('yes')
      else if (e.key === 'ArrowLeft' || e.key === 'n') onDecision('no')
      else if (e.key === 'ArrowDown' || e.key === ' ') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDecision, onSkip])

  const rotation = dragOffset * 0.05
  const yesOpacity = Math.max(0, Math.min(1, dragOffset / 120))
  const noOpacity = Math.max(0, Math.min(1, -dragOffset / 120))

  const exitTransform = exitDirection === 'right'
    ? 'translateX(120vw) rotate(30deg)'
    : exitDirection === 'left'
      ? 'translateX(-120vw) rotate(-30deg)'
      : undefined

  return (
    <div
      ref={cardRef}
      className="w-[340px] sm:w-[400px] select-none touch-none transition-transform"
      style={{
        transform: exitTransform ?? `translateX(${dragOffset}px) rotate(${rotation}deg)`,
        transition: exitTransform ? 'transform 0.4s ease-out' : dragRef.current ? 'none' : 'transform 0.3s ease-out',
        opacity: exitTransform ? 0 : 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="border-2 border-white/20 bg-black/80 backdrop-blur-md relative overflow-hidden">
        {/* YES/NO overlays */}
        <div
          className="absolute inset-0 bg-green-500/20 flex items-center justify-center transition-opacity"
          style={{ opacity: yesOpacity }}
        >
          <span className="text-6xl font-bold text-green-400 font-mono rotate-[-12deg] border-4 border-green-400 px-4 py-1">
            YES
          </span>
        </div>
        <div
          className="absolute inset-0 bg-red-500/20 flex items-center justify-center transition-opacity"
          style={{ opacity: noOpacity }}
        >
          <span className="text-6xl font-bold text-red-400 font-mono rotate-12 border-4 border-red-400 px-4 py-1">
            NO
          </span>
        </div>

        {/* Card content */}
        <div className="p-8 relative z-10">
          {/* Source badge */}
          <div className="flex items-center justify-between mb-6">
            <span className="px-2 py-1 bg-white/10 border border-white/20 font-mono text-xs text-white/50 uppercase">
              {price.source}
            </span>
            <span className={`font-mono text-sm font-bold ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>

          {/* Symbol */}
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-mono">
              {price.symbol !== '-' ? price.symbol : price.name.slice(0, 10)}
            </h2>
            <p className="text-sm text-white/40 font-mono mt-1 truncate">{price.name}</p>
          </div>

          {/* Price */}
          <div className="text-center mb-8">
            <span className="text-2xl font-bold text-white font-mono">
              {formatVal(value, price.source)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => onDecision('no')}
              className="flex-1 py-3 border-2 border-red-500/40 text-red-400 font-mono font-bold text-sm
                hover:bg-red-500/10 hover:border-red-500/60 transition-all active:scale-95"
            >
              NO &larr;
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-3 border border-white/20 text-white/30 font-mono text-xs
                hover:bg-white/5 hover:text-white/50 transition-all"
            >
              SKIP
            </button>
            <button
              type="button"
              onClick={() => onDecision('yes')}
              className="flex-1 py-3 border-2 border-green-500/40 text-green-400 font-mono font-bold text-sm
                hover:bg-green-500/10 hover:border-green-500/60 transition-all active:scale-95"
            >
              &rarr; YES
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HeroV3() {
  const { data, isLoading } = useMarketSnapshot()
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stars, setStars] = useState<Star[]>([])
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [speed, setSpeed] = useState(0)
  const lastDecisionTime = useRef(Date.now())
  const speedTimer = useRef<ReturnType<typeof setInterval>>(undefined)

  const prices = useMemo(() => data?.prices ?? [], [data?.prices])
  const currentPrice = prices[currentIndex] ?? null

  // Speed tracker — decisions per minute
  useEffect(() => {
    speedTimer.current = setInterval(() => {
      const elapsed = (Date.now() - lastDecisionTime.current) / 1000
      if (elapsed > 3) setSpeed(0)
    }, 1000)
    return () => clearInterval(speedTimer.current)
  }, [])

  const yesCount = useMemo(() => {
    let c = 0
    for (const v of decisions.values()) if (v === 'yes') c++
    return c
  }, [decisions])

  const noCount = useMemo(() => {
    let c = 0
    for (const v of decisions.values()) if (v === 'no') c++
    return c
  }, [decisions])

  const advance = useCallback(() => {
    setExitDirection(null)
    setCurrentIndex((i) => i + 1)
  }, [])

  const handleDecision = useCallback(
    (d: Decision) => {
      if (!currentPrice) return
      const key = `${currentPrice.source}:${currentPrice.assetId}`

      setDecisions((prev) => {
        const next = new Map(prev)
        next.set(key, d)
        return next
      })

      // Add star to constellation
      setStars((prev) => [
        ...prev,
        {
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
          y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600),
          size: 1.5 + Math.random() * 2,
          color: d === 'yes' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
          opacity: 0.5 + Math.random() * 0.5,
        },
      ])

      // Speed
      const now = Date.now()
      const gap = now - lastDecisionTime.current
      lastDecisionTime.current = now
      if (gap > 0 && gap < 10000) {
        setSpeed(Math.round(60000 / gap))
      }

      // Animate exit
      setExitDirection(d === 'yes' ? 'right' : 'left')
      setTimeout(advance, 300)
    },
    [currentPrice, advance],
  )

  const handleSkip = useCallback(() => {
    setCurrentIndex((i) => i + 1)
  }, [])

  const totalDecisions = decisions.size
  const progressPct = prices.length > 0 ? (currentIndex / prices.length) * 100 : 0

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden">
      <ConstellationBg stars={stars} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-white/60 hover:text-white font-mono text-sm">
            &larr; Back
          </Link>
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-green-400">{yesCount} Y</span>
            <span className="text-red-400">{noCount} N</span>
            <span className="text-white/30">|</span>
            <span className="text-white/40">{totalDecisions} decisions</span>
            {speed > 0 && (
              <span className="text-accent font-bold">{speed}/min</span>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Hero text */}
      <div className="relative z-10 pt-24 pb-4 text-center">
        <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tighter">
          THE <span className="text-accent">SIGNAL</span>
        </h1>
        <p className="text-base sm:text-lg text-white/50 mt-3 font-mono">
          Swipe through {prices.length > 0 ? prices.length.toLocaleString() : '10,000+'} markets &middot; Build your conviction &middot; Deploy
        </p>
        <div className="flex items-center justify-center gap-6 mt-3 font-mono text-xs text-white/30">
          <span>&larr; or N = NO</span>
          <span>&rarr; or Y = YES</span>
          <span>SPACE = SKIP</span>
          <span>Drag card to swipe</span>
        </div>
      </div>

      {/* Card area */}
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
        {isLoading ? (
          <div className="text-center font-mono">
            <div className="relative mb-6 mx-auto w-fit">
              <div className="w-16 h-16 border-2 border-white/10 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-accent rounded-full animate-spin" />
            </div>
            <p className="text-lg text-white/60">Loading markets...</p>
          </div>
        ) : currentPrice ? (
          <SwipeCard
            key={`${currentPrice.source}:${currentPrice.assetId}`}
            price={currentPrice}
            onDecision={handleDecision}
            onSkip={handleSkip}
            exitDirection={exitDirection}
          />
        ) : (
          <div className="text-center font-mono">
            <p className="text-2xl text-white/60 mb-4">All markets reviewed</p>
            <p className="text-sm text-white/30">
              {totalDecisions.toLocaleString()} decisions made across {prices.length.toLocaleString()} markets
            </p>
          </div>
        )}
      </div>

      {/* Market counter */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {totalDecisions > 0 && (
          <div className="bg-black/90 backdrop-blur-sm border-t border-white/10 px-4 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="font-mono text-sm">
                <span className="text-white/40">Market {(currentIndex + 1).toLocaleString()} of {prices.length.toLocaleString()}</span>
              </div>
              <button
                type="button"
                className="px-6 py-2.5 bg-accent text-white font-mono font-bold text-sm
                  shadow-[0_0_30px_rgba(196,0,0,0.4)] hover:shadow-[0_0_50px_rgba(196,0,0,0.6)]
                  hover:bg-red-700 transition-all"
              >
                Deploy Agent ({totalDecisions.toLocaleString()} positions) &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
