'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'pill' | 'outline'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-accent text-primary rounded-lg px-4 py-2.5 hover:bg-accent-hover font-medium',
      secondary: 'bg-surface border rounded-lg px-4 py-2.5 hover:border-hover text-primary',
      ghost: 'text-secondary hover:text-primary hover:bg-hover rounded-lg px-3 py-2',
      pill: 'rounded-full text-sm px-3 py-1.5',
      outline: 'border bg-transparent text-primary rounded-lg px-4 py-2.5 hover:bg-hover',
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center',
          'text-sm font-medium',
          'focus:outline-none focus:ring-1 focus:ring-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          'transition-colors duration-150',
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
