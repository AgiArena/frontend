'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  volume24h?: string | null
}

interface Building {
  id: string
  symbol: string
  name: string
  value: number
  changePct: number | null
  marketCap: number
  volume: number
  source: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  targetHeight: number
  color: string
  windows: { x: number; y: number; lit: boolean }[]
}

const SOURCE_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stocks: '#00D4AA',
  defi: '#627EEA',
  rates: '#FFD700',
  ecb: '#00BFFF',
  bls: '#FF69B4',
}

const DISTRICT_NAMES: Record<string, string> = {
  crypto: 'CRYPTO DISTRICT',
  stocks: 'WALL STREET',
  defi: 'DEFI VALLEY',
  rates: 'FED PLAZA',
  ecb: 'FOREX TOWER',
  bls: 'ECONOMIC CENTER',
}

function formatValue(v: number, source: string): string {
  if (source === 'rates' || source === 'bls') return `${v.toFixed(2)}%`
  if (source === 'ecb') return v.toFixed(4)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  if (v >= 1) return `$${v.toFixed(2)}`
  return `$${v.toFixed(4)}`
}

/**
 * THE CITY - A living financial metropolis
 * Each market is a building. Height = market cap. Windows light up based on volume.
 * Buildings grow/shrink in real-time. Full 3D isometric view.
 */
