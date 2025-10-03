import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.1)]",
        secondary:
          "bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-900 dark:text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.1)]",
        warning:
          "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_2px_4px_0_rgba(0,0,0,0.1)]",
        success:
          "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.1)]",
        outline:
          "border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50",
        ghost:
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
        purple:
          "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.1)]",
      },
      size: {
        default: "text-xs px-3 py-1",
        sm: "text-[10px] px-2 py-0.5",
        lg: "text-sm px-4 py-1.5",
      },
      shimmer: {
        true: "overflow-hidden relative",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shimmer: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
}

function Badge({
  className,
  variant,
  size,
  shimmer,
  pulse,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size, shimmer }),
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {children}
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
    </div>
  )
}

export { Badge, badgeVariants }