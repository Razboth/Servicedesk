import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean
    hoverable?: boolean
    glassy?: boolean
  }
>(({ className, gradient, hoverable, glassy, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-lg backdrop-blur-sm transition-all duration-300",
      !glassy && "bg-white dark:bg-slate-800",
      glassy && "bg-white/10 dark:bg-slate-900/10 backdrop-blur-xl",
      "border border-slate-200 dark:border-slate-700",
      "shadow-sm dark:shadow-lg",
      hoverable && "hover:shadow-md dark:hover:shadow-xl",
      hoverable && "hover:scale-[1.01] hover:-translate-y-0.5 cursor-pointer",
      gradient && "overflow-hidden",
      className
    )}
    {...props}
  >
    {gradient && (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 dark:from-blue-500/10 dark:to-blue-600/10 pointer-events-none" />
    )}
    {children}
  </div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    transparent?: boolean
  }
>(({ className, transparent, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      !transparent && "border-b border-slate-200 dark:border-slate-700",
      transparent && "pb-0",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    gradient?: boolean
  }
>(({ className, gradient, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      gradient && "bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent",
      !gradient && "text-slate-900 dark:text-slate-100",
      className
    )}
    {...props}
  >
    {children}
  </h3>
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-slate-500 dark:text-slate-400",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    transparent?: boolean
  }
>(({ className, transparent, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      !transparent && "border-t border-slate-200 dark:border-slate-700 pt-6",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}