export default function MarketsCityPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buildingsRef = useRef<Building[]>([])
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [cameraAngle, setCameraAngle] = useState(0)
  const [isRotating, setIsRotating] = useState(true)
  const mouseRef = useRef({ x: 0, y: 0 })
  const timeRef = useRef(0)

  const { data: allPrices } = useQuery({
    queryKey: ['city-prices'],
    queryFn: async () => {
      const sources = ['crypto', 'stocks', 'defi', 'rates', 'ecb', 'bls']
      const results = await Promise.all(
        sources.map(async (source) => {
          const res = await fetch(`${API_URL}/api/market-prices?source=${source}&limit=100`)
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
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refetch for "live" updates
  })

  // Create buildings from market data
  useEffect(() => {
    if (!allPrices) return

    const newBuildings: Building[] = []
    const gridSize = 12
    const spacing = 50

    allPrices.forEach((sourceData, districtIndex) => {
      const districtOffsetX = (districtIndex % 3) * gridSize * spacing
      const districtOffsetZ = Math.floor(districtIndex / 3) * gridSize * spacing

      sourceData.prices.slice(0, 50).forEach((market, i) => {
        const row = Math.floor(i / 7)
        const col = i % 7
        const mc = market.marketCap ? parseFloat(market.marketCap) : parseFloat(market.value) * 1000000
        const vol = market.volume24h ? parseFloat(market.volume24h) : mc * 0.1
        const height = Math.max(20, Math.min(300, Math.log10(mc + 1) * 30))

        // Generate windows
        const windowRows = Math.floor(height / 15)
        const windowCols = 3
        const windows: { x: number; y: number; lit: boolean }[] = []
        for (let wy = 0; wy < windowRows; wy++) {
          for (let wx = 0; wx < windowCols; wx++) {
            windows.push({
              x: wx,
              y: wy,
              lit: Math.random() < 0.6 // 60% windows lit
            })
          }
        }

        newBuildings.push({
          id: `${market.source}-${market.assetId}`,
          symbol: market.symbol || market.name.slice(0, 4),
          name: market.name,
          value: parseFloat(market.value),
          changePct: market.changePct ? parseFloat(market.changePct) : null,
          marketCap: mc,
          volume: vol,
          source: market.source,
          x: districtOffsetX + col * spacing + (Math.random() - 0.5) * 10,
          z: districtOffsetZ + row * spacing + (Math.random() - 0.5) * 10,
          width: 25 + Math.random() * 15,
          depth: 25 + Math.random() * 15,
          height: 0, // Start at 0, animate up
          targetHeight: height,
          color: SOURCE_COLORS[market.source],
          windows
        })
      })
    })

    buildingsRef.current = newBuildings
  }, [allPrices])

  // Animation loop
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
    canvas.addEventListener('mousemove', handleMouseMove)

    // Isometric projection
    const isoProject = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const rotX = x * cos - z * sin
      const rotZ = x * sin + z * cos

      const isoX = (rotX - rotZ) * 0.7
      const isoY = (rotX + rotZ) * 0.35 - y

      return {
        x: canvas.width / 2 + isoX,
        y: canvas.height / 2 + isoY + 100
      }
    }

    const animate = () => {
      timeRef.current += 0.016
      const time = timeRef.current

      // Update camera angle
      if (isRotating) {
        setCameraAngle(prev => prev + 0.003)
      }
      const angle = cameraAngle

      // Sky gradient (night city)
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      skyGradient.addColorStop(0, '#0a0a1a')
      skyGradient.addColorStop(0.5, '#1a1a2e')
      skyGradient.addColorStop(1, '#16213e')
      ctx.fillStyle = skyGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      for (let i = 0; i < 100; i++) {
        const sx = (Math.sin(i * 123.456 + time * 0.1) * 0.5 + 0.5) * canvas.width
        const sy = (Math.cos(i * 789.012) * 0.3 + 0.1) * canvas.height
        const twinkle = Math.sin(time * 3 + i) * 0.5 + 0.5
        ctx.globalAlpha = twinkle * 0.5
        ctx.beginPath()
        ctx.arc(sx, sy, 1, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Sort buildings by depth for proper rendering
      const sortedBuildings = [...buildingsRef.current].sort((a, b) => {
        const aDepth = a.x * Math.sin(angle) + a.z * Math.cos(angle)
        const bDepth = b.x * Math.sin(angle) + b.z * Math.cos(angle)
        return aDepth - bDepth
      })

      let newHovered: Building | null = null

      sortedBuildings.forEach(building => {
        // Animate building height
        if (building.height < building.targetHeight) {
          building.height += (building.targetHeight - building.height) * 0.05
        }

        // Fluctuate height slightly based on "market activity"
        const fluctuation = Math.sin(time * 2 + building.x * 0.1) * 3
        const currentHeight = building.height + fluctuation

        // Get corners
        const baseCorners = [
          { x: building.x - building.width / 2, z: building.z - building.depth / 2 },
          { x: building.x + building.width / 2, z: building.z - building.depth / 2 },
          { x: building.x + building.width / 2, z: building.z + building.depth / 2 },
          { x: building.x - building.width / 2, z: building.z + building.depth / 2 },
        ]

        const topCorners = baseCorners.map(c => ({
          ...isoProject(c.x, currentHeight, c.z, angle)
        }))
        const bottomCorners = baseCorners.map(c => ({
          ...isoProject(c.x, 0, c.z, angle)
        }))

        // Check hover (simple bounding box)
        const centerTop = isoProject(building.x, currentHeight / 2, building.z, angle)
        const dx = mouseRef.current.x - centerTop.x
        const dy = mouseRef.current.y - centerTop.y
        const isHovered = Math.abs(dx) < building.width && Math.abs(dy) < currentHeight / 2

        if (isHovered) newHovered = building

        // Building color based on performance
        const isUp = building.changePct !== null && building.changePct >= 0
        const baseColor = isHovered ? '#ffffff' : building.color
        const darkColor = isHovered ? '#cccccc' : shadeColor(building.color, -30)
        const darkerColor = isHovered ? '#999999' : shadeColor(building.color, -50)

        // Draw left face
        ctx.beginPath()
        ctx.moveTo(bottomCorners[0].x, bottomCorners[0].y)
        ctx.lineTo(bottomCorners[3].x, bottomCorners[3].y)
        ctx.lineTo(topCorners[3].x, topCorners[3].y)
        ctx.lineTo(topCorners[0].x, topCorners[0].y)
        ctx.closePath()
        ctx.fillStyle = darkerColor
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.stroke()

        // Draw right face
        ctx.beginPath()
        ctx.moveTo(bottomCorners[3].x, bottomCorners[3].y)
        ctx.lineTo(bottomCorners[2].x, bottomCorners[2].y)
        ctx.lineTo(topCorners[2].x, topCorners[2].y)
        ctx.lineTo(topCorners[3].x, topCorners[3].y)
        ctx.closePath()
        ctx.fillStyle = darkColor
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.stroke()

        // Draw top face
        ctx.beginPath()
        ctx.moveTo(topCorners[0].x, topCorners[0].y)
        ctx.lineTo(topCorners[1].x, topCorners[1].y)
        ctx.lineTo(topCorners[2].x, topCorners[2].y)
        ctx.lineTo(topCorners[3].x, topCorners[3].y)
        ctx.closePath()
        ctx.fillStyle = baseColor
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.stroke()

        // Draw windows on front faces
        building.windows.forEach((win, wi) => {
          // Randomly toggle windows
          if (Math.random() < 0.005) win.lit = !win.lit

          const winY = 10 + win.y * 15
          const winX = -building.width / 3 + win.x * (building.width / 3)

          if (winY < currentHeight - 10) {
            const winPos = isoProject(building.x + winX, winY, building.z + building.depth / 2, angle)
            ctx.fillStyle = win.lit
              ? `rgba(255, 255, 200, ${0.6 + Math.sin(time * 5 + wi) * 0.2})`
              : 'rgba(50, 50, 80, 0.5)'
            ctx.fillRect(winPos.x - 2, winPos.y - 3, 4, 6)
          }
        })

        // Draw symbol on top of building if hovered
        if (isHovered) {
          const labelPos = isoProject(building.x, currentHeight + 20, building.z, angle)
          ctx.font = 'bold 14px monospace'
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText(building.symbol, labelPos.x, labelPos.y)
        }

        // Performance indicator (glow)
        if (building.changePct !== null) {
          const glowColor = isUp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
          const topCenter = isoProject(building.x, currentHeight, building.z, angle)
          const gradient = ctx.createRadialGradient(
            topCenter.x, topCenter.y, 0,
            topCenter.x, topCenter.y, 30
          )
          gradient.addColorStop(0, glowColor)
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(topCenter.x, topCenter.y, 30, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Draw ground plane hint
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      for (let i = -500; i <= 1500; i += 100) {
        const start = isoProject(i, 0, -500, angle)
        const end = isoProject(i, 0, 1500, angle)
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        const start2 = isoProject(-500, 0, i, angle)
        const end2 = isoProject(1500, 0, i, angle)
        ctx.beginPath()
        ctx.moveTo(start2.x, start2.y)
        ctx.lineTo(end2.x, end2.y)
        ctx.stroke()
      }

      setHoveredBuilding(newHovered)
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [cameraAngle, isRotating])

  // Helper to darken colors
  function shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, Math.min(255, (num >> 16) + amt))
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
    return `rgb(${R},${G},${B})`
  }

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-move" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
        <Link href="/" className="text-white/60 hover:text-white font-mono text-sm pointer-events-auto">
          ← Back
        </Link>
        <div className="text-right">
          <div className="text-accent font-mono font-bold text-2xl tracking-wider">MARKET CITY</div>
          <div className="text-white/40 font-mono text-xs">{totalCount.toLocaleString()} markets • Live</div>
        </div>
      </div>

      {/* District legend */}
      <div className="absolute top-24 right-6 z-20 pointer-events-none">
        {Object.entries(DISTRICT_NAMES).map(([key, name]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3" style={{ backgroundColor: SOURCE_COLORS[key] }} />
            <span className="text-white/60 font-mono text-xs">{name}</span>
          </div>
        ))}
      </div>

      {/* Center title */}
      <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none z-10">
        <div className="text-white/20 font-mono text-xs tracking-[0.5em]">FINANCIAL METROPOLIS</div>
        <div className="text-6xl md:text-8xl font-bold text-white/10 font-mono">
          {totalCount.toLocaleString()}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-20">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="bg-white/10 hover:bg-white/20 text-white font-mono px-4 py-2 transition-colors"
        >
          {isRotating ? '⏸ STOP' : '▶ ROTATE'}
        </button>
        <button
          onClick={() => setCameraAngle(prev => prev - 0.5)}
          className="bg-white/10 hover:bg-white/20 text-white font-mono px-4 py-2 transition-colors"
        >
          ← ROTATE
        </button>
        <button
          onClick={() => setCameraAngle(prev => prev + 0.5)}
          className="bg-white/10 hover:bg-white/20 text-white font-mono px-4 py-2 transition-colors"
        >
          ROTATE →
        </button>
        <Link
          href="/markets"
          className="bg-accent hover:bg-accent/80 text-white font-mono font-bold px-6 py-2 transition-colors"
        >
          EXPLORE →
        </Link>
      </div>

      {/* Hover tooltip */}
      {hoveredBuilding && (
        <div
          className="fixed z-50 bg-black/95 border-2 p-4 rounded-lg shadow-2xl min-w-[220px]"
          style={{
            left: Math.min(mouseRef.current.x + 20, window.innerWidth - 250),
            top: mouseRef.current.y - 20,
            borderColor: hoveredBuilding.color
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3" style={{ backgroundColor: hoveredBuilding.color }} />
            <span className="text-white/60 font-mono text-xs uppercase">
              {DISTRICT_NAMES[hoveredBuilding.source]}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{hoveredBuilding.symbol}</div>
          <div className="text-white/60 font-mono text-sm mb-3">{hoveredBuilding.name}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-white/40 font-mono text-xs">PRICE</div>
              <div className="text-white font-mono font-bold">
                {formatValue(hoveredBuilding.value, hoveredBuilding.source)}
              </div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-xs">24H</div>
              <div className={`font-mono font-bold ${
                hoveredBuilding.changePct !== null && hoveredBuilding.changePct >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {hoveredBuilding.changePct !== null
                  ? `${hoveredBuilding.changePct >= 0 ? '+' : ''}${hoveredBuilding.changePct.toFixed(2)}%`
                  : 'N/A'
                }
              </div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-xs">MCAP</div>
              <div className="text-white font-mono">{formatValue(hoveredBuilding.marketCap, 'crypto')}</div>
            </div>
            <div>
              <div className="text-white/40 font-mono text-xs">HEIGHT</div>
              <div className="text-white font-mono">{Math.round(hoveredBuilding.targetHeight)}m</div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
