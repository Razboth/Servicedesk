'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  trend: {
    value: number;
    isUp: boolean;
  };
  icon: React.ElementType;
  color: string;
}

const statsData: StatCard[] = [
  {
    title: 'Total Tickets',
    value: '2,543',
    description: 'All time',
    trend: { value: 12.5, isUp: true },
    icon: TicketIcon,
    color: 'from-blue-500/10 to-blue-600/10 border-blue-500/20'
  },
  {
    title: 'Open Tickets',
    value: '145',
    description: 'Active now',
    trend: { value: 8.2, isUp: false },
    icon: AlertCircle,
    color: 'from-orange-500/10 to-orange-600/10 border-orange-500/20'
  },
  {
    title: 'Resolved Today',
    value: '89',
    description: 'Completed',
    trend: { value: 23.1, isUp: true },
    icon: CheckCircle,
    color: 'from-green-500/10 to-green-600/10 border-green-500/20'
  },
  {
    title: 'Avg Resolution',
    value: '3.2h',
    description: 'Response time',
    trend: { value: 15.3, isUp: true },
    icon: Clock,
    color: 'from-purple-500/10 to-purple-600/10 border-purple-500/20'
  }
];

export function ModernStatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index * 0.1,
            type: "spring",
            stiffness: 100
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card className={cn(
            "relative overflow-hidden bg-gradient-to-br backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
            stat.color
          )}>
            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/5" />
            <div className="absolute right-0 top-0 -mt-12 -mr-12 h-32 w-32 rounded-full bg-white/3" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className="rounded-lg bg-background/50 p-2 backdrop-blur-sm">
                <stat.icon className="h-4 w-4 text-foreground/70" />
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>

                <div className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1",
                  stat.trend.isUp
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  {stat.trend.isUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">
                    {stat.trend.value}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}