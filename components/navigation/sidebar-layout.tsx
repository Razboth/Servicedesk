'use client';

import { Sidebar } from './sidebar';
import { useSidebar } from '@/components/providers/sidebar-provider';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}