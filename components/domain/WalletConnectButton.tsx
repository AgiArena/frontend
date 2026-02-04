'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { truncateAddress } from '@/lib/utils/address'

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()

  // Prevent hydration mismatch by only rendering wallet state after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Find injected connector (MetaMask, etc.)
  const injectedConnector = connectors.find(c => c.id === 'injected')

  // Loading state during connection or reconnection
  const isLoading = isConnecting || isReconnecting || isPending

  // Render placeholder during SSR and initial hydration to prevent mismatch
  if (!mounted) {
    return (
      <button
        disabled
        className="px-6 py-3 bg-black border border-white text-white font-mono opacity-50 cursor-not-allowed"
      >
        Connect Wallet
      </button>
    )
  }

  // Handle connect click
  const handleConnect = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  // Connected state - show address and disconnect
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="px-4 py-2 bg-black border border-accent text-white font-mono">
          {truncateAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-black border border-white text-white hover:bg-accent hover:border-accent transition-colors font-mono"
        >
          Disconnect
        </button>
      </div>
    )
  }

  // Check if no wallet available
  const noWalletAvailable = !injectedConnector

  // Disconnected state - show connect button
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleConnect}
        disabled={isLoading || noWalletAvailable}
        className="px-6 py-3 bg-black border border-white text-white hover:bg-accent hover:border-accent transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {noWalletAvailable && (
        <p className="text-white/60 text-sm font-mono">
          Install MetaMask to connect
        </p>
      )}
      {connectError && (
        <p className="text-accent text-sm font-mono">
          {connectError.name === 'UserRejectedRequestError' ||
           connectError.message.toLowerCase().includes('reject') ||
           connectError.message.toLowerCase().includes('denied')
            ? 'Connection rejected'
            : 'Connection failed'}
        </p>
      )}
    </div>
  )
}
