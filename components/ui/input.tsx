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
          "flex h-11 w-full rounded-lg text-sm transition-all duration-200",
          "bg-background text-foreground",
          "border border-input",
          "px-4 py-2",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          error && "border-destructive focus:ring-destructive focus:border-destructive",
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
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
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
