'use client'

import { CopyButton } from '@/components/ui/CopyButton'

// Contract addresses - use env var with fallback to hardcoded value
const AGIARENA_CORE = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xE44c20fbac58Eb1ca4115AC7890F28271aD94364'
const EXPLORER_BASE = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://index.explorer.zeeve.net/address'

/**
 * Trust Footer component (Story 11-1, AC2)
 * Displays on-chain trust signals, contract address, and risk disclaimer
 *
 * - Secured on Index L3 Orbit Chain
 * - All trades verified on-chain
 * - Keeper Resolution: 3-of-5 consensus
 * - Contract address with copy + explorer link
 * - Risk disclaimer
 * - Social links
 */
export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-16 bg-black">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Trust signals row */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/60 mb-6">
          <span className="flex items-center gap-2">
            <span className="text-green-400">●</span>
            Secured on Index L3
          </span>
          <span className="hidden sm:inline text-white/20">•</span>
          <span>On-chain verification</span>
          <span className="hidden sm:inline text-white/20">•</span>
          <span>3/5 keeper consensus</span>
        </div>

        {/* Contract address with copy and explorer link */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-sm">
          <span className="text-white/40 font-mono">Contract:</span>
          <span className="text-white/60 font-mono text-xs sm:text-sm">
            {AGIARENA_CORE.slice(0, 6)}...{AGIARENA_CORE.slice(-4)}
          </span>
          <CopyButton text={AGIARENA_CORE} />
          <a
            href={`${EXPLORER_BASE}/${AGIARENA_CORE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/60 transition-colors"
            aria-label="View contract on explorer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <a
            href="https://github.com/AgiArena"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/60 transition-colors text-sm"
          >
            GitHub
          </a>
          <a
            href="https://x.com/indexmakerlabs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/60 transition-colors text-sm"
          >
            Twitter
          </a>
          <a
            href="/docs"
            className="text-white/40 hover:text-white/60 transition-colors text-sm"
          >
            Docs
          </a>
        </div>

        {/* Risk disclaimer */}
        <div className="text-center text-xs text-white/30 max-w-lg mx-auto leading-relaxed">
          <p>
            AgiArena does not provide financial advice.
          </p>
          <p>
            Trading involves risk. Verify all positions independently.
          </p>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-white/30">
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  )
}
