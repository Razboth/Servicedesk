'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface IdleTimeoutContextType {
  resetTimer: () => void;
  isIdle: boolean;
}

const IdleTimeoutContext = createContext<IdleTimeoutContextType | null>(null);

interface IdleTimeoutProviderProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

// Configuration
const DEFAULT_TIMEOUT_MINUTES = 30; // 30 minutes of inactivity
const DEFAULT_WARNING_MINUTES = 5;   // Show warning 5 minutes before timeout

export function IdleTimeoutProvider({ 
  children, 
  timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
  warningMinutes = DEFAULT_WARNING_MINUTES
}: IdleTimeoutProviderProps) {
  const { data: session, status } = useSession();
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningMinutes * 60);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
    setShowWarning(false);
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Only set timers if user is authenticated
    if (session && status === 'authenticated') {
      // Set warning timer
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
        setCountdown(warningMinutes * 60);
        
        // Start countdown
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Time's up - sign out automatically
              handleSignOut();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, (timeoutMinutes - warningMinutes) * 60 * 1000);

      // Set final timeout
      timeoutRef.current = setTimeout(() => {
        handleSignOut();
      }, timeoutMinutes * 60 * 1000);
    }
  };

  const handleSignOut = async () => {
    setIsIdle(true);
    setShowWarning(false);
    
    // Clear all timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Sign out user
    await signOut({ 
      redirect: true, 
      callbackUrl: 'https://hd.bsg.id/auth/signin?message=Session expired due to inactivity' 
    });
  };

  const handleStaySignedIn = () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    resetTimer();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Only activate idle timeout if user is authenticated
    if (session && status === 'authenticated') {
      // Activity event listeners
      const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click'
      ];

      const activityHandler = () => {
        // Only reset timer if significant time has passed to avoid excessive resets
        const now = Date.now();
        if (now - lastActivityRef.current > 1000) { // 1 second threshold
          resetTimer();
        }
      };

      // Add event listeners
      events.forEach(event => {
        document.addEventListener(event, activityHandler, true);
      });

      // Start the initial timer
      resetTimer();

      // Cleanup
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, activityHandler, true);
        });
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }
  }, [session, status]);

  // Don't render provider if user is not authenticated
  if (!session || status !== 'authenticated') {
    return <>{children}</>;
  }

  return (
    <IdleTimeoutContext.Provider value={{ resetTimer, isIdle }}>
      {children}
      
      <AlertDialog open={showWarning} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <svg 
                className="h-6 w-6 text-yellow-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
              Session Timeout Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your session will expire in <strong>{formatTime(countdown)}</strong> due to inactivity.
              <br />
              <br />
              Click "Stay Signed In" to continue your session, or you will be automatically signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleSignOut}
              className="bg-gray-100 hover:bg-gray-200"
            >
              Sign Out Now
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStaySignedIn}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Stay Signed In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </IdleTimeoutContext.Provider>
  );
}

export const useIdleTimeout = () => {
  const context = useContext(IdleTimeoutContext);
  if (!context) {
    throw new Error('useIdleTimeout must be used within IdleTimeoutProvider');
  }
  return context;
};