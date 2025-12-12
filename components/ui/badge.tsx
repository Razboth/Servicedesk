import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        warning:
          "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
        info:
          "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]",
        outline:
          "border border-border bg-transparent text-foreground",
        ghost:
          "bg-muted text-muted-foreground",
        // Soft variants for subtle emphasis
        "default-soft":
          "bg-primary/10 text-primary border border-primary/20",
        "destructive-soft":
          "bg-destructive/10 text-destructive border border-destructive/20",
        "warning-soft":
          "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.2)]",
        "success-soft":
          "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]",
        "info-soft":
          "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] border border-[hsl(var(--info)/0.2)]",
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
