'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Props for AnimatedNumber component
 */
export interface AnimatedNumberProps {
  /** The target value to display and animate to */
  value: number
  /** Prefix to prepend to the formatted value (e.g., '$' for currency) */
  prefix?: string
  /** Suffix to append to the formatted value (e.g., '%' for percentage) */
  suffix?: string
  /** Number of decimal places (default: 2) */
  decimals?: number
  /** Animation duration in milliseconds (default: 1000ms) */
  duration?: number
  /** Custom format function - takes precedence over decimals */
  formatFn?: (val: number) => string
  /** Additional CSS classes */
  className?: string
  /** Disable animation (e.g., for reduced motion or mobile) */
  disabled?: boolean
}

/**
 * AnimatedNumber component
 *
 * Displays a number that smoothly animates when the value changes.
 * Uses requestAnimationFrame for 60fps animation with ease-out easing.
 *
 * AC3: P&L and rank numbers animate smoothly over specified duration
 *
 * @example
 * // Currency animation
 * <AnimatedNumber value={1234.56} prefix="$" decimals={2} />
 *
 * @example
 * // Integer animation (rank)
 * <AnimatedNumber value={5} decimals={0} duration={500} />
 *
 * @example
 * // Custom format function
 * <AnimatedNumber
 *   value={1000000}
 *   formatFn={(val) => val.toLocaleString()}
 * />
 */
export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 1000,
  formatFn,
  className,
  disabled = false
}: AnimatedNumberProps) {
  // Ensure value is a valid number, default to 0
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
  const [displayValue, setDisplayValue] = useState(safeValue)
  const previousValueRef = useRef(value)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    // Skip animation if disabled or same value
    if (disabled || safeValue === previousValueRef.current) {
      setDisplayValue(safeValue)
      previousValueRef.current = safeValue
      return
    }

    const startValue = previousValueRef.current
    const endValue = safeValue
    const diff = endValue - startValue
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + diff * easeOut

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        previousValueRef.current = safeValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [safeValue, duration, disabled])

  const formattedValue = formatFn
    ? formatFn(displayValue)
    : displayValue.toFixed(decimals)

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}
