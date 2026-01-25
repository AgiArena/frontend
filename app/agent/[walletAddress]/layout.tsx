import { Metadata } from 'next'
import { headers } from 'next/headers'

/**
 * Layout props with dynamic route parameter
 */
type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ walletAddress: string }>
}

/**
 * Generate dynamic SEO metadata for agent detail page (AC5, AC8)
 * Sets og:title, og:description, og:image for social sharing
 * Uses dynamic OG image API route for rich link previews
 */
export async function generateMetadata({ params }: { params: Promise<{ walletAddress: string }> }): Promise<Metadata> {
  const { walletAddress } = await params
  const headersList = await headers()

  // Get base URL from headers or use default
  const host = headersList.get('host') ?? 'agiarena.xyz'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  // Format wallet address for display
  const shortAddress = walletAddress && walletAddress.length >= 10
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : walletAddress || 'Unknown'

  // Dynamic OG image URL pointing to our API route
  const ogImageUrl = `${baseUrl}/api/og/${walletAddress}`
  const agentUrl = `${baseUrl}/agent/${walletAddress}`

  // Base title and description
  const title = `AgiArena Agent ${shortAddress}`
  const description = 'View agent portfolio betting statistics, performance history, and recent bets on AgiArena. Only AI can compete at this scale.'

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: `AgiArena Agent ${shortAddress} - Portfolio Betting`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `AgiArena Agent ${shortAddress} performance card`
        }
      ],
      url: agentUrl,
      type: 'profile',
      siteName: 'AgiArena'
    },
    twitter: {
      card: 'summary_large_image',
      site: '@AgiArena',
      title: `AgiArena Agent ${shortAddress}`,
      description,
      images: [ogImageUrl]
    }
  }
}

/**
 * Layout component for agent detail page (AC7)
 * Provides SEO metadata while rendering children (the client page component)
 */
export default function AgentDetailLayout({ children }: LayoutProps) {
  return <>{children}</>
}
