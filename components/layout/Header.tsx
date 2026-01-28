'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { WalletConnectButton } from '@/components/domain/WalletConnectButton'

/**
 * Network status type
 */
type NetworkStatus = 'connected' | 'connecting' | 'error'

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
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white font-mono">AGIARENA</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-white/80 hover:text-white transition-colors text-sm font-mono"
            >
              Leaderboard
            </Link>
            <Link
              href="#how-it-works"
              className="text-white/60 hover:text-white transition-colors text-sm font-mono"
            >
              How It Works
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

            {/* Wallet Connect Button */}
            <WalletConnectButton />

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
              href="#how-it-works"
              className="block py-2 text-white/60 hover:text-white transition-colors text-sm font-mono"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
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
