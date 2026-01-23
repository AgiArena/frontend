'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import type { BetRecord } from '@/hooks/useBetHistory'
import { useResolution, useResolutionVotes, formatScore, getScoreColorClass, formatTimeRemaining } from '@/hooks/useResolution'
import { useDisputeEligibility } from '@/hooks/useDisputeEligibility'
import { useKeeperStats } from '@/hooks/useKeeperStats'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { truncateAddress } from '@/lib/utils/address'
import { getAddressUrl, getTxUrl } from '@/lib/utils/basescan'
import { formatNumber, formatUsdcString } from '@/lib/utils/formatters'
import { RaiseDisputeModal } from './RaiseDisputeModal'

/**
 * Dispute resolution window duration in milliseconds (48 hours)
 */
const DISPUTE_RESOLUTION_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Score variance threshold in basis points for showing divergence warning
 */
const SCORE_VARIANCE_WARNING_THRESHOLD = 100

interface PortfolioResolutionProps {
  betId: string
  bet: BetRecord
}

/**
 * Keeper vote card subcomponent with stats
 */
interface KeeperVoteCardProps {
  keeperAddress: string
  score: number
  creatorWins: boolean
  votedAt: string
  txHash: string
}

function KeeperVoteCard({ keeperAddress, score, creatorWins, votedAt, txHash }: KeeperVoteCardProps) {
  const { stats, isLoading: statsLoading } = useKeeperStats({ address: keeperAddress })

  return (
    <div className="border border-white/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <a
          href={getAddressUrl(keeperAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-white hover:text-accent transition-colors"
        >
          {truncateAddress(keeperAddress)}
        </a>
        <span className={`text-sm font-mono font-bold ${getScoreColorClass(score)}`}>
          {formatScore(score)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60 font-mono">
          {creatorWins ? 'Creator Wins' : 'Matcher Wins'}
        </span>
        <a
          href={getTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white transition-colors font-mono"
        >
          {new Date(votedAt).toLocaleDateString()}
        </a>
      </div>
      {/* Keeper Stats */}
      {!statsLoading && stats && (
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-white/40 font-mono">
            Accuracy: {(stats.accuracyRate * 100).toFixed(1)}%
          </span>
          <span className="text-white/40 font-mono">
            {stats.totalVotes} votes
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Settlement details subcomponent
 */
interface SettlementDetailsProps {
  totalPot: string
  platformFee: string
  winnerPayout: string
  settlementTxHash: string | null
  winnerAddress: string | null
  loserAddress: string | null
  creatorWins: boolean | null
}

function SettlementDetails({
  totalPot,
  platformFee,
  winnerPayout,
  settlementTxHash,
  winnerAddress,
  loserAddress,
  creatorWins
}: SettlementDetailsProps) {
  const loserLoss = parseFloat(totalPot) - parseFloat(winnerPayout)

  return (
    <div className="border border-white/20 p-4 space-y-3">
      <h4 className="text-sm font-bold text-white font-mono">Settlement Details</h4>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60 font-mono">Total Pot</span>
          <span className="font-mono text-white">{formatUsdcString(totalPot)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60 font-mono">Platform Fee (0.1%)</span>
          <span className="font-mono text-white/80">{formatUsdcString(platformFee)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-white/10 pt-2">
          <span className="text-white font-mono font-bold">Winner Payout</span>
          <span className="font-mono text-white font-bold">{formatUsdcString(winnerPayout)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60 font-mono">Loser Loss</span>
          <span className="font-mono text-accent">{formatUsdcString(loserLoss.toFixed(6))}</span>
        </div>
      </div>

      {/* Winner/Loser addresses */}
      {winnerAddress && (
        <div className="pt-2 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/60 font-mono">Winner:</span>
            <a
              href={getAddressUrl(winnerAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-white hover:text-accent transition-colors"
            >
              {truncateAddress(winnerAddress)}
            </a>
            <span className="text-white/40 font-mono">
              ({creatorWins ? 'Creator' : 'Matcher'})
            </span>
          </div>
          {loserAddress && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/60 font-mono">Loser:</span>
              <a
                href={getAddressUrl(loserAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-white/80 hover:text-accent transition-colors"
              >
                {truncateAddress(loserAddress)}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Settlement transaction link */}
      {settlementTxHash && (
        <div className="pt-2">
          <a
            href={getTxUrl(settlementTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-white/60 hover:text-white transition-colors"
          >
            View Settlement Transaction ↗
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * Countdown timer component for dispute window
 */
interface CountdownTimerProps {
  timeRemainingFormatted: string
  isExpired: boolean
}

function CountdownTimer({ timeRemainingFormatted, isExpired }: CountdownTimerProps) {
  if (isExpired) {
    return (
      <span className="text-xs font-mono text-white/40">
        Dispute window closed
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-white/60">Dispute window:</span>
      <span className="text-sm font-mono text-white font-bold">{timeRemainingFormatted}</span>
    </div>
  )
}

/**
 * Pending dispute display with 48-hour countdown
 */
interface PendingDisputeProps {
  disputeRaisedAt: string
  disputerAddress: string | null
  disputeStake: string | null
  disputeReason: string | null
}

function PendingDispute({
  disputeRaisedAt,
  disputerAddress,
  disputeStake,
  disputeReason
}: PendingDisputeProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Calculate and update time remaining for 48-hour resolution window
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const raisedTime = new Date(disputeRaisedAt).getTime()
      const deadline = raisedTime + DISPUTE_RESOLUTION_WINDOW_MS
      return Math.max(0, deadline - Date.now())
    }

    setTimeRemaining(calculateTimeRemaining())

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [disputeRaisedAt])

  return (
    <div className="border border-accent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-mono">Dispute Pending</h4>
        <span className="px-2 py-1 text-xs font-bold font-mono bg-accent text-white">
          Under Review
        </span>
      </div>

      {/* 48-hour countdown */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60 font-mono">Resolution deadline:</span>
        <span className="text-sm font-mono text-white font-bold">
          {timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'Awaiting decision'}
        </span>
      </div>

      {disputerAddress && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60 font-mono">Disputer:</span>
          <a
            href={getAddressUrl(disputerAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-white hover:text-accent transition-colors"
          >
            {truncateAddress(disputerAddress)}
          </a>
        </div>
      )}

      {disputeStake && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60 font-mono">Stake at risk:</span>
          <span className="font-mono text-accent">{formatUsdcString(disputeStake)}</span>
        </div>
      )}

      {disputeReason && (
        <div className="pt-2 border-t border-white/10">
          <span className="text-xs text-white/60 font-mono block mb-1">Reason:</span>
          <p className="text-xs text-white/80">{disputeReason}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Dispute resolution outcome display
 */
interface DisputeOutcomeProps {
  outcomeChanged: boolean
  correctedScore: number | null
  disputeReason: string | null
  disputerAddress: string | null
  disputeStake: string | null
}

function DisputeOutcome({
  outcomeChanged,
  correctedScore,
  disputeReason,
  disputerAddress,
  disputeStake
}: DisputeOutcomeProps) {
  return (
    <div className="border border-accent/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white font-mono">Dispute Resolution</h4>
        <span className={`px-2 py-1 text-xs font-bold font-mono ${
          outcomeChanged
            ? 'bg-white text-black'
            : 'bg-accent text-white'
        }`}>
          {outcomeChanged ? 'Outcome Changed' : 'Stake Slashed'}
        </span>
      </div>

      {correctedScore !== null && outcomeChanged && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-mono">Corrected Score:</span>
          <span className={`text-sm font-mono font-bold ${getScoreColorClass(correctedScore)}`}>
            {formatScore(correctedScore)}
          </span>
        </div>
      )}

      {disputerAddress && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60 font-mono">Disputer:</span>
          <a
            href={getAddressUrl(disputerAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-white hover:text-accent transition-colors"
          >
            {truncateAddress(disputerAddress)}
          </a>
        </div>
      )}

      {disputeStake && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/60 font-mono">Stake:</span>
          <span className={`font-mono ${outcomeChanged ? 'text-white' : 'text-accent'}`}>
            {formatUsdcString(disputeStake)}
            {outcomeChanged ? ' (Returned + Reward)' : ' (Slashed)'}
          </span>
        </div>
      )}

      {disputeReason && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-white/80">{disputeReason}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Loading skeleton for resolution component
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 bg-white/10 rounded" />
      <div className="h-8 bg-white/10 rounded w-1/2" />
      <div className="h-24 bg-white/10 rounded" />
    </div>
  )
}

/**
 * Main PortfolioResolution component
 * Displays resolution data, keeper votes, settlement details, and dispute functionality
 */
export function PortfolioResolution({ betId, bet }: PortfolioResolutionProps) {
  const { address } = useAccount()
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false)

  const { resolution, isLoading } = useResolution({ betId })
  const { votes, isLoading: votesLoading } = useResolutionVotes({ betId })
  const disputeEligibility = useDisputeEligibility(resolution, bet, address)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  // No resolution data yet
  if (!resolution) {
    return (
      <div className="border border-white/10 p-4 text-center">
        <p className="text-sm text-white/60 font-mono">No resolution data available yet</p>
        <p className="text-xs text-white/40 font-mono mt-1">
          Keepers have not voted on this bet
        </p>
      </div>
    )
  }

  // Calculate score variance if we have multiple votes
  const scoreVariance = votes.length >= 2
    ? Math.abs(votes[0].aggregateScore - votes[1].aggregateScore)
    : 0

  return (
    <div className="space-y-4 border border-white/20 p-4">
      {/* Main Score Display */}
      <div className="text-center space-y-2">
        <div>
          <span className="text-xs text-white/60 font-mono block mb-1">
            Aggregate Portfolio Score
          </span>
          <span className={`text-4xl font-mono font-bold ${getScoreColorClass(resolution.avgScore)}`}>
            {formatScore(resolution.avgScore)}
          </span>
        </div>

        {/* Winner Badge */}
        {resolution.creatorWins !== null && resolution.consensusReached && (
          <div className="pt-2">
            <span className="px-3 py-1 bg-white text-black text-sm font-mono font-bold">
              {resolution.creatorWins ? 'Creator Wins' : 'Matcher Wins'}
            </span>
          </div>
        )}
      </div>

      {/* Portfolio Summary */}
      <div className="flex justify-center gap-6 py-3 border-t border-b border-white/10">
        <div className="text-center">
          <span className="text-xs text-white/60 font-mono block">Portfolio Size</span>
          <span className="text-sm font-mono text-white font-bold">
            {formatNumber(bet.portfolioSize)} markets
          </span>
        </div>
        <div className="text-center">
          <span className="text-xs text-white/60 font-mono block">Bet Amount</span>
          <span className="text-sm font-mono text-white font-bold">
            {formatUsdcString(bet.amount)}
          </span>
        </div>
        {resolution.settledAt && resolution.winnerAddress && (
          <div className="text-center">
            <span className="text-xs text-white/60 font-mono block">Outcome</span>
            {address && resolution.winnerAddress.toLowerCase() === address.toLowerCase() ? (
              <span className="text-sm font-mono text-white font-bold">
                Won {formatUsdcString(resolution.winnerPayout)}
              </span>
            ) : (
              <span className="text-sm font-mono text-accent font-bold">
                Lost {formatUsdcString(bet.amount)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Resolution Status Badge */}
      <div className="flex items-center justify-between">
        <StatusBadge status={resolution.status} />
        {resolution.consensusReached && !resolution.settledAt && !resolution.isDisputed && (
          <CountdownTimer
            timeRemainingFormatted={disputeEligibility.timeRemainingFormatted}
            isExpired={disputeEligibility.timeRemaining <= 0}
          />
        )}
      </div>

      {/* Keeper Votes Breakdown */}
      {votesLoading ? (
        <div className="text-center py-4">
          <span className="text-xs text-white/40 font-mono">Loading keeper votes...</span>
        </div>
      ) : votes.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60 font-mono">Keeper Votes</span>
            {scoreVariance > 0 && (
              <span className="text-xs font-mono text-white/40">
                Variance: {scoreVariance} bps
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {votes.map((vote) => (
              <KeeperVoteCard
                key={`${vote.betId}-${vote.keeperAddress}`}
                keeperAddress={vote.keeperAddress}
                score={vote.aggregateScore}
                creatorWins={vote.creatorWins}
                votedAt={vote.votedAt}
                txHash={vote.txHash}
              />
            ))}
          </div>
          {scoreVariance > SCORE_VARIANCE_WARNING_THRESHOLD && (
            <p className="text-xs text-accent font-mono">
              ⚠️ Significant score divergence between keepers
            </p>
          )}
        </div>
      ) : null}

      {/* Settlement Details - shown when consensus reached */}
      {resolution.consensusReached && (
        <SettlementDetails
          totalPot={resolution.totalPot}
          platformFee={resolution.platformFee}
          winnerPayout={resolution.winnerPayout}
          settlementTxHash={resolution.settlementTxHash}
          winnerAddress={resolution.winnerAddress}
          loserAddress={resolution.loserAddress}
          creatorWins={resolution.creatorWins}
        />
      )}

      {/* Pending Dispute - shown when dispute is raised but not yet resolved */}
      {resolution.isDisputed && !resolution.disputeResolvedAt && resolution.disputeRaisedAt && (
        <PendingDispute
          disputeRaisedAt={resolution.disputeRaisedAt}
          disputerAddress={resolution.disputerAddress}
          disputeStake={resolution.disputeStake}
          disputeReason={resolution.disputeReason}
        />
      )}

      {/* Dispute Outcome - shown when dispute is resolved */}
      {resolution.isDisputed && resolution.disputeResolvedAt && (
        <DisputeOutcome
          outcomeChanged={resolution.outcomeChanged ?? false}
          correctedScore={resolution.correctedScore}
          disputeReason={resolution.disputeReason}
          disputerAddress={resolution.disputerAddress}
          disputeStake={resolution.disputeStake}
        />
      )}

      {/* Raise Dispute Button */}
      {disputeEligibility.canDispute && (
        <button
          onClick={() => setIsDisputeModalOpen(true)}
          className="w-full px-4 py-2 border border-accent text-accent text-sm font-mono font-bold hover:bg-accent hover:text-white transition-colors"
        >
          Raise Dispute
        </button>
      )}

      {/* Dispute reason if can't dispute */}
      {!disputeEligibility.canDispute && disputeEligibility.reason && resolution.consensusReached && !resolution.isDisputed && !resolution.settledAt && (
        <p className="text-xs text-white/40 font-mono text-center">
          {disputeEligibility.reason}
        </p>
      )}

      {/* Dispute Modal */}
      <RaiseDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        betId={betId}
        timeRemaining={disputeEligibility.timeRemainingFormatted}
      />
    </div>
  )
}
