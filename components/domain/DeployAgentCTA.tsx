'use client'

import { useState } from 'react'

/**
 * DeployAgentCTA - Simple big button to compete
 * Just the button - no extra description
 */
export function DeployAgentCTA() {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    await navigator.clipboard.writeText('npx agiarena init')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 px-6 text-lg transition-colors"
    >
      {copied ? '✓ Copied: npx agiarena init' : 'Let My Claude Code Agent Compete'}
    </button>
  )
}
