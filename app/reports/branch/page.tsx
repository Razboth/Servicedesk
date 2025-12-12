'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * /reports/branch - Redirects to appropriate branch report based on user role
 *
 * - MANAGER: Redirects to /manager/reports (their branch reports)
 * - ADMIN/SUPER_ADMIN: Redirects to /reports/branch/detailed-performance (all branches)
 * - Others: Redirects to /reports
 */
export default function BranchReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const userRole = session.user?.role;

    // Redirect based on role
    switch (userRole) {
      case 'MANAGER':
        // Manager gets redirected to their branch-specific reports
        router.replace('/manager/reports');
        break;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        // Admins get redirected to the detailed performance report (all branches)
        router.replace('/reports/branch/detailed-performance');
        break;
      default:
        // Others get redirected to main reports page
        router.replace('/reports');
        break;
    }
  }, [session, status, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Mengalihkan ke laporan cabang...</p>
      </div>
    </div>
  );
}
