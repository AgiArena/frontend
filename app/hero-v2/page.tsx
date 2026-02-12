'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useMarketSnapshotMeta } from '@/hooks/useMarketSnapshot'

// ---------------------------------------------------------------------------
// "THE CHALLENGE" — 60-second challenge: How many can YOU set?
// Timer counts down. Markets flash past one by one. User smashes YES/NO.
// At the end: "You did 47. Our AI agents cover 159,240. Every second."
// ---------------------------------------------------------------------------

const SAMPLE_MARKETS = [
  { symbol: 'BTC', name: 'Bitcoin', source: 'crypto', value: '$97,340' },
  { symbol: 'ETH', name: 'Ethereum', source: 'crypto', value: '$3,421' },
  { symbol: 'SOL', name: 'Solana', source: 'crypto', value: '$187.50' },
  { symbol: 'AAPL', name: 'Apple Inc.', source: 'stocks', value: '$198.11' },
  { symbol: 'TSLA', name: 'Tesla Inc.', source: 'stocks', value: '$412.30' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', source: 'stocks', value: '$721.05' },
  { symbol: 'paris:temp', name: 'Paris Temperature', source: 'weather', value: '12.3C' },
  { symbol: 'ETH TVL', name: 'Ethereum Total Value Locked', source: 'defi', value: '$62.1B' },
  { symbol: 'BTC $200K?', name: 'Will Bitcoin reach $200,000?', source: 'polymarket', value: '42%' },
  { symbol: 'DOGE', name: 'Dogecoin', source: 'crypto', value: '$0.1842' },
  { symbol: 'MSFT', name: 'Microsoft', source: 'stocks', value: '$415.60' },
  { symbol: 'tokyo:rain', name: 'Tokyo Rainfall', source: 'weather', value: '2.1mm' },
  { symbol: 'react', name: 'React npm downloads', source: 'npm', value: '24.1M' },
  { symbol: 'xQc', name: 'xQc Twitch viewers', source: 'twitch', value: '45.2K' },
  { symbol: 'rust:tokio', name: 'Tokio crate downloads', source: 'crates_io', value: '198M' },
  { symbol: 'NBA Finals', name: 'Who wins NBA Finals 2026?', source: 'polymarket', value: '31%' },
  { symbol: 'AVAX', name: 'Avalanche', source: 'crypto', value: '$38.20' },
  { symbol: 'UNI', name: 'Uniswap', source: 'defi', value: '$12.45' },
  { symbol: 'Fed Rate', name: 'Next Fed rate decision?', source: 'polymarket', value: '67%' },
  { symbol: 'AMZN', name: 'Amazon', source: 'stocks', value: '$185.20' },
  { symbol: 'london:wind', name: 'London Wind Speed', source: 'weather', value: '18km/h' },
  { symbol: 'one_piece', name: 'One Piece rating', source: 'anilist', value: '8.69' },
  { symbol: 'tf2:unusual', name: 'TF2 Unusual Hat', source: 'backpacktf', value: '$42.50' },
  { symbol: 'Dune 3', name: 'Dune 3 box office prediction', source: 'tmdb', value: '$680M' },
  { symbol: 'XRP', name: 'Ripple', source: 'crypto', value: '$2.41' },
  { symbol: 'GOOG', name: 'Alphabet Inc.', source: 'stocks', value: '$171.22' },
  { symbol: 'ADA', name: 'Cardano', source: 'crypto', value: '$0.642' },
  { symbol: 'nyc:pm25', name: 'NYC Air Quality PM2.5', source: 'weather', value: '8.2ug' },
  { symbol: 'AAVE', name: 'Aave Protocol', source: 'defi', value: '$142.10' },
  { symbol: 'shroud', name: 'shroud Twitch viewers', source: 'twitch', value: '12.8K' },
]

type Phase = 'intro' | 'challenge' | 'result'

const CHALLENGE_SECONDS = 30

const SOURCE_COLORS: Record<string, string> = {
  crypto: 'text-green-400 border-green-500/30',
  stocks: 'text-blue-400 border-blue-500/30',
  weather: 'text-cyan-400 border-cyan-500/30',
  polymarket: 'text-purple-400 border-purple-500/30',
  defi: 'text-yellow-400 border-yellow-500/30',
  twitch: 'text-violet-400 border-violet-500/30',
  npm: 'text-red-300 border-red-500/30',
  crates_io: 'text-orange-400 border-orange-500/30',
  anilist: 'text-blue-300 border-blue-500/30',
  backpacktf: 'text-amber-400 border-amber-500/30',
  tmdb: 'text-teal-400 border-teal-500/30',
}

export default function HeroV2() {
  const { data: meta } = useMarketSnapshotMeta()
  const [phase, setPhase] = useState<Phase>('intro')
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS)
  const [score, setScore] = useState(0)
  const [currentMarketIdx, setCurrentMarketIdx] = useState(0)
  const [lastAction, setLastAction] = useState<'yes' | 'no' | null>(null)
  const [streak, setStreak] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const totalAssets = meta?.totalAssets ?? 159240
  const currentMarket = SAMPLE_MARKETS[currentMarketIdx % SAMPLE_MARKETS.length]

  // Keyboard controls during challenge
  useEffect(() => {
    if (phase !== 'challenge') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'y' || e.key === 'Y') {
        handleVote('yes')
      } else if (e.key === 'ArrowLeft' || e.key === 'n' || e.key === 'N') {
        handleVote('no')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const startChallenge = useCallback(() => {
    setPhase('challenge')
    setScore(0)
    setTimeLeft(CHALLENGE_SECONDS)
    setCurrentMarketIdx(0)
    setStreak(0)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setPhase('result')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const handleVote = useCallback((type: 'yes' | 'no') => {
    if (phase !== 'challenge') return
    setScore(s => s + 1)
    setLastAction(type)
    setStreak(s => s + 1)
    setCurrentMarketIdx(i => i + 1)
    setTimeout(() => setLastAction(null), 150)
  }, [phase])

  const ratePerHour = score > 0 ? Math.round(score * (3600 / CHALLENGE_SECONDS)) : 0
  const hoursToFinish = ratePerHour > 0 ? (totalAssets / ratePerHour).toFixed(1) : '???'
  const aiAdvantage = score > 0 ? Math.round(totalAssets / score) : totalAssets

  return (
    <main className="min-h-screen bg-terminal relative overflow-hidden select-none">
      {/* Back link */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="text-white/40 hover:text-white font-mono text-sm">
          &larr; Back
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4">

        {/* INTRO PHASE */}
        {phase === 'intro' && (
          <div className="text-center space-y-8">
            <div>
              <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tighter font-mono">
                THE <span className="text-accent">CHALLENGE</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/50 font-mono mt-4">
                {totalAssets.toLocaleString()} markets are live right now.
              </p>
              <p className="text-base text-white/30 font-mono mt-2">
                How many can <span className="text-white/70">you</span> set in {CHALLENGE_SECONDS} seconds?
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-white/40 font-mono">
                Smash YES or NO as fast as you can. Arrow keys or Y/N.
              </p>
              <button
                type="button"
                onClick={startChallenge}
                className="px-10 py-4 bg-accent text-white font-mono font-bold text-xl
                  shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_60px_rgba(196,0,0,0.7)]
                  hover:bg-red-700 transition-all"
              >
                START
              </button>
            </div>

            {/* Source preview */}
            <div className="max-w-2xl mx-auto">
              <p className="text-xs text-white/20 font-mono mb-3">Markets from:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(meta?.assetCounts ?? {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([source, count]) => (
                    <span key={source} className="px-2 py-1 bg-white/[0.03] border border-white/[0.08] font-mono text-[10px] text-white/30">
                      {source}: {(count as number).toLocaleString()}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* CHALLENGE PHASE */}
        {phase === 'challenge' && (
          <div className="w-full max-w-lg space-y-6">
            {/* Timer + Score header */}
            <div className="flex items-center justify-between font-mono">
              <div className="text-4xl sm:text-5xl font-bold tabular-nums"
                style={{ color: timeLeft <= 5 ? '#C40000' : timeLeft <= 10 ? '#facc15' : '#ffffff' }}>
                {timeLeft}s
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{score}</div>
                <div className="text-xs text-white/30">of {totalAssets.toLocaleString()}</div>
              </div>
            </div>

            {/* Progress bar (hilariously tiny) */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-200 rounded-full"
                style={{ width: `${Math.max(0.05, (score / totalAssets) * 100)}%` }}
              />
            </div>
            <p className="text-center text-[10px] text-white/20 font-mono">
              {((score / totalAssets) * 100).toFixed(4)}% complete
            </p>

            {/* Current market card */}
            <div className={`
              border-2 bg-black/80 p-8 transition-all duration-100
              ${lastAction === 'yes' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                : lastAction === 'no' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                : 'border-white/20'
              }
            `}>
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-1 border font-mono text-xs uppercase ${SOURCE_COLORS[currentMarket.source] || 'text-white/40 border-white/20'}`}>
                  {currentMarket.source}
                </span>
                {streak > 3 && (
                  <span className="text-accent font-mono text-sm font-bold">{streak}x streak</span>
                )}
              </div>
              <div className="text-center mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-mono">{currentMarket.symbol}</h2>
                <p className="text-sm text-white/40 font-mono mt-1">{currentMarket.name}</p>
                <p className="text-lg text-white/60 font-mono mt-2">{currentMarket.value}</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleVote('no')}
                  className="flex-1 py-4 border-2 border-red-500/40 text-red-400 font-mono font-bold text-xl
                    hover:bg-red-500/10 hover:border-red-500 transition-all active:scale-95 active:bg-red-500/20"
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={() => handleVote('yes')}
                  className="flex-1 py-4 border-2 border-green-500/40 text-green-400 font-mono font-bold text-xl
                    hover:bg-green-500/10 hover:border-green-500 transition-all active:scale-95 active:bg-green-500/20"
                >
                  YES
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-white/20 font-mono">
              &larr; N = NO &middot; Y &rarr; = YES
            </p>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && (
          <div className="text-center space-y-8 max-w-2xl">
            {/* User's score */}
            <div className="space-y-2">
              <p className="text-white/40 font-mono text-sm">In {CHALLENGE_SECONDS} seconds, you set</p>
              <p className="text-6xl sm:text-8xl font-bold text-white font-mono tabular-nums">{score}</p>
              <p className="text-white/40 font-mono text-sm">markets</p>
            </div>

            {/* The punchline */}
            <div className="py-6 border-y border-white/10 space-y-4">
              <p className="text-lg text-white/50 font-mono">
                At this rate: <span className="text-white/70">{ratePerHour.toLocaleString()}/hour</span>
              </p>
              <p className="text-lg text-white/50 font-mono">
                To cover all {totalAssets.toLocaleString()} markets: <span className="text-accent font-bold">{hoursToFinish} hours</span>
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white font-mono mt-4">
                Our AI agents do it in <span className="text-accent">1 second.</span>
              </p>
              <p className="text-sm text-white/30 font-mono">
                {aiAdvantage}x faster. Across {Object.keys(meta?.assetCounts ?? {}).length} data sources. 24/7.
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <button
                type="button"
                className="px-10 py-4 bg-accent text-white font-mono font-bold text-lg
                  shadow-[0_0_40px_rgba(196,0,0,0.5)] hover:shadow-[0_0_80px_rgba(196,0,0,0.7)]
                  hover:bg-red-700 transition-all"
              >
                Deploy Your AI Agent &rarr;
              </button>
              <p className="text-xs text-white/20 font-mono">
                npx agiarena init &middot; Claude Code + WIND tokens
              </p>
              <button
                type="button"
                onClick={() => {
                  revealTriggered.current = false
                  startChallenge()
                }}
                className="text-sm text-white/30 hover:text-white/50 font-mono transition-all"
              >
                Try again?
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// Needed for the "Try again" reference (shared with v1 pattern but unused here)
const revealTriggered = { current: false }
