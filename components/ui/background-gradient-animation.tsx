'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BackgroundGradientAnimationProps {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
}

export function BackgroundGradientAnimation({
  gradientBackgroundStart = 'rgb(249, 250, 251)',
  gradientBackgroundEnd = 'rgb(254, 243, 199)',
  firstColor = '251, 191, 36',
  secondColor = '249, 115, 22',
  thirdColor = '234, 179, 8',
  fourthColor = '251, 146, 60',
  fifthColor = '252, 211, 77',
  pointerColor = '249, 115, 22',
  size = '80%',
  blendingValue = 'hard-light',
  children,
  className,
  interactive = false,
  containerClassName,
}: BackgroundGradientAnimationProps) {
  const interactiveRef = React.useRef<HTMLDivElement>(null);
  const [curX, setCurX] = React.useState(0);
  const [curY, setCurY] = React.useState(0);
  const [tgX, setTgX] = React.useState(0);
  const [tgY, setTgY] = React.useState(0);

  React.useEffect(() => {
    if (interactive) {
      document.body.style.setProperty('--gradient-background-start', gradientBackgroundStart);
      document.body.style.setProperty('--gradient-background-end', gradientBackgroundEnd);
      document.body.style.setProperty('--first-color', firstColor);
      document.body.style.setProperty('--second-color', secondColor);
      document.body.style.setProperty('--third-color', thirdColor);
      document.body.style.setProperty('--fourth-color', fourthColor);
      document.body.style.setProperty('--fifth-color', fifthColor);
      document.body.style.setProperty('--pointer-color', pointerColor);
      document.body.style.setProperty('--size', size);
      document.body.style.setProperty('--blending-value', blendingValue);
    }
  }, [
    gradientBackgroundStart,
    gradientBackgroundEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    pointerColor,
    size,
    blendingValue,
    interactive,
  ]);

  React.useEffect(() => {
    if (!interactive) return;

    function move() {
      if (!interactiveRef.current) return;
      setCurX((curX + (tgX - curX) / 20));
      setCurY((curY + (tgY - curY) / 20));
      interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    }

    move();
  }, [tgX, tgY, curX, curY, interactive]);

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    }
  }, []);

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        containerClassName
      )}
      onMouseMove={interactive ? handleMouseMove : undefined}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn('absolute inset-0', className)}>
        <motion.div
          className="absolute"
          style={{
            background: `radial-gradient(circle at center, rgba(${firstColor}, 0.8) 0, rgba(${firstColor}, 0) 50%) no-repeat`,
            mixBlendMode: blendingValue as any,
            width: size,
            height: size,
            top: '10%',
            left: '10%',
            opacity: 0.7,
          }}
          animate={{
            top: ['10%', '20%', '10%'],
            left: ['10%', '20%', '10%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute"
          style={{
            background: `radial-gradient(circle at center, rgba(${secondColor}, 0.8) 0, rgba(${secondColor}, 0) 50%) no-repeat`,
            mixBlendMode: blendingValue as any,
            width: size,
            height: size,
            top: '50%',
            right: '10%',
            opacity: 0.7,
          }}
          animate={{
            top: ['50%', '60%', '50%'],
            right: ['10%', '20%', '10%'],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute"
          style={{
            background: `radial-gradient(circle at center, rgba(${thirdColor}, 0.8) 0, rgba(${thirdColor}, 0) 50%) no-repeat`,
            mixBlendMode: blendingValue as any,
            width: size,
            height: size,
            bottom: '10%',
            left: '30%',
            opacity: 0.7,
          }}
          animate={{
            bottom: ['10%', '20%', '10%'],
            left: ['30%', '40%', '30%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      {children}
    </div>
  );
}
