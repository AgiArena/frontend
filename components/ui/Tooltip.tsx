'use client'

import { useState, useId } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  /** Position of tooltip relative to trigger */
  position?: 'top' | 'bottom'
}

/**
 * Reusable Tooltip component with Dev Arena styling
 * Black background, white text, monospace font
 * Accessible with proper ARIA attributes
 */
export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipId = useId()

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2'

  const arrowClasses = position === 'top'
    ? 'top-full -mt-1 border-t-white/20'
    : 'bottom-full -mb-1 border-b-white/20'

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <span
        aria-describedby={isVisible ? tooltipId : undefined}
        tabIndex={0}
        className="cursor-help"
      >
        {children}
      </span>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-black border border-white/20 text-white text-xs font-mono rounded whitespace-nowrap ${positionClasses}`}
        >
          {content}
          <div className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${arrowClasses}`} />
        </div>
      )}
    </div>
  )
}
