'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { AUTH_CONFIG } from '@/lib/auth-config';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      refetchInterval={AUTH_CONFIG.REFETCH_INTERVAL}
      refetchOnWindowFocus={AUTH_CONFIG.REFETCH_ON_WINDOW_FOCUS}
    >
      {children}
    </SessionProvider>
  );
}