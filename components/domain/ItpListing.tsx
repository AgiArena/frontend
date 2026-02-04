'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import Link from 'next/link'
import { INDEX_PROTOCOL } from '@/lib/contracts/addresses'
import { BRIDGE_PROXY_ABI } from '@/lib/contracts/index-protocol-abi'

interface ItpInfo {
  nonce: number
  admin: string
  name: string
  symbol: string
  createdAt: number
  completed: boolean
}

export function ItpListing() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [itps, setItps] = useState<ItpInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read next nonce to know how many proposals exist
  const { data: nextNonce, refetch: refetchNonce } = useReadContract({
    address: INDEX_PROTOCOL.bridgeProxy,
    abi: BRIDGE_PROXY_ABI,
    functionName: 'nextCreationNonce',
  })

  // Fetch all pending creations
  useEffect(() => {
    async function fetchItps() {
      if (nextNonce === undefined || !publicClient) {
        setLoading(false)
        return
      }

      const nonceNum = Number(nextNonce)
      if (nonceNum === 0) {
        setItps([])
        setLoading(false)
        return
      }

      try {
        const fetchedItps: ItpInfo[] = []

        // Fetch the last 10 ITPs (or all if less than 10)
        const startNonce = Math.max(0, nonceNum - 10)
        for (let i = startNonce; i < nonceNum; i++) {
          try {
            const data = await publicClient.readContract({
              address: INDEX_PROTOCOL.bridgeProxy,
              abi: BRIDGE_PROXY_ABI,
              functionName: 'getPendingCreation',
              args: [BigInt(i)],
            }) as [string, string, string, bigint[], string[], bigint, boolean]

            if (data[0] !== '0x0000000000000000000000000000000000000000') {
              fetchedItps.push({
                nonce: i,
                admin: data[0],
                name: data[1],
                symbol: data[2],
                createdAt: Number(data[5]),
                completed: data[6],
              })
            }
          } catch (e) {
            console.warn(`Failed to fetch ITP ${i}:`, e)
          }
        }

        setItps(fetchedItps.reverse()) // Show newest first
        setError(null)
      } catch (e: any) {
        console.error('Failed to fetch ITPs:', e)
        setError(e.message || 'Failed to fetch ITPs')
      } finally {
        setLoading(false)
      }
    }

    fetchItps()
  }, [nextNonce, publicClient])

  // Refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchNonce()
    }, 10000)
    return () => clearInterval(interval)
  }, [refetchNonce])

  return (
    <div className="bg-terminal-dark/50 border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Index Tracking Products</h2>
          <p className="text-sm text-white/50">
            {nextNonce !== undefined ? `${nextNonce.toString()} proposals on-chain` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/create-itp"
          className="px-4 py-2 bg-accent text-terminal font-bold rounded hover:bg-accent/90 transition-colors"
        >
          + Create ITP
        </Link>
      </div>

      {/* Contract info */}
      <div className="text-xs text-white/30 mb-4 font-mono">
        BridgeProxy: {INDEX_PROTOCOL.bridgeProxy}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-white/50">Loading ITPs...</div>
      ) : itps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/50 mb-4">No ITPs created yet</p>
          <Link
            href="/create-itp"
            className="text-accent hover:text-accent/80"
          >
            Create the first ITP →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itps.map(itp => (
            <ItpCard key={itp.nonce} itp={itp} />
          ))}
        </div>
      )}
    </div>
  )
}

function ItpCard({ itp }: { itp: ItpInfo }) {
  const { isConnected } = useAccount()
  const [showDetails, setShowDetails] = useState(false)

  const statusColor = itp.completed ? 'text-green-400' : 'text-yellow-400'
  const statusBg = itp.completed ? 'bg-green-500/20' : 'bg-yellow-500/20'
  const statusText = itp.completed ? 'Completed' : 'Pending Consensus'

  const createdDate = new Date(itp.createdAt * 1000)
  const timeAgo = getTimeAgo(createdDate)

  return (
    <div className="bg-terminal-dark border border-white/10 rounded-lg p-4 hover:border-accent/50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{itp.name || `ITP #${itp.nonce}`}</h3>
          <p className="text-accent font-mono">${itp.symbol || 'N/A'}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColor} ${statusBg}`}>
          {statusText}
        </span>
      </div>

      <div className="text-sm text-white/50 mb-4 space-y-1">
        <p>Request #{itp.nonce}</p>
        <p className="truncate">Creator: {itp.admin.slice(0, 10)}...{itp.admin.slice(-8)}</p>
        <p>{timeAgo}</p>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-2 border border-white/20 rounded text-white/70 text-sm hover:border-white/40 transition-colors"
      >
        {showDetails ? 'Hide Details' : 'View Details'}
      </button>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-white/10 text-xs font-mono text-white/40 space-y-1">
          <p>Nonce: {itp.nonce}</p>
          <p>Admin: {itp.admin}</p>
          <p>Created: {createdDate.toISOString()}</p>
          <p>Completed: {itp.completed ? 'Yes' : 'No'}</p>
        </div>
      )}

      {itp.completed && (
        <button
          disabled={!isConnected}
          className="w-full mt-3 py-2 bg-accent text-terminal font-bold rounded hover:bg-accent/90 disabled:bg-white/20 disabled:text-white/50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected ? 'Connect Wallet' : 'Buy'}
        </button>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
