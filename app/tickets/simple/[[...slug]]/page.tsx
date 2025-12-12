'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect page for deprecated /tickets/simple/* routes
 * All requests to /tickets/simple or /tickets/simple/* will be redirected to /tickets
 */
export default function SimpleTicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tickets');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Mengalihkan ke halaman tiket...</p>
      </div>
    </div>
  );
}
