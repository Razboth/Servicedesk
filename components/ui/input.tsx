import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, iconPosition = "left", ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg text-sm transition-all duration-200",
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-700",
          "px-3 py-2",
          "text-slate-900 dark:text-slate-100",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-950",
          error && "border-red-500 dark:border-red-400 focus:ring-red-500",
          icon && iconPosition === "left" && "pl-10",
          icon && iconPosition === "right" && "pr-10",
          "min-h-[44px] sm:min-h-[40px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (icon) {
      return (
        <div className="relative">
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500",
              iconPosition === "left" ? "left-3" : "right-3"
            )}
          >
            {icon}
          </div>
          {inputElement}
        </div>
      )
    }

    return inputElement
  }
)
Input.displayName = "Input"

export { Input }