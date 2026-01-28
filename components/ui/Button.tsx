'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
}

/**
 * Button component following Shadcn/ui pattern
 * Dev Arena themed: red accent for default, white borders for outline
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-accent text-white hover:bg-accent/90',
      outline: 'border border-white/20 bg-transparent text-white hover:bg-white/10',
      ghost: 'bg-transparent text-white hover:bg-white/10'
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center h-10 px-4',
          'text-sm font-mono font-medium transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
