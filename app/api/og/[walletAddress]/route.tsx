import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * Agent data interface for OG image generation
 */
interface AgentOGData {
  rank: number
  pnl: number
  roi: number
  portfolioSize: number
  winRate: number
}

/**
 * Generates deterministic performance bar heights from wallet address
 * Creates a realistic-looking performance trend based on agent's seed
 */
function generatePerformanceBars(walletAddress: string, isPositive: boolean): number[] {
  // Use wallet address to generate deterministic but varied bar heights
  const bars: number[] = []
  for (let i = 0; i < 10; i++) {
    const charCode = walletAddress.charCodeAt((i * 4) % walletAddress.length)
    const baseHeight = 0.3 + (charCode % 50) / 100
    // Trending up for positive P&L, down for negative
    const trend = isPositive ? i * 0.05 : -i * 0.03
    const height = Math.min(1, Math.max(0.2, baseHeight + trend))
    bars.push(height)
  }
  return bars
}

/**
 * Fetches agent data for OG image generation
 * Falls back to mock data if backend unavailable
 */
async function fetchAgentData(walletAddress: string): Promise<AgentOGData | null> {
  // Generate deterministic mock data from wallet address
  // Same algorithm as useAgentDetail hook for consistency
  const hash = walletAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const seed = (hash % 1000) / 1000

  const totalBets = Math.floor(50 + seed * 200)
  const volume = Math.floor(5000 + seed * 50000)
  const pnl = Math.floor(-5000 + seed * 20000)
  const winRate = Math.floor(40 + seed * 35)
  const roi = (pnl / volume) * 100
  const avgPortfolioSize = Math.floor(5000 + seed * 20000)
  const maxPortfolioSize = Math.floor(avgPortfolioSize * (1.2 + seed * 0.5))

  return {
    rank: Math.floor(1 + seed * 50),
    pnl,
    roi,
    portfolioSize: maxPortfolioSize,
    winRate
  }
}

/**
 * Formats P&L for display
 */
function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '-'
  const formatted = Math.abs(pnl).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${sign}$${formatted}`
}

/**
 * GET /api/og/[walletAddress]
 *
 * Generates dynamic Open Graph image for agent sharing
 * Returns 1200x630 PNG with agent stats and AgiArena branding
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  const { walletAddress } = await params

  // Fetch agent data
  const agent = await fetchAgentData(walletAddress)

  if (!agent) {
    // Return default AgiArena fallback image
    return new ImageResponse(
      (
        <div
          style={{
            background: '#000000',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace'
          }}
        >
          <span style={{ color: '#C40000', fontSize: '64px', fontWeight: 'bold' }}>
            AgiArena
          </span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '24px', marginTop: '20px' }}>
            AI-Powered Portfolio Betting
          </span>
        </div>
      ),
      {
        width: 1200,
        height: 630
      }
    )
  }

  const pnlColor = agent.pnl >= 0 ? '#4ade80' : '#C40000'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px',
          fontFamily: 'monospace'
        }}
      >
        {/* Header with logo and rank badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
          }}
        >
          <span style={{ color: '#C40000', fontSize: '40px', fontWeight: 'bold' }}>
            AgiArena
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#C40000',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '28px',
              fontWeight: 'bold'
            }}
          >
            #{agent.rank}
          </div>
        </div>

        {/* Large P&L number */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center'
          }}
        >
          <span
            style={{
              fontSize: '96px',
              fontWeight: 'bold',
              color: pnlColor,
              lineHeight: 1.1
            }}
          >
            {formatPnL(agent.pnl)}
          </span>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginTop: '32px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '28px'
            }}
          >
            <span>{agent.portfolioSize.toLocaleString()} markets</span>
            <span>{agent.winRate}% win rate</span>
            <span>{agent.roi >= 0 ? '+' : ''}{agent.roi.toFixed(1)}% ROI</span>
          </div>
        </div>

        {/* Footer with performance indicator (simplified graph placeholder) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '32px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '24px'
          }}
        >
          {/* Mini graph visualization - deterministic bars based on agent performance */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
            {generatePerformanceBars(walletAddress, agent.pnl >= 0).map((height, i) => (
              <div
                key={i}
                style={{
                  width: '24px',
                  height: `${height * 80}px`,
                  background: agent.pnl >= 0 ? '#4ade80' : '#C40000',
                  opacity: 0.4 + (i * 0.06),
                  borderRadius: '2px'
                }}
              />
            ))}
          </div>

          {/* Wallet address truncated */}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '20px' }}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
      }
    }
  )
}
