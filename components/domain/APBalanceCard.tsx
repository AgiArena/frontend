'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useBalance } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { INDEX_PROTOCOL, COLLATERAL_TOKEN_ADDRESS, COLLATERAL_SYMBOL, COLLATERAL_DECIMALS } from '@/lib/contracts/addresses'

// AP address from index-system.env
const AP_ADDRESS = '0x20A85a164C64B603037F647eb0E0aDeEce0BE5AC' as `0x${string}`

// ERC20 balanceOf ABI
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface TokenBalance {
  address: string
  symbol: string
  balance: bigint
  decimals: number
}

export function APBalanceCard() {
  const publicClient = usePublicClient()
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [apHealth, setApHealth] = useState<string | null>(null)

  // Fetch native balance
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: AP_ADDRESS,
  })

  // Check AP health endpoint
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('http://localhost:9100/health')
        if (res.ok) {
          const data = await res.json()
          setApHealth(data.status || 'unknown')
        } else {
          setApHealth('unhealthy')
        }
      } catch {
        setApHealth('offline')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  // Fetch token balances
  useEffect(() => {
    async function fetchTokenBalances() {
      if (!publicClient) return

      const tokens: TokenBalance[] = []

      // Check collateral token (WIND)
      try {
        const balance = await publicClient.readContract({
          address: COLLATERAL_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [AP_ADDRESS],
        })
        if (balance > 0n) {
          tokens.push({
            address: COLLATERAL_TOKEN_ADDRESS,
            symbol: COLLATERAL_SYMBOL,
            balance,
            decimals: COLLATERAL_DECIMALS,
          })
        }
      } catch (e) {
        console.warn('Failed to fetch collateral balance:', e)
      }

      // Check MockBitgetVault balance (if it's an ERC20)
      try {
        const balance = await publicClient.readContract({
          address: INDEX_PROTOCOL.mockBitgetVault,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [AP_ADDRESS],
        })
        if (balance > 0n) {
          tokens.push({
            address: INDEX_PROTOCOL.mockBitgetVault,
            symbol: 'VAULT',
            balance,
            decimals: 18,
          })
        }
      } catch {
        // Not an ERC20 or no balance
      }

      setTokenBalances(tokens)
      setLoading(false)
    }

    fetchTokenBalances()
    const interval = setInterval(fetchTokenBalances, 15000)
    return () => clearInterval(interval)
  }, [publicClient])

  // Refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchNative()
    }, 10000)
    return () => clearInterval(interval)
  }, [refetchNative])

  const healthColor = apHealth === 'healthy' ? 'text-green-400' : apHealth === 'offline' ? 'text-red-400' : 'text-yellow-400'
  const healthBg = apHealth === 'healthy' ? 'bg-green-500/20' : apHealth === 'offline' ? 'bg-red-500/20' : 'bg-yellow-500/20'

  return (
    <div className="bg-terminal-dark/50 border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">AP (Keeper) Status</h2>
        <span className={`text-xs px-2 py-1 rounded ${healthColor} ${healthBg}`}>
          {apHealth || 'checking...'}
        </span>
      </div>

      {/* AP Address */}
      <div className="text-xs text-white/40 mb-4 font-mono">
        Address: {AP_ADDRESS}
      </div>

      {/* Balances */}
      <div className="space-y-3">
        {/* Native Balance */}
        <div className="flex justify-between items-center p-3 bg-terminal rounded border border-white/10">
          <div>
            <p className="text-sm text-white/70">Native (Gas)</p>
            <p className="text-xs text-white/40">ETH</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">
              {nativeBalance ? parseFloat(formatEther(nativeBalance.value)).toFixed(4) : '...'}
            </p>
            <p className="text-xs text-white/40">{nativeBalance?.symbol || 'ETH'}</p>
          </div>
        </div>

        {/* Token Balances */}
        {loading ? (
          <div className="text-center py-4 text-white/50 text-sm">Loading token balances...</div>
        ) : tokenBalances.length === 0 ? (
          <div className="text-center py-4 text-white/50 text-sm">No token balances</div>
        ) : (
          tokenBalances.map(token => (
            <div key={token.address} className="flex justify-between items-center p-3 bg-terminal rounded border border-white/10">
              <div>
                <p className="text-sm text-white/70">{token.symbol}</p>
                <p className="text-xs text-white/40 truncate" style={{ maxWidth: '150px' }}>{token.address}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">
                  {parseFloat(formatUnits(token.balance, token.decimals)).toFixed(4)}
                </p>
                <p className="text-xs text-white/40">{token.symbol}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 mb-2">Fund AP for trading:</p>
        <div className="text-xs font-mono text-white/30 bg-black/30 p-2 rounded break-all">
          cast send {AP_ADDRESS} --value 1ether --rpc-url https://index.rpc.zeeve.net --private-key $KEY
        </div>
      </div>
    </div>
  )
}
