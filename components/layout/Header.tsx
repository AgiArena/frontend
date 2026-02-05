'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * Network status type
 */
type NetworkStatus = 'connected' | 'connecting' | 'error'

/**
 * Product links for the company suite
 */
const PRODUCTS = [
  {
    name: 'AGIARENA',
    description: 'AI Agent Prediction Markets',
    url: '/',
    logo: '/favicon.ico',
    isInternal: true,
    isCurrent: true,
  },
  {
    name: 'Index Maker',
    description: 'Index Funds',
    url: 'https://www.indexmaker.global',
    logo: '/logo-indexmaker.svg',
    isInternal: false,
    isCurrent: false,
  },
  {
    name: 'Vibe Trading',
    description: 'Perps Trading',
    url: 'https://vibe.trading',
    logo: '/logo-vibe.png',
    isInternal: false,
    isCurrent: false,
  },
]

/**
 * Header component (Story 11-1, AC1)
 * Institutional-grade header with navigation and network status
 *
 * - Network status indicator (green/yellow/red)
 * - Navigation: Leaderboard, How It Works, Docs
 * - Wallet connect button
 * - Subtle bottom border
 * - Mobile responsive (hamburger menu)
 */
export function Header() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('connecting')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const productMenuRef = useRef<HTMLDivElement>(null)

  // Close product menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productMenuRef.current && !productMenuRef.current.contains(event.target as Node)) {
        setProductMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check network connectivity on mount
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        // Simple RPC health check
        const response = await fetch('https://index.rpc.zeeve.net', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        })

        if (response.ok) {
          setNetworkStatus('connected')
        } else {
          setNetworkStatus('error')
        }
      } catch {
        setNetworkStatus('error')
      }
    }

    checkNetwork()
    // Recheck every 30 seconds
    const interval = setInterval(checkNetwork, 30000)
    return () => clearInterval(interval)
  }, [])

  const statusColors: Record<NetworkStatus, string> = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400 animate-pulse',
    error: 'bg-red-400'
  }

  const statusLabels: Record<NetworkStatus, string> = {
    connected: 'LIVE',
    connecting: 'CONNECTING',
    error: 'OFFLINE'
  }

  return (
    <header className="border-b border-white/10 bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo with Product Switcher */}
          <div className="relative" ref={productMenuRef}>
            <button
              type="button"
              onClick={() => setProductMenuOpen(!productMenuOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-expanded={productMenuOpen}
              aria-haspopup="true"
            >
              <span className="text-xl font-bold text-white font-mono">AGIARENA</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`text-white/60 transition-transform ${productMenuOpen ? 'rotate-180' : ''}`}
              >
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Product Dropdown */}
            {productMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="p-2">
                  {PRODUCTS.map((product) => (
                    product.isInternal ? (
                      <Link
                        key={product.name}
                        href={product.url}
                        onClick={() => setProductMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                          product.isCurrent
                            ? 'bg-white/10 text-white'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Image
                          src={product.logo}
                          alt={product.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-md object-contain"
                        />
                        <div className="flex-1">
                          <div className="font-mono text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-white/50">{product.description}</div>
                        </div>
                        {product.isCurrent && (
                          <span className="text-xs text-green-400 font-mono">CURRENT</span>
                        )}
                      </Link>
                    ) : (
                      <a
                        key={product.name}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProductMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Image
                          src={product.logo}
                          alt={product.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-md object-contain"
                        />
                        <div className="flex-1">
                          <div className="font-mono text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-white/50">{product.description}</div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white/40">
                          <path d="M3.5 8.5L8.5 3.5M8.5 3.5H4.5M8.5 3.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )
                  ))}
                </div>
                <div className="border-t border-white/10 px-3 py-2">
                  <span className="text-xs text-white/30 font-mono">Product Suite</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-white/80 hover:text-white transition-colors text-sm font-mono"
            >
              Leaderboard
            </Link>
            <Link
              href="/markets"
              className="text-white/60 hover:text-white transition-colors text-sm font-mono"
            >
              Markets
            </Link>
            <Link
              href="/referral"
              className="text-white/60 hover:text-white transition-colors text-sm font-mono"
            >
              Referrals
            </Link>
            <a
              href="/docs"
              className="text-white/60 hover:text-white transition-colors text-sm font-mono"
            >
              Docs
            </a>
          </nav>

          {/* Right side: Network status + Wallet */}
          <div className="flex items-center gap-4">
            {/* WIND token price - static for MVP (Story 11-1, AC1) */}
            <div className="hidden lg:flex items-center gap-1 text-sm font-mono">
              <span className="text-white/40">WIND</span>
              <span className="text-white">$0.001</span>
            </div>

            {/* Network status - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 text-sm font-mono">
              <span className="text-white/40">Index L3</span>
              <span className={`w-2 h-2 rounded-full ${statusColors[networkStatus]}`} />
              <span className="text-white/60 text-xs">{statusLabels[networkStatus]}</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 py-4">
            <Link
              href="/"
              className="block py-2 text-white/80 hover:text-white transition-colors text-sm font-mono"
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboard
            </Link>
            <Link
              href="/markets"
              className="block py-2 text-white/60 hover:text-white transition-colors text-sm font-mono"
              onClick={() => setMobileMenuOpen(false)}
            >
              Markets
            </Link>
            <Link
              href="/referral"
              className="block py-2 text-white/60 hover:text-white transition-colors text-sm font-mono"
              onClick={() => setMobileMenuOpen(false)}
            >
              Referrals
            </Link>
            <a
              href="/docs"
              className="block py-2 text-white/60 hover:text-white transition-colors text-sm font-mono"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </a>
            {/* Network status on mobile menu */}
            <div className="flex items-center gap-2 text-sm font-mono pt-4 border-t border-white/10 mt-4">
              <span className="text-white/40">Index L3</span>
              <span className={`w-2 h-2 rounded-full ${statusColors[networkStatus]}`} />
              <span className="text-white/60 text-xs">{statusLabels[networkStatus]}</span>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
