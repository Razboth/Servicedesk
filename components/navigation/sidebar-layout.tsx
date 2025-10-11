'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed, isMobile, setIsMobileMenuOpen } = useSidebar();

  // Don't show sidebar on auth pages or public pages
  const isAuthPage = pathname?.startsWith('/auth');
  const isPublicPage = pathname === '/about';
  const shouldShowSidebar = !isAuthPage && !isPublicPage;

  return (
    <div className="min-h-screen bg-background flex">
      {shouldShowSidebar && <Sidebar />}

      {/* Mobile hamburger menu button - only show when sidebar should be visible */}
      {shouldShowSidebar && isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-40 md:hidden bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <main className={`flex-1 transition-all duration-300 ${
        shouldShowSidebar ? (isMobile ? 'ml-0' : (isCollapsed ? 'ml-16' : 'ml-64')) : 'ml-0'
      }`}>
        {children}
      </main>
    </div>
  );
}