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
          "flex h-11 w-full rounded-xl text-sm transition-all duration-200",
          "bg-white dark:bg-neutral-900",
          "border-2 border-neutral-200 dark:border-neutral-700",
          "px-4 py-2",
          "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
          "focus:outline-none focus:border-blue-500 dark:focus:border-blue-400",
          "focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50 dark:disabled:bg-neutral-950",
          error && "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400",
          error && "focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] dark:focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
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
              "absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500",
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