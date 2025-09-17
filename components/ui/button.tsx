"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transform-gpu",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.15)] dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_2px_4px_0_rgba(0,0,0,0.4)] border border-neutral-200 dark:border-neutral-800",
        primary:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] hover:from-blue-600 hover:to-blue-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_6px_0_rgba(0,0,0,0.2)] border border-blue-600 dark:border-blue-700",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] hover:from-red-600 hover:to-red-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_6px_0_rgba(0,0,0,0.2)] border border-red-600 dark:border-red-700",
        outline:
          "border-2 border-neutral-200 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100",
        secondary:
          "bg-gradient-to-b from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_4px_0_rgba(0,0,0,0.15)] dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_2px_4px_0_rgba(0,0,0,0.4)] border border-neutral-300 dark:border-neutral-700",
        ghost:
          "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100",
        link:
          "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline hover:text-blue-700 dark:hover:text-blue-300",
        accent:
          "bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] hover:from-purple-600 hover:to-purple-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_6px_0_rgba(0,0,0,0.2)] border border-purple-600 dark:border-purple-700",
        success:
          "bg-gradient-to-b from-green-500 to-green-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(0,0,0,0.1)] hover:from-green-600 hover:to-green-700 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_6px_0_rgba(0,0,0,0.2)] border border-green-600 dark:border-green-700",
      },
      size: {
        default: "h-10 px-5 py-2 min-h-[44px] sm:min-h-[40px]",
        sm: "h-8 rounded-lg px-3.5 text-xs min-h-[32px]",
        lg: "h-12 rounded-xl px-8 text-base min-h-[48px]",
        xl: "h-14 rounded-xl px-10 text-lg min-h-[56px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]",
        iconSm: "h-8 w-8 min-h-[32px] min-w-[32px]",
        iconLg: "h-12 w-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          "relative overflow-hidden group"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <span className={cn(
          "relative z-10 flex items-center justify-center",
          loading && "opacity-0"
        )}>
          {children}
        </span>

        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }