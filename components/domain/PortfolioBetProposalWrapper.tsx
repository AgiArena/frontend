'use client'

import { PortfolioBetProposal, PortfolioBetProposalData } from './PortfolioBetProposal'
import { PortfolioPosition } from './PortfolioModal'

/**
 * Generate mock portfolio positions for testing
 * Creates 5247 market positions as specified in AC
 */
function generateMockPositions(): PortfolioPosition[] {
  const marketTitles = [
    'Will Bitcoin reach $100k by end of 2026?',
    'Will Ethereum merge to POS successfully?',
    'Will the Fed raise interest rates in Q1?',
    'Will SpaceX land on Mars by 2028?',
    'Will Apple release AR glasses in 2026?',
    'Will Tesla achieve full self-driving?',
    'Will GPT-5 be released in 2026?',
    'Will inflation drop below 3%?',
    'Will Democrats win the House?',
    'Will China invade Taiwan by 2027?',
    'Will there be a major cyber attack?',
    'Will oil prices exceed $100/barrel?',
    'Will the US enter a recession?',
    'Will a new COVID variant emerge?',
    'Will climate targets be met?',
    'Will nuclear fusion become viable?',
    'Will remote work remain dominant?',
    'Will crypto regulation pass?',
    'Will AI replace 10% of jobs?',
    'Will quantum computing advance significantly?'
  ]

  const positions: PortfolioPosition[] = []

  // Generate 5247 positions
  for (let i = 0; i < 5247; i++) {
    const titleIndex = i % marketTitles.length
    const marketId = `0x${(i + 1000000).toString(16).padStart(12, '0')}`

    positions.push({
      marketId,
      marketTitle: `${marketTitles[titleIndex]} (Market ${i + 1})`,
      position: Math.random() > 0.45 ? 'YES' : 'NO',
      currentPrice: Math.random() * 0.8 + 0.1, // 10% to 90%
      confidence: Math.random() > 0.3 ? Math.random() * 0.5 + 0.5 : undefined // 50% to 100%
    })
  }

  // Sort by confidence (highest first) for top positions display
  return positions.sort((a, b) => {
    const confA = a.confidence ?? 0
    const confB = b.confidence ?? 0
    return confB - confA
  })
}

/**
 * Generate mock portfolio JSON for testing
 */
function generateMockPortfolioJson(positions: PortfolioPosition[]): string {
  const portfolioData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    positions: positions.map((p) => ({
      marketId: p.marketId,
      position: p.position,
      confidence: p.confidence
    }))
  }
  return JSON.stringify(portfolioData)
}

/**
 * Wrapper component for PortfolioBetProposal with mock data
 * This allows the page to remain a server component while the proposal is client-side
 */
export function PortfolioBetProposalWrapper() {
  // Generate mock data
  const positions = generateMockPositions()
  const portfolioJson = generateMockPortfolioJson(positions)

  const mockProposal: PortfolioBetProposalData = {
    portfolioJson,
    positions,
    totalAmount: 100_000_000n, // $100.00 USDC (6 decimals)
    reasoning:
      "Based on comprehensive analysis of current market conditions, macroeconomic indicators, and historical patterns, this portfolio targets high-confidence predictions across 5,247 markets. The strategy focuses on political events (32%), technology milestones (28%), economic indicators (24%), and miscellaneous categories (16%). Expected ROI is projected at 15-25% based on historical model performance."
  }

  const handleBetPlaced = (txHash: string, betId: bigint) => {
    // Log bet placement for debugging and analytics
    // In production, this would also trigger state updates, refetch queries, etc.
    if (process.env.NODE_ENV === 'development') {
      console.log('Bet placed successfully:', { txHash, betId: betId.toString() })
    }
  }

  return (
    <PortfolioBetProposal proposal={mockProposal} onBetPlaced={handleBetPlaced} />
  )
}
