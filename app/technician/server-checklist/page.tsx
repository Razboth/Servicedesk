'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Server Checklist page - Redirects to /technician/shifts
 * Checklists are now integrated into the main shifts page
 */
export default function ServerChecklistPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the shifts page where checklists are now integrated
    router.replace('/technician/shifts');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Mengalihkan ke halaman Shift...</p>
      </div>
    </div>
  );
}
