'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabProps {
  label: string
  value: string
  content: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

interface SmoothTabsProps {
  tabs: TabProps[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  tabClassName?: string
  contentClassName?: string
}

export function SmoothTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  tabClassName,
  contentClassName
}: SmoothTabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || tabs[0]?.value || '')
  const activeValue = controlledValue ?? internalValue
  const activeIndex = tabs.findIndex(tab => tab.value === activeValue)

  const handleTabChange = (value: string) => {
    if (!controlledValue) {
      setInternalValue(value)
    }
    onValueChange?.(value)
  }

  const activeTab = tabs.find(tab => tab.value === activeValue)

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg">
          {tabs.map((tab, index) => (
            <button
              key={tab.value}
              onClick={() => !tab.disabled && handleTabChange(tab.value)}
              disabled={tab.disabled}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "hover:text-foreground",
                activeValue === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground",
                tab.disabled && "opacity-50 cursor-not-allowed",
                tabClassName
              )}
            >
              {activeValue === tab.value && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-background shadow-sm rounded-md"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35
                  }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={cn("mt-4", contentClassName)}>
        <motion.div
          key={activeValue}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: 0.2,
            ease: "easeInOut"
          }}
        >
          {activeTab?.content}
        </motion.div>
      </div>
    </div>
  )
}

// Legacy compatibility layer for existing Tabs components
export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '')
  const activeValue = value ?? internalValue

  const handleValueChange = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
}>({
  value: '',
  onValueChange: () => {}
})

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  const { value } = React.useContext(TabsContext)
  const [indicatorStyle, setIndicatorStyle] = useState<{ width: number; height: number; left: number; top: number }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0
  })
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return

    const updateIndicator = () => {
      const activeTab = listRef.current?.querySelector('[data-state="active"]') as HTMLElement
      if (activeTab && listRef.current) {
        const listRect = listRef.current.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()

        setIndicatorStyle({
          width: tabRect.width,
          height: tabRect.height,
          left: tabRect.left - listRect.left,
          top: tabRect.top - listRect.top
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)

    // Use MutationObserver to detect changes
    const observer = new MutationObserver(updateIndicator)
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        attributeFilter: ['data-state'],
        subtree: true
      })
    }

    return () => {
      window.removeEventListener('resize', updateIndicator)
      observer.disconnect()
    }
  }, [value, children])

  // Detect if grid layout is being used
  const isGrid = className?.includes('grid')

  // Base classes - use flex for non-grid, avoid inline-flex for grid layouts
  const baseClasses = isGrid
    ? "relative h-auto items-center rounded-lg bg-muted/50 p-1 text-muted-foreground overflow-x-auto"
    : "relative inline-flex h-10 items-center justify-center rounded-lg bg-muted/50 p-1 text-muted-foreground overflow-x-auto"

  return (
    <div
      ref={listRef}
      className={cn(baseClasses, className)}
    >
      {indicatorStyle.width > 0 && (
        <motion.div
          className="absolute bg-background shadow-sm rounded-md"
          initial={false}
          animate={{
            width: indicatorStyle.width,
            height: indicatorStyle.height,
            x: indicatorStyle.left,
            y: indicatorStyle.top
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }}
          style={{ zIndex: 0 }}
        />
      )}
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  className,
  disabled,
  children
}: {
  value: string
  className?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext)
  const isActive = activeValue === value

  return (
    <button
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      data-state={isActive ? 'active' : 'inactive'}
      data-value={value}
      aria-selected={isActive}
      role="tab"
      className={cn(
        "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const { value: activeValue } = React.useContext(TabsContext)

  if (activeValue !== value) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.2,
        ease: "easeInOut"
      }}
      className={cn("mt-4", className)}
    >
      {children}
    </motion.div>
  )
}