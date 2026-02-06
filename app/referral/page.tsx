'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WalletConnectButton } from '@/components/domain/WalletConnectButton'
import { useReferralStats } from '@/hooks/useReferralStats'
import { truncateAddress } from '@/lib/utils/address'
import { referralVaultAbi } from '@/lib/contracts/abi'
import { REFERRAL_VAULT_ADDRESS } from '@/lib/contracts/addresses'

/**
 * Referral Dashboard page
 * Story 7-1, Task 4.3
 *
 * Shows:
 * - User's referral link with copy button
 * - Referral stats (count, fees generated, rewards earned)
 * - Rewards table per epoch with claim button
 * - List of referred users
 */
export default function ReferralPage() {
  const { address, isConnected } = useAccount()
  const { stats, rewards, isLoading } = useReferralStats(address)
  const [copied, setCopied] = useState(false)
  const [copiedCli, setCopiedCli] = useState(false)
  const [claimingEpoch, setClaimingEpoch] = useState<number | null>(null)

  const { writeContract, data: claimHash } = useWriteContract()
  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  const referralLink = typeof window !== 'undefined' && address
    ? `${window.location.origin}/?ref=${address}`
    : ''

  const cliCommand = address ? `npx agiarena init --ref=${address}` : ''

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyCli = () => {
    if (cliCommand) {
      navigator.clipboard.writeText(cliCommand)
      setCopiedCli(true)
      setTimeout(() => setCopiedCli(false), 2000)
    }
  }

  const handleClaim = (epoch: number, amount: string) => {
    setClaimingEpoch(epoch)
    writeContract({
      address: REFERRAL_VAULT_ADDRESS,
      abi: referralVaultAbi,
      functionName: 'claim',
      args: [BigInt(epoch), parseEther(amount), []], // empty proof for now — admin must provide
    })
  }

  return (
    <div className="min-h-screen bg-primary text-primary flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold font-mono mb-8">Referral Program</h1>

        {!isConnected ? (
          <div className="text-center py-16">
            <p className="text-secondary font-mono mb-6">
              Connect your wallet to see your referral dashboard
            </p>
            <WalletConnectButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Referral Link */}
            <section className="border border rounded-lg p-6">
              <h2 className="text-lg font-mono font-semibold mb-4">Your Referral Links</h2>

              {/* CLI command (primary) */}
              <div className="mb-4">
                <label className="text-muted text-xs font-mono mb-1 block">CLI Command (share this)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={cliCommand}
                    className="flex-1 bg-zinc-900 border border rounded px-4 py-2 font-mono text-sm text-secondary"
                  />
                  <button
                    onClick={handleCopyCli}
                    className="px-4 py-2 border border text-primary hover:bg-hover transition-colors font-mono text-sm whitespace-nowrap"
                  >
                    {copiedCli ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Web link (secondary) */}
              <div>
                <label className="text-muted text-xs font-mono mb-1 block">Web Link</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-1 bg-zinc-900 border border rounded px-4 py-2 font-mono text-sm text-secondary"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 border border-hover text-secondary hover:bg-hover transition-colors font-mono text-sm whitespace-nowrap"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <p className="text-muted text-xs font-mono mt-3">
                When referred users bet, you earn 50% of protocol fees.
              </p>
            </section>

            {/* Stats Overview */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border rounded-lg p-4">
                <div className="text-muted text-xs font-mono mb-1">Total Referrals</div>
                <div className="text-2xl font-bold font-mono">
                  {isLoading ? '...' : stats?.referralCount ?? 0}
                </div>
              </div>
              <div className="border border rounded-lg p-4">
                <div className="text-muted text-xs font-mono mb-1">Fees Generated</div>
                <div className="text-2xl font-bold font-mono">
                  {isLoading ? '...' : stats?.totalFeeGenerated ?? '0'}
                  <span className="text-sm text-muted ml-1">WIND</span>
                </div>
              </div>
              <div className="border border rounded-lg p-4">
                <div className="text-muted text-xs font-mono mb-1">Total Rewards</div>
                <div className="text-2xl font-bold font-mono text-green">
                  {isLoading ? '...' : stats?.totalRewards ?? '0'}
                  <span className="text-sm text-muted ml-1">WIND</span>
                </div>
              </div>
            </section>

            {/* Rewards per Epoch */}
            {rewards && rewards.epochs.length > 0 && (
              <section className="border border rounded-lg p-6">
                <h2 className="text-lg font-mono font-semibold mb-4">Rewards by Epoch</h2>
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-muted border-b border">
                      <th className="text-left py-2">Epoch</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.epochs.map((epoch) => (
                      <tr key={epoch.epoch} className="border-b border">
                        <td className="py-2">{epoch.epoch}</td>
                        <td className="text-right py-2">{epoch.amount} WIND</td>
                        <td className="text-right py-2">
                          {epoch.claimed ? (
                            <span className="text-muted">Claimed</span>
                          ) : claimingEpoch === epoch.epoch && isClaimConfirming ? (
                            <span className="text-accent">Confirming...</span>
                          ) : claimingEpoch === epoch.epoch && isClaimConfirmed ? (
                            <span className="text-green">Claimed!</span>
                          ) : (
                            <button
                              onClick={() => handleClaim(epoch.epoch, epoch.amount)}
                              className="px-3 py-1 bg-green hover:bg-green text-primary text-xs font-mono rounded transition-colors"
                            >
                              Claim
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-primary/30 text-xs font-mono mt-3">
                  Claim rewards on-chain after admin posts merkle root for each epoch.
                </p>
              </section>
            )}

            {/* Referred Users */}
            {stats && stats.referrals.length > 0 && (
              <section className="border border rounded-lg p-6">
                <h2 className="text-lg font-mono font-semibold mb-4">Referred Users</h2>
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-muted border-b border">
                      <th className="text-left py-2">Address</th>
                      <th className="text-right py-2">Referred On</th>
                      <th className="text-right py-2">First Bet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.referrals.map((r) => (
                      <tr key={r.referred} className="border-b border">
                        <td className="py-2">{truncateAddress(r.referred as `0x${string}`)}</td>
                        <td className="text-right py-2 text-secondary">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-right py-2">
                          {r.firstBetId ? `#${r.firstBetId}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Empty state */}
            {!isLoading && stats && stats.referralCount === 0 && (
              <div className="text-center py-8 text-muted font-mono">
                No referrals yet. Share your link to start earning rewards.
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
