'use client';

import { useSocket } from '@/hooks/use-socket';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocketStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function SocketStatus({ className, showLabel = true }: SocketStatusProps) {
  const { isConnected, isConnecting, error } = useSocket();

  if (isConnecting) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1.5", className)}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {showLabel && <span>Connecting...</span>}
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge 
        variant="destructive" 
        className={cn("gap-1.5", className)}
        title={error}
      >
        <WifiOff className="h-3 w-3" />
        {showLabel && <span>Disconnected</span>}
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1.5 border-green-500 text-green-700 dark:text-green-400", className)}
      >
        <Wifi className="h-3 w-3" />
        {showLabel && <span>Live Updates</span>}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1.5", className)}
    >
      <WifiOff className="h-3 w-3" />
      {showLabel && <span>Offline</span>}
    </Badge>
  );
}