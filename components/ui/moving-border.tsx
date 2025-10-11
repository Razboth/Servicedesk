'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MovingBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  duration?: number;
  borderRadius?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
}

export function MovingBorder({
  children,
  duration = 2000,
  borderRadius = '1rem',
  className,
  containerClassName,
  borderClassName,
  as: Component = 'div',
  ...otherProps
}: MovingBorderProps) {
  return (
    <Component
      className={cn(
        'relative bg-transparent p-[1px] overflow-hidden',
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <motion.div
          className={cn(
            'h-[200%] w-[200%] absolute -left-1/2 -top-1/2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 dark:from-amber-600 dark:via-orange-600 dark:to-yellow-600',
            borderClassName
          )}
          style={{
            borderRadius: borderRadius,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <div
        className={cn(
          'relative bg-sidebar backdrop-blur-xl z-10',
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export function MovingBorderButton({
  children,
  duration = 2000,
  borderRadius = '0.75rem',
  className,
  containerClassName,
  borderClassName,
  ...otherProps
}: MovingBorderProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'relative bg-transparent p-[2px] overflow-hidden w-full',
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <motion.div
          className={cn(
            'h-[400%] w-[400%] absolute -left-[150%] -top-[150%] bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 dark:from-amber-600 dark:via-orange-600 dark:to-yellow-500 opacity-75',
            borderClassName
          )}
          style={{
            borderRadius: borderRadius,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <div
        className={cn(
          'relative bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/70 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/30 backdrop-blur-xl z-10',
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </button>
  );
}
