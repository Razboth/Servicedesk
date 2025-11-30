'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { X, User, Settings, LogOut, Sun, Moon, Bell, Mail, Building2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getVersionString, APP_VERSION } from '@/lib/version';
import { NotificationInbox } from '@/components/notifications/notification-inbox';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getAvatarById } from '@/components/ui/avatar-presets';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications?unreadOnly=true&limit=0');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Don't render sidebar while loading or if not authenticated
  if (status === 'loading' || !session) return null;

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    // For exact matching of technician routes
    if (path === '/technician') {
      return pathname === '/technician';
    }
    if (path === '/technician/workbench') {
      return pathname === '/technician/workbench';
    }
    if (path === '/technician/inbox') {
      return pathname === '/technician/inbox';
    }
    if (path === '/technician/daily-tasks') {
      return pathname === '/technician/daily-tasks';
    }
    if (path === '/technician/shifts') {
      return pathname === '/technician/shifts';
    }
    // For other routes, use startsWith but ensure it's not a partial match
    return pathname === path || (pathname.startsWith(path + '/') && path !== '/technician');
  };

  const linkClass = (path: string) => `
    flex items-center ${isCollapsed ? 'px-3 py-4 justify-center' : 'px-3 py-2'} rounded-lg text-sm font-medium transition-all duration-200
    ${isActive(path)
      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }
    ${isCollapsed ? 'hover:scale-105' : ''}
  `;

  const iconClass = `${isCollapsed ? 'w-7 h-7' : 'w-5 h-5 mr-3'}`;

  // Handle mobile menu closure when clicking links
  const handleLinkClick = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        bg-sidebar shadow-lg border-r border-sidebar-border transition-all duration-300 h-screen fixed left-0 top-0 z-50 flex flex-col
        ${isMobile
          ? `w-64 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
          : `${isCollapsed ? 'w-20' : 'w-64'}`
        }
      `}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {(!isCollapsed || isMobile) ? (
            <Link href="/" className="flex items-center space-x-3" onClick={handleLinkClick}>
              <img 
                src="/logo-bsg.png" 
                alt="Bank SulutGo" 
                className="h-9 w-auto"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground">ServiceDesk</p>
                <p className="text-xs text-sidebar-foreground/70">IT Portal</p>
              </div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center justify-center w-full" onClick={handleLinkClick}>
              <img
                src="/BSG Logo.png"
                alt="BSG"
                className="h-14 w-14 object-contain"
              />
            </Link>
          )}
          
          {/* Desktop collapse button or Mobile close button */}
          {isMobile ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Common Links */}
        <div className="space-y-1">
          <Link href="/" className={linkClass('/')} onClick={handleLinkClick}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            {(!isCollapsed || isMobile) && 'Dashboard'}
          </Link>
          
          <Link href="/tickets" className={linkClass('/tickets')} onClick={handleLinkClick}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            {(!isCollapsed || isMobile) && 'Tickets'}
          </Link>
          
          <Link href="/reports" className={linkClass('/reports')} onClick={handleLinkClick}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {(!isCollapsed || isMobile) && 'Reports'}
          </Link>

          <Link href="/knowledge" className={linkClass('/knowledge')} onClick={handleLinkClick}>
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {(!isCollapsed || isMobile) && 'Knowledge Base'}
          </Link>
        </div>

        {/* Call Center Operations - For Call Center Users and Technicians */}
        {((session.user?.role === 'USER' && session.user?.supportGroupCode === 'CALL_CENTER') ||
          (session.user?.role === 'TECHNICIAN' && session.user?.supportGroupCode === 'CALL_CENTER')) && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Call Center</div>}
            <Link href="/tickets" className={linkClass('/tickets')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Tickets'}
            </Link>
            <Link href="/branch/atm-claims" className={linkClass('/branch/atm-claims')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {(!isCollapsed || isMobile) && 'ATM Claims'}
            </Link>
            {/* Workbench removed for Call Center technicians */}
          </div>
        )}

        {/* Branch Operations - For Managers, Users, and Regular Agents */}
        {(session.user?.role === 'MANAGER' || session.user?.role === 'USER' || 
          (session.user?.role === 'AGENT' && session.user?.supportGroupCode !== 'CALL_CENTER')) && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Branch Operations</div>}
            <Link href="/branch/atm-claims" className={linkClass('/branch/atm-claims')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {(!isCollapsed || isMobile) && 'ATM Claims'}
            </Link>
          </div>
        )}

        {/* Role-specific sections */}
        {session.user?.role === 'TECHNICIAN' && session.user?.supportGroupCode !== 'CALL_CENTER' && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Technician</div>}
            <Link href="/technician/workbench" className={linkClass('/technician/workbench')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v-2m0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13h10M7 17h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Workbench'}
            </Link>
            <Link href="/technician/daily-tasks" className={linkClass('/technician/daily-tasks')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {(!isCollapsed || isMobile) && 'Daily Task List'}
            </Link>
            <Link href="/technician/shifts" className={linkClass('/technician/shifts')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'My Shifts'}
            </Link>
            {/* PC Assets and License Management for TECH_SUPPORT group and SUPER_ADMIN */}
            {(session.user?.supportGroupCode === 'TECH_SUPPORT' || session.user?.role === 'SUPER_ADMIN') && (
              <>
                <Link href="/admin/pc-assets" className={linkClass('/admin/pc-assets')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'PC Assets'}
                </Link>
              </>
            )}
            <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Legacy Tickets'}
            </Link>
          </div>
        )}

        {(session.user?.role === 'MANAGER' || session.user?.role === 'MANAGER_IT') && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Manager</div>}
            <Link href="/manager/dashboard" className={linkClass('/manager/dashboard')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Manager Dashboard'}
            </Link>
            <Link href="/manager/approvals" className={linkClass('/manager/approvals')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Approvals'}
            </Link>
            <Link href="/manager/tickets" className={linkClass('/manager/tickets')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Branch Tickets'}
            </Link>
            <Link href="/manager/users" className={linkClass('/manager/users')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Users'}
            </Link>
            <Link href="/manager/atms" className={linkClass('/manager/atms')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'ATMs'}
            </Link>

            {/* Shift Management - Only for MANAGER_IT */}
            {session.user?.role === 'MANAGER_IT' && (
              <>
                {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">Shift Management</div>}
                <Link href="/manager/shift-schedules" className={linkClass('/manager/shift-schedules')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Shift Schedules'}
                </Link>
                <Link href="/manager/staff-profiles" className={linkClass('/manager/staff-profiles')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Staff Shift Profiles'}
                </Link>
                <Link href="/manager/leave-requests" className={linkClass('/manager/leave-requests')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Leave Requests'}
                </Link>
                <Link href="/manager/shift-swaps" className={linkClass('/manager/shift-swaps')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Shift Swaps'}
                </Link>
              </>
            )}

            <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Legacy Tickets'}
            </Link>
          </div>
        )}

        {(session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN') && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Administration</div>}
            <Link href="/admin/task-templates" className={linkClass('/admin/task-templates')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {(!isCollapsed || isMobile) && 'Task Templates'}
            </Link>
            <Link href="/admin/services" className={linkClass('/admin/services')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {(!isCollapsed || isMobile) && 'Service Templates'}
            </Link>
            <Link href="/admin/field-templates" className={linkClass('/admin/field-templates')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Field Templates'}
            </Link>
            <Link href="/admin/categories" className={linkClass('/admin/categories')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {(!isCollapsed || isMobile) && 'Categories'}
            </Link>
            <Link href="/admin/tier-categories" className={linkClass('/admin/tier-categories')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Tier Categories'}
            </Link>
            <Link href="/admin/pc-assets" className={linkClass('/admin/pc-assets')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'PC Assets'}
            </Link>
            <Link href="/admin/branches" className={linkClass('/admin/branches')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Branches'}
            </Link>
            <Link href="/admin/atms" className={linkClass('/admin/atms')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'ATMs'}
            </Link>
            <Link href="/admin/users" className={linkClass('/admin/users')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {(!isCollapsed || isMobile) && 'User Management'}
            </Link>
            <Link href="/admin/vendors" className={linkClass('/admin/vendors')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Vendor Management'}
            </Link>
            <Link href="/admin/support-groups" className={linkClass('/admin/support-groups')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Support Groups'}
            </Link>
            <Link href="/admin/technicians" className={linkClass('/admin/technicians')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Technicians'}
            </Link>
            <Link href="/admin/security" className={linkClass('/admin/security')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Security'}
            </Link>
            <Link href="/admin/api-keys" className={linkClass('/admin/api-keys')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 11-4 0 2 2 0 014 0zM7 10.172A2 2 0 116.172 9L7 10.172zM14 18.243a2 2 0 101.414-1.414L14 18.243zM17.828 10.172a2 2 0 11-1.414 1.414L17.828 10.172zM11 11h2v6h-2v-6z" />
              </svg>
              {(!isCollapsed || isMobile) && 'API Keys'}
            </Link>
            <Link href="/admin/announcements" className={linkClass('/admin/announcements')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Announcements'}
            </Link>
            <Link href="/admin/import" className={linkClass('/admin/import')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {(!isCollapsed || isMobile) && 'Import'}
            </Link>
            <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Legacy Tickets'}
            </Link>
          </div>
        )}
        
        {/* Network Monitoring - For ADMIN, SUPER_ADMIN, TECHNICIAN, and Network Operations Center users */}
        {(session.user?.role === 'ADMIN' || 
          session.user?.role === 'SUPER_ADMIN' ||
          session.user?.role === 'TECHNICIAN' || 
          session.user?.supportGroupCode === 'NETWORK_OPERATIONS_CENTER') && (
          <div className="space-y-1">
            {(!isCollapsed || isMobile) && <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">Network Monitoring</div>}
            <Link href="/monitoring/network" className={linkClass('/monitoring/network')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              {(!isCollapsed || isMobile) && 'Network Overview'}
            </Link>
            <Link href="/monitoring/branches" className={linkClass('/monitoring/branches')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {(!isCollapsed || isMobile) && 'Network Map'}
            </Link>
            <Link href="/monitoring/atms" className={linkClass('/monitoring/atms')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {(!isCollapsed || isMobile) && 'ATM Monitor'}
            </Link>
            <Link href="/monitoring/incidents" className={linkClass('/monitoring/incidents')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Network Incidents'}
            </Link>
            <Link href="/monitoring/tickets" className={linkClass('/monitoring/tickets')} onClick={handleLinkClick}>
              <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              {(!isCollapsed || isMobile) && 'Auto Tickets'}
            </Link>
          </div>
        )}
      </nav>

      {/* User Profile Menu at Bottom - Modern Solid Card Design */}
      <div className="border-t border-sidebar-border p-3">
        {(!isCollapsed || isMobile) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ShimmerButton
                shimmerColor="rgba(255, 255, 255, 0.1)"
                shimmerSize="0.1em"
                shimmerDuration="4s"
                borderRadius="0.75rem"
                background="hsl(var(--sidebar))"
                className="w-full rounded-xl px-4 py-3 flex items-center gap-3 border border-sidebar-border/50 hover:border-sidebar-border transition-all duration-300"
                aria-label={`User menu. ${session.user?.name}, ${session.user?.role}${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ''}`}
              >
                {/* User Avatar Icon with gradient background */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                  <User className="w-4 h-4 text-sidebar-foreground" />
                </div>

                {/* User Name with Animated Shiny Text - truncate to first two words if too long */}
                <AnimatedShinyText
                  shimmerWidth={80}
                  className="text-sm font-semibold truncate flex-1 min-w-0 text-left !text-sidebar-foreground dark:!text-sidebar-foreground"
                  title={session.user?.name}
                >
                  {(() => {
                    const name = session.user?.name || '';
                    const words = name.split(' ');
                    if (words.length > 2) {
                      return `${words.slice(0, 2).join(' ')}...`;
                    }
                    return name;
                  })()}
                </AnimatedShinyText>

                {/* Notification Badge with NumberTicker */}
                {unreadCount > 0 && (
                  <div className="flex-shrink-0 min-w-[28px] h-7 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center px-2 shadow-lg shadow-red-500/20">
                    {unreadCount > 99 ? (
                      <span className="text-xs font-bold text-white">99+</span>
                    ) : (
                      <NumberTicker
                        value={unreadCount}
                        className="text-xs font-bold !text-white tabular-nums"
                      />
                    )}
                  </div>
                )}
              </ShimmerButton>
            </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl"
            align="end"
            side={isMobile ? "top" : "right"}
            sideOffset={8}
          >
            {/* Profile Header Section - Clean Minimal Design */}
            <div className="p-6 pb-4">
              <div className="flex flex-col items-center gap-3">
                {/* Avatar */}
                <Avatar className="h-16 w-16 ring-4 ring-amber-500 dark:ring-amber-600">
                  {(session.user as any)?.avatar && getAvatarById((session.user as any).avatar) ? (
                    <div className="h-full w-full">
                      {getAvatarById((session.user as any).avatar)?.component}
                    </div>
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
                      {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Name */}
                <div className="text-center">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">
                    {session.user?.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {session.user?.email}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap justify-center">
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
                  >
                    {session.user?.role}
                  </Badge>
                  {(session.user as any)?.branchName && (
                    <Badge
                      className="text-xs font-medium bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0"
                    >
                      {(session.user as any).branchName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Menu Items - Clean Simple Design */}
            <DropdownMenuGroup className="p-2">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setShowNotifications(true);
                }}
                className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
              >
                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                <span className="font-medium text-gray-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-auto text-xs px-2 py-0.5"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                >
                  <User className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <span className="font-medium text-gray-900 dark:text-white">Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                >
                  <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <span className="font-medium text-gray-900 dark:text-white">Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                }}
                className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">Dark Mode</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <Separator />

            {/* Sign Out - Clean Red Style */}
            <div className="p-2">
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-lg px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 flex items-center gap-3"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-semibold">Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        ) : (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-12 h-12 p-0 rounded-xl flex items-center justify-center bg-sidebar border border-sidebar-border shadow-sm hover:bg-sidebar-accent transition-colors duration-200 relative"
                  aria-label={`User menu. ${session.user?.name}, ${session.user?.role}${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ''}`}
                  title={`${session.user?.name} - ${session.user?.role}`}
                >
                  {/* Initials */}
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </span>

                  {/* Notification Badge */}
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 text-[10px] px-1 py-0 min-w-[16px] h-4 flex items-center justify-center"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl"
                align="end"
                side="right"
                sideOffset={8}
              >
                {/* Profile Header Section - Clean Minimal Design */}
                <div className="p-6 pb-4">
                  <div className="flex flex-col items-center gap-3">
                    {/* Avatar */}
                    <Avatar className="h-16 w-16 ring-4 ring-amber-500 dark:ring-amber-600">
                      {(session.user as any)?.avatar && getAvatarById((session.user as any).avatar) ? (
                        <div className="h-full w-full">
                          {getAvatarById((session.user as any).avatar)?.component}
                        </div>
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
                          {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {/* Name */}
                    <div className="text-center">
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">
                        {session.user?.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {session.user?.email}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 flex-wrap justify-center">
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
                      >
                        {session.user?.role}
                      </Badge>
                      {(session.user as any)?.branchName && (
                        <Badge
                          className="text-xs font-medium bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0"
                        >
                          {(session.user as any).branchName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Menu Items - Clean Simple Design */}
                <DropdownMenuGroup className="p-2">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setShowNotifications(true);
                    }}
                    className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    <span className="font-medium text-gray-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto text-xs px-2 py-0.5"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                    >
                      <User className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="font-medium text-gray-900 dark:text-white">Profile</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/settings"
                      className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                    >
                      <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="font-medium text-gray-900 dark:text-white">Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="cursor-pointer rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">Dark Mode</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <Separator />

                {/* Sign Out - Clean Red Style */}
                <div className="p-2">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer rounded-lg px-4 py-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 flex items-center gap-3"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-semibold">Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {/* Version Footer - Below Profile */}
      <div className={`p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 ${isCollapsed && !isMobile ? 'hidden' : ''}`}>
        <div className="text-center">
          <p className="text-xs text-brown-600 dark:text-cream-400 font-medium">
            {getVersionString()}
          </p>
          <Link
            href="/about"
            className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block"
          >
            {APP_VERSION.copyright}
          </Link>
        </div>
      </div>
      
    </div>
    
    {/* Notification Inbox Modal */}
    <NotificationInbox 
      open={showNotifications}
      onOpenChange={setShowNotifications}
    />
    </>
  );
}