"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const ModernDialog = DialogPrimitive.Root

const ModernDialogTrigger = DialogPrimitive.Trigger

const ModernDialogPortal = DialogPrimitive.Portal

const ModernDialogClose = DialogPrimitive.Close

const ModernDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/20 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ModernDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const ModernDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    variant?: "default" | "gradient"
    showIcon?: boolean
  }
>(({ className, children, variant = "default", showIcon = true, ...props }, ref) => (
  <ModernDialogPortal>
    <ModernDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-white/[0.95] dark:bg-gray-900/[0.95] backdrop-blur-xl shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full p-1 opacity-70 bg-white/20 hover:bg-white/30 dark:bg-gray-800/20 dark:hover:bg-gray-800/30 backdrop-blur-sm transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:scale-105">
        <X className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModernDialogPortal>
))
ModernDialogContent.displayName = DialogPrimitive.Content.displayName

const ModernDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "gradient"
    icon?: React.ReactNode
  }
>(({ className, variant = "default", icon, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative px-6 py-6 text-center sm:text-left",
      variant === "gradient" && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
      variant === "default" && "bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50",
      className
    )}
    {...props}
  >
    {variant === "gradient" && (
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-90" />
    )}
    <div className="relative flex items-center gap-3">
      {icon && (
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          variant === "gradient" ? "bg-white/20" : "bg-blue-100 dark:bg-blue-900/50"
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  </div>
))
ModernDialogHeader.displayName = "ModernDialogHeader"

const ModernDialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-6 space-y-4", className)}
    {...props}
  />
))
ModernDialogBody.displayName = "ModernDialogBody"

const ModernDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2",
      className
    )}
    {...props}
  />
))
ModernDialogFooter.displayName = "ModernDialogFooter"

const ModernDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-bold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
ModernDialogTitle.displayName = DialogPrimitive.Title.displayName

const ModernDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm opacity-90 mt-1", className)}
    {...props}
  />
))
ModernDialogDescription.displayName = DialogPrimitive.Description.displayName

// Progress Steps Component for Ticket Workflow
const ModernProgressSteps = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    steps: Array<{
      id: string
      label: string
      status: "completed" | "current" | "pending"
      icon?: React.ReactNode
      timestamp?: string
    }>
  }
>(({ className, steps, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30 border-b border-gray-200/50 dark:border-gray-700/50", className)}
    {...props}
  >
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                step.status === "completed" && "bg-green-500 text-white",
                step.status === "current" && "bg-blue-500 text-white animate-pulse",
                step.status === "pending" && "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              )}
            >
              {step.icon || (index + 1)}
            </div>
            <div className="mt-1 text-xs font-medium text-center">
              <div className={cn(
                "transition-colors",
                step.status === "completed" && "text-green-600 dark:text-green-400",
                step.status === "current" && "text-blue-600 dark:text-blue-400",
                step.status === "pending" && "text-gray-500 dark:text-gray-400"
              )}>
                {step.label}
              </div>
              {step.timestamp && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {step.timestamp}
                </div>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-2 transition-colors duration-300",
                index < steps.findIndex(s => s.status === "current") 
                  ? "bg-green-500" 
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  </div>
))
ModernProgressSteps.displayName = "ModernProgressSteps"

export {
  ModernDialog,
  ModernDialogPortal,
  ModernDialogOverlay,
  ModernDialogClose,
  ModernDialogTrigger,
  ModernDialogContent,
  ModernDialogHeader,
  ModernDialogBody,
  ModernDialogFooter,
  ModernDialogTitle,
  ModernDialogDescription,
  ModernProgressSteps,
}