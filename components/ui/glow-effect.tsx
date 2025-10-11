'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlowEffectProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowClassName?: string;
  containerClassName?: string;
}

export function GlowEffect({
  children,
  className,
  glowClassName,
  containerClassName,
  ...props
}: GlowEffectProps) {
  return (
    <div className={cn('relative group', containerClassName)} {...props}>
      <motion.div
        className={cn(
          'absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 dark:from-amber-600 dark:via-orange-600 dark:to-yellow-500 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300',
          glowClassName
        )}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />
      <div className={cn('relative', className)}>{children}</div>
    </div>
  );
}

export function PulseGlow({
  children,
  className,
  pulseClassName,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  pulseClassName?: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn('relative', containerClassName)}>
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full bg-emerald-400 dark:bg-emerald-500',
          pulseClassName
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 0.3, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div className={cn('relative', className)}>{children}</div>
    </div>
  );
}
