/**
 * Telegram Verification Page
 *
 * Story 6-3: Frontend page for wallet-Telegram linking flow
 *
 * URL: /telegram/verify?code=XXXXXX
 *
 * Flow:
 * 1. User arrives from Telegram bot with verification code
 * 2. User connects wallet
 * 3. User signs verification message
 * 4. Wallet is linked to Telegram account
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useConnect, useDisconnect, useAccount } from 'wagmi'
import { useTelegramVerification } from '@/hooks/useTelegramVerification'

function TelegramVerifyContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { isConnected, address } = useAccount()

  const {
    status,
    error,
    telegramUserId,
    verify,
    reset,
    lookupCode,
  } = useTelegramVerification()

  const [codeValid, setCodeValid] = useState<boolean | null>(null)

  // Validate code on mount
  useEffect(() => {
    if (code) {
      lookupCode(code).then(info => {
        setCodeValid(!!info)
      })
    }
  }, [code, lookupCode])

  // Handle verification submission
  const handleVerify = async () => {
    if (!code) return
    await verify(code)
  }

  // No code provided
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="max-w-md w-full bg-primary border border rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Missing Verification Code
          </h1>
          <p className="text-secondary mb-6">
            Please use the link provided by the Telegram bot to verify your wallet.
          </p>
          <a
            href="https://t.me/AgiArenaBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent-hover text-primary font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Open Telegram Bot
          </a>
        </div>
      </div>
    )
  }

  // Invalid code
  if (codeValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="max-w-md w-full bg-primary border border-[#C40000]/50 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-[#C40000] mb-4">
            Invalid or Expired Code
          </h1>
          <p className="text-secondary mb-6">
            This verification code is invalid or has expired. Please request a new one from the Telegram bot.
          </p>
          <a
            href="https://t.me/AgiArenaBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent-hover text-primary font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Get New Code
          </a>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="max-w-md w-full bg-primary border border rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Wallet Linked!
          </h1>
          <p className="text-secondary mb-6">
            Your wallet has been successfully linked to your Telegram account.
            You'll now receive notifications for bet matches, settlements, and rank changes.
          </p>
          <p className="text-sm text-muted mb-6 font-mono">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <a
            href="https://t.me/AgiArenaBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent-hover text-primary font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Return to Telegram
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="max-w-md w-full bg-primary border border rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-semibold text-primary mb-2">
            Link Your Wallet
          </h1>
          <p className="text-secondary">
            Connect your wallet to receive Telegram notifications for your AgiArena agent.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {/* Step 1: Connect Wallet */}
          <div className={`flex items-start gap-3 ${isConnected ? 'opacity-50' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-black font-bold ${
              isConnected ? 'bg-accent' : 'bg-surface'
            }`}>
              {isConnected ? '✓' : '1'}
            </div>
            <div className="flex-grow">
              <h3 className="text-primary font-medium">Connect Wallet</h3>
              {!isConnected ? (
                <div className="mt-2 space-y-2">
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => connect({ connector })}
                      disabled={isConnecting}
                      className="w-full bg-hover hover:bg-hover text-primary py-2 px-4 rounded-lg transition-colors disabled:opacity-50 border border"
                    >
                      {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-primary font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={() => disconnect()}
                    className="text-sm text-secondary hover:text-primary transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Sign Message */}
          <div className={`flex items-start gap-3 ${!isConnected ? 'opacity-50' : ''}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-black font-bold bg-hover">
              2
            </div>
            <div className="flex-grow">
              <h3 className="text-primary font-medium">Sign Verification Message</h3>
              <p className="text-sm text-secondary mt-1">
                Sign a message to prove wallet ownership
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-[#C40000]/10 border border-[#C40000]/50 rounded-lg">
            <p className="text-[#C40000] text-sm">{error}</p>
            <button
              onClick={reset}
              className="mt-2 text-sm text-[#C40000] hover:text-[#C40000]/80 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={!isConnected || status === 'loading' || status === 'signing' || status === 'verifying'}
          className={`w-full py-4 rounded-lg font-semibold transition-all ${
            isConnected && status !== 'loading' && status !== 'signing' && status !== 'verifying'
              ? 'bg-accent hover:bg-accent-hover text-primary'
              : 'bg-hover text-secondary cursor-not-allowed'
          }`}
        >
          {status === 'loading' && 'Preparing...'}
          {status === 'signing' && 'Please sign in your wallet...'}
          {status === 'verifying' && 'Verifying...'}
          {(status === 'idle' || status === 'error') && (
            isConnected ? 'Sign & Verify' : 'Connect wallet first'
          )}
        </button>

        {/* Telegram User Info */}
        {telegramUserId && (
          <p className="mt-4 text-center text-sm text-muted">
            Linking to Telegram user ID: {telegramUserId}
          </p>
        )}

        {/* Code Display */}
        <p className="mt-4 text-center text-sm text-muted">
          Verification code: <code className="bg-hover px-2 py-1 rounded font-mono">{code}</code>
        </p>
      </div>
    </div>
  )
}

export default function TelegramVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-primary">Loading...</div>
      </div>
    }>
      <TelegramVerifyContent />
    </Suspense>
  )
}
