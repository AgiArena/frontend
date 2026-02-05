'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { getBackendUrl } from '@/lib/contracts/addresses'

/**
 * Captures ?ref=0xABC URL parameter, stores in localStorage,
 * and auto-registers the referral relationship when wallet connects.
 *
 * Story 7-1, Task 4.1 + 4.2
 */
export function useReferralRegistration() {
  const { address, isConnected } = useAccount()
  const hasRegistered = useRef(false)

  // Capture ?ref= param on mount and store in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')

    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      localStorage.setItem('referrer', ref.toLowerCase())
      // Clean the URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  // Auto-register referral when wallet connects
  useEffect(() => {
    if (!isConnected || !address || hasRegistered.current) return
    if (typeof window === 'undefined') return

    const referrer = localStorage.getItem('referrer')
    if (!referrer) return
    if (referrer.toLowerCase() === address.toLowerCase()) return

    const register = async () => {
      try {
        const backendUrl = getBackendUrl()
        const response = await fetch(`${backendUrl}/api/referrals/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referrer: referrer.toLowerCase(),
            referred: address.toLowerCase(),
          }),
        })

        if (response.ok || response.status === 409) {
          // 201 = registered, 409 = already registered — both mean done
          localStorage.removeItem('referrer')
          hasRegistered.current = true
        }
      } catch {
        // Silently fail — will retry on next page load
      }
    }

    register()
  }, [isConnected, address])
}
