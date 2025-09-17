"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "pills" | "bordered"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center",
      variant === "default" && "h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1.5",
      variant === "pills" && "gap-2",
      variant === "bordered" && "border-b border-neutral-200 dark:border-neutral-700 pb-0",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "default" | "pills" | "bordered"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      variant === "default" && [
        "rounded-lg",
        "data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900",
        "data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
        "data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100",
        "data-[state=inactive]:text-neutral-600 dark:data-[state=inactive]:text-neutral-400",
        "hover:text-neutral-900 dark:hover:text-neutral-100",
      ],
      variant === "pills" && [
        "rounded-full px-6",
        "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600",
        "data-[state=active]:text-white",
        "data-[state=active]:shadow-[0_4px_12px_rgba(59,130,246,0.3)]",
        "data-[state=inactive]:bg-neutral-100 dark:data-[state=inactive]:bg-neutral-800",
        "data-[state=inactive]:text-neutral-600 dark:data-[state=inactive]:text-neutral-400",
        "hover:bg-neutral-200 dark:hover:bg-neutral-700",
      ],
      variant === "bordered" && [
        "border-b-2 pb-3",
        "data-[state=active]:border-blue-500 dark:data-[state=active]:border-blue-400",
        "data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400",
        "data-[state=inactive]:border-transparent",
        "data-[state=inactive]:text-neutral-600 dark:data-[state=inactive]:text-neutral-400",
        "hover:text-neutral-900 dark:hover:text-neutral-100",
      ],
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2",
      "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }