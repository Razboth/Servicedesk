import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  icon, 
  action,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-brown-900 dark:text-cream-200">
            {icon && (
              <span className="text-brown-600 dark:text-cream-300">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-brown-600 dark:text-cream-400">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}