'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Eye, EyeOff, Info, AlertCircle } from 'lucide-react';

export interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  showPasswordToggle?: boolean;
  floatingLabel?: boolean;
  animated?: boolean;
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({
    className,
    type,
    label,
    description,
    error,
    success,
    icon,
    rightIcon,
    onRightIconClick,
    showPasswordToggle,
    floatingLabel = false,
    animated = true,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const inputType = showPasswordToggle && type === 'password'
      ? (showPassword ? 'text' : 'password')
      : type;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const containerVariants = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 }
    };

    const iconVariants = {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      exit: { scale: 0, rotate: 180 }
    };

    const Wrapper = animated ? motion.div : 'div';

    return (
      <Wrapper
        className="relative w-full"
        initial={animated ? "initial" : undefined}
        animate={animated ? "animate" : undefined}
        variants={animated ? containerVariants : undefined}
        transition={animated ? { duration: 0.3, type: "spring", stiffness: 100 } : undefined}
      >
        {label && !floatingLabel && (
          <label className={cn(
            "block text-sm font-medium mb-1.5 transition-colors duration-200",
            isFocused && "text-primary",
            error && "text-red-500",
            success && "text-green-500"
          )}>
            {label}
          </label>
        )}

        {description && !floatingLabel && (
          <p className="text-xs text-muted-foreground mb-1.5">{description}</p>
        )}

        <div className="relative">
          {/* Input Container */}
          <div className={cn(
            "relative flex items-center rounded-lg border bg-background transition-all duration-200",
            isFocused && "border-primary ring-2 ring-primary/20",
            error && "border-red-500 ring-2 ring-red-500/20",
            success && "border-green-500 ring-2 ring-green-500/20",
            !isFocused && !error && !success && "hover:border-primary/50"
          )}>
            {/* Left Icon */}
            {icon && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="icon"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={iconVariants}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "absolute left-3 flex items-center justify-center transition-colors",
                    isFocused ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {icon}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Input Field */}
            <input
              type={inputType}
              className={cn(
                "flex h-10 w-full bg-transparent py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                icon && "pl-10",
                (rightIcon || showPasswordToggle || error || success) && "pr-10",
                floatingLabel && "pt-4",
                className
              )}
              ref={ref}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder={floatingLabel ? "" : props.placeholder}
              {...props}
            />

            {/* Floating Label */}
            {floatingLabel && label && (
              <label className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none",
                icon && "left-10",
                (isFocused || hasValue) ? [
                  "top-1 text-xs",
                  isFocused && "text-primary",
                  error && "text-red-500",
                  success && "text-green-500"
                ] : [
                  "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                ]
              )}>
                {label}
              </label>
            )}

            {/* Right Icons */}
            <div className="absolute right-3 flex items-center gap-1">
              {/* Password Toggle */}
              {showPasswordToggle && type === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "p-1 rounded-md transition-colors hover:bg-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {showPassword ? (
                      <motion.div
                        key="eye-off"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.15 }}
                      >
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="eye"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              )}

              {/* Custom Right Icon */}
              {rightIcon && !error && !success && (
                <button
                  type="button"
                  onClick={onRightIconClick}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    onRightIconClick && "hover:bg-muted cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                  disabled={!onRightIconClick}
                >
                  {rightIcon}
                </button>
              )}

              {/* Status Icons */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={iconVariants}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </motion.div>
                )}
                {success && !error && (
                  <motion.div
                    key="success"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={iconVariants}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Animated Underline */}
          {animated && (
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: isFocused ? '100%' : '0%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Error/Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </Wrapper>
    );
  }
);

ModernInput.displayName = 'ModernInput';

export { ModernInput };