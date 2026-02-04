'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { INDEX_PROTOCOL } from '@/lib/contracts/addresses'
import { BRIDGE_PROXY_ABI } from '@/lib/contracts/index-protocol-abi'

// Sample assets for ITP creation (these are the mock asset addresses 1-627)
const SAMPLE_ASSETS = [
  { address: '0x0000000000000000000000000000000000000001', symbol: 'BTC' },
  { address: '0x0000000000000000000000000000000000000002', symbol: 'ETH' },
  { address: '0x0000000000000000000000000000000000000003', symbol: 'SOL' },
  { address: '0x0000000000000000000000000000000000000004', symbol: 'AVAX' },
  { address: '0x0000000000000000000000000000000000000005', symbol: 'MATIC' },
  { address: '0x0000000000000000000000000000000000000006', symbol: 'DOT' },
  { address: '0x0000000000000000000000000000000000000007', symbol: 'LINK' },
  { address: '0x0000000000000000000000000000000000000008', symbol: 'UNI' },
  { address: '0x0000000000000000000000000000000000000009', symbol: 'AAVE' },
  { address: '0x000000000000000000000000000000000000000a', symbol: 'SNX' },
]

interface AssetWeight {
  address: string
  symbol: string
  weight: number
}

export default function CreateItpPage() {
  const { address, isConnected } = useAccount()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<AssetWeight[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [txError, setTxError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash })

  // Read current nonce for display
  const { data: currentNonce } = useReadContract({
    address: INDEX_PROTOCOL.bridgeProxy,
    abi: BRIDGE_PROXY_ABI,
    functionName: 'nextCreationNonce',
  })

  const totalWeight = selectedAssets.reduce((sum, a) => sum + a.weight, 0)
  const isValidWeights = totalWeight === 100

  const filteredAssets = SAMPLE_ASSETS.filter(
    a => a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
         !selectedAssets.find(s => s.address === a.address)
  )

  const addAsset = (asset: { address: string; symbol: string }) => {
    if (selectedAssets.length >= 10) return
    setSelectedAssets([...selectedAssets, { ...asset, weight: 0 }])
  }

  const removeAsset = (address: string) => {
    setSelectedAssets(selectedAssets.filter(a => a.address !== address))
  }

  const updateWeight = (address: string, weight: number) => {
    setSelectedAssets(selectedAssets.map(a =>
      a.address === address ? { ...a, weight: Math.min(100, Math.max(0, weight)) } : a
    ))
  }

  const distributeEvenly = () => {
    if (selectedAssets.length === 0) return
    const evenWeight = Math.floor(100 / selectedAssets.length)
    const remainder = 100 - (evenWeight * selectedAssets.length)
    setSelectedAssets(selectedAssets.map((a, i) => ({
      ...a,
      weight: evenWeight + (i === 0 ? remainder : 0)
    })))
  }

  const handleSubmit = async () => {
    if (!isConnected || !name || !symbol || selectedAssets.length === 0 || !isValidWeights) {
      setTxError('Please fill in all fields and ensure weights sum to 100%')
      return
    }

    setTxError(null)

    // Convert weights to 1e18 scale (100% = 1e18)
    const weights = selectedAssets.map(a => BigInt(a.weight) * BigInt(1e16))
    const assets = selectedAssets.map(a => a.address as `0x${string}`)

    console.log('=== Creating ITP ===')
    console.log('Contract:', INDEX_PROTOCOL.bridgeProxy)
    console.log('Name:', name)
    console.log('Symbol:', symbol)
    console.log('Weights:', weights.map(w => w.toString()))
    console.log('Assets:', assets)

    try {
      writeContract({
        address: INDEX_PROTOCOL.bridgeProxy,
        abi: BRIDGE_PROXY_ABI,
        functionName: 'requestCreateItp',
        args: [name, symbol, weights, assets],
      })
    } catch (e: any) {
      console.error('Write contract error:', e)
      setTxError(e.message || 'Failed to submit transaction')
    }
  }

  // Update error state when writeError changes
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError)
      setTxError(writeError.message || 'Transaction failed')
    }
  }, [writeError])

  useEffect(() => {
    if (confirmError) {
      console.error('Confirmation error:', confirmError)
      setTxError(confirmError.message || 'Transaction confirmation failed')
    }
  }, [confirmError])

  return (
    <main className="min-h-screen bg-terminal flex flex-col">
      <Header />

      <div className="flex-1">
        <div className="max-w-2xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-accent mb-2">Create ITP</h1>
          <p className="text-white/70 mb-4">Create an Index Tracking Product with custom asset weights</p>

          {/* Contract Info */}
          <div className="text-xs text-white/40 mb-6 font-mono">
            BridgeProxy: {INDEX_PROTOCOL.bridgeProxy}
            {currentNonce !== undefined && ` | Next Nonce: ${currentNonce.toString()}`}
          </div>

          {!isConnected ? (
            <div className="bg-terminal-dark border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/70 mb-4">Connect your wallet to create an ITP</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ITP Name & Symbol */}
              <div className="bg-terminal-dark border border-white/10 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">ITP Name (max 32 chars)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 32))}
                    placeholder="e.g., DeFi Blue Chips"
                    className="w-full bg-terminal border border-white/20 rounded px-4 py-2 text-white focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Symbol (max 10 chars)</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="e.g., DEFI"
                    maxLength={10}
                    className="w-full bg-terminal border border-white/20 rounded px-4 py-2 text-white focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Asset Selection */}
              <div className="bg-terminal-dark border border-white/10 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Select Assets</h3>
                  <span className="text-sm text-white/50">{selectedAssets.length}/10 assets</span>
                </div>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full bg-terminal border border-white/20 rounded px-4 py-2 text-white mb-4 focus:border-accent focus:outline-none"
                />

                <div className="flex flex-wrap gap-2 mb-4">
                  {filteredAssets.slice(0, 8).map(asset => (
                    <button
                      key={asset.address}
                      onClick={() => addAsset(asset)}
                      className="px-3 py-1 bg-terminal border border-white/20 rounded text-sm text-white hover:border-accent transition-colors"
                    >
                      + {asset.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Assets & Weights */}
              {selectedAssets.length > 0 && (
                <div className="bg-terminal-dark border border-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Asset Weights</h3>
                    <button
                      onClick={distributeEvenly}
                      className="text-sm text-accent hover:text-accent/80"
                    >
                      Distribute Evenly
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedAssets.map(asset => (
                      <div key={asset.address} className="flex items-center gap-4">
                        <span className="w-16 text-white font-mono">{asset.symbol}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={asset.weight}
                          onChange={(e) => updateWeight(asset.address, Number(e.target.value))}
                          className="flex-1 accent-accent"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={asset.weight}
                          onChange={(e) => updateWeight(asset.address, Number(e.target.value))}
                          className="w-16 bg-terminal border border-white/20 rounded px-2 py-1 text-white text-center"
                        />
                        <span className="text-white/50">%</span>
                        <button
                          onClick={() => removeAsset(asset.address)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-4 pt-4 border-t border-white/10 flex justify-between ${isValidWeights ? 'text-green-400' : 'text-red-400'}`}>
                    <span>Total Weight:</span>
                    <span className="font-bold">{totalWeight}% {isValidWeights ? '✓' : '(must be 100%)'}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!name || !symbol || selectedAssets.length === 0 || !isValidWeights || isPending || isConfirming}
                className="w-full py-4 bg-accent text-terminal font-bold rounded-lg hover:bg-accent/90 disabled:bg-white/20 disabled:text-white/50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Waiting for wallet...' : isConfirming ? 'Confirming on chain...' : 'Create ITP Request'}
              </button>

              {/* Status Messages */}
              {txError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                  <p className="font-bold">Error</p>
                  <p className="text-sm mt-1 break-all">{txError}</p>
                </div>
              )}

              {hash && !isSuccess && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-yellow-400">
                  <p className="font-bold">Transaction Submitted</p>
                  <p className="text-sm mt-1 font-mono break-all">{hash}</p>
                </div>
              )}

              {isSuccess && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400">
                  <p className="font-bold">ITP Request Created!</p>
                  <p className="text-sm mt-1">Waiting for issuer consensus to complete the ITP creation...</p>
                  <p className="text-xs mt-2 font-mono break-all">Tx: {hash}</p>
                </div>
              )}

              {/* Debug Info */}
              <div className="text-xs text-white/30 p-2 bg-black/30 rounded font-mono">
                <p>Connected: {address}</p>
                <p>Chain: Index L3 (111222333)</p>
                <p>BridgeProxy: {INDEX_PROTOCOL.bridgeProxy}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
