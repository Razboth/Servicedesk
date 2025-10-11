'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FloatingDockProps {
  items: Array<{
    title: string;
    icon: React.ReactNode;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  desktopClassName?: string;
  mobileClassName?: string;
}

export function FloatingDock({ items, desktopClassName, mobileClassName }: FloatingDockProps) {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
    </>
  );
}

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: FloatingDockProps['items'];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn('flex flex-col gap-1', className)}
    >
      {items.map((item, idx) => (
        <IconContainer mouseX={mouseX} key={idx} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  isActive,
}: {
  mouseX: any;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 60, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 60, 40]);

  const widthIconTransform = useTransform(distance, [-150, 0, 150], [20, 28, 20]);
  const heightIconTransform = useTransform(distance, [-150, 0, 150], [20, 28, 20]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthIconTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightIconTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const content = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      className={cn(
        'aspect-square rounded-lg flex items-center justify-center relative cursor-pointer transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
          : 'bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent'
      )}
    >
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
      {hovered && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="absolute left-full ml-2 px-2 py-1 whitespace-nowrap rounded-md bg-sidebar-accent text-sidebar-foreground text-xs font-medium shadow-lg z-50 pointer-events-none"
        >
          {title}
        </motion.div>
      )}
    </motion.div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
