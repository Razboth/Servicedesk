'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { X, User, Settings, LogOut, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getVersionString, APP_VERSION } from '@/lib/version';
import { NotificationInbox } from '@/components/notifications/notification-inbox';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvatarById } from '@/components/ui/avatar-presets';
import { MovingBorderButton } from '@/components/ui/moving-border';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import { GlowEffect, PulseGlow } from '@/components/ui/glow-effect';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    await signOut({ callbackUrl: 'https://hd.bsg.id/auth/signin' });
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
    group relative flex items-center ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-300
    ${isActive(path)
      ? 'bg-gradient-to-br from-amber-500/90 via-orange-500/90 to-yellow-500/80 dark:from-amber-600/90 dark:via-orange-600/90 dark:to-yellow-600/80 text-white shadow-lg shadow-amber-900/30 dark:shadow-amber-950/50 scale-[1.02]'
      : 'text-sidebar-foreground hover:bg-gradient-to-br hover:from-amber-50 hover:via-orange-50 hover:to-yellow-50 dark:hover:from-amber-950/50 dark:hover:via-orange-950/40 dark:hover:to-yellow-950/40 hover:shadow-md hover:scale-[1.01]'
    }
    ${isCollapsed ? 'hover:scale-110' : ''}
  `;

  const iconClass = `${isCollapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'} transition-all duration-300 ${
    isActive(pathname) ? '' : 'group-hover:text-amber-600 dark:group-hover:text-amber-400'
  }`;

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isMobile ? '16rem' : isCollapsed ? '4rem' : '16rem',
          x: isMobile && !isMobileMenuOpen ? '-100%' : 0,
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={`
          bg-sidebar shadow-2xl border-r border-sidebar-border h-screen fixed left-0 top-0 z-50 flex flex-col relative overflow-hidden
        `}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
          <BackgroundGradientAnimation
            gradientBackgroundStart="rgb(254, 243, 199)"
            gradientBackgroundEnd="rgb(253, 230, 138)"
            firstColor="251, 191, 36"
            secondColor="249, 115, 22"
            thirdColor="234, 179, 8"
            fourthColor="251, 146, 60"
            fifthColor="252, 211, 77"
            size="60%"
            blendingValue="overlay"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              {(!isCollapsed || isMobile) ? (
                <Link href="/" className="flex items-center space-x-3 group" onClick={handleLinkClick}>
                  <motion.img
                    src="/logo-bsg.png"
                    alt="Bank SulutGo"
                    className="h-9 w-auto"
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  />
                  <motion.div
                    className="flex-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm font-semibold text-sidebar-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      ServiceDesk
                    </p>
                    <p className="text-xs text-sidebar-foreground/70">IT Portal</p>
                  </motion.div>
                </Link>
              ) : (
                <Link href="/" className="flex items-center justify-center" onClick={handleLinkClick}>
                  <motion.img
                    src="/logo-bsg.png"
                    alt="BSG"
                    className="h-8 w-auto"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  />
                </Link>
              )}

              {/* Desktop collapse button or Mobile close button */}
              {isMobile ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <motion.svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      animate={{ rotate: isCollapsed ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </motion.svg>
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Common Links */}
            <div className="space-y-1">
              <motion.div
                whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/" className={linkClass('/')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Dashboard'}
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/tickets" className={linkClass('/tickets')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Tickets'}
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/reports" className={linkClass('/reports')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Reports'}
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/knowledge" className={linkClass('/knowledge')} onClick={handleLinkClick}>
                  <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {(!isCollapsed || isMobile) && 'Knowledge Base'}
                </Link>
              </motion.div>
            </div>

            {/* Call Center Operations - For Call Center Users and Technicians */}
            {((session.user?.role === 'USER' && session.user?.supportGroupCode === 'CALL_CENTER') ||
              (session.user?.role === 'TECHNICIAN' && session.user?.supportGroupCode === 'CALL_CENTER')) && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Call Center
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/tickets" className={linkClass('/tickets')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Tickets'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/branch/atm-claims" className={linkClass('/branch/atm-claims')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'ATM Claims'}
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Branch Operations - For Managers, Users, and Regular Agents */}
            {(session.user?.role === 'MANAGER' || session.user?.role === 'USER' ||
              (session.user?.role === 'AGENT' && session.user?.supportGroupCode !== 'CALL_CENTER')) && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Branch Operations
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/branch/atm-claims" className={linkClass('/branch/atm-claims')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'ATM Claims'}
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Role-specific sections */}
            {session.user?.role === 'TECHNICIAN' && session.user?.supportGroupCode !== 'CALL_CENTER' && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Technician
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/technician/workbench" className={linkClass('/technician/workbench')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v-2m0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13h10M7 17h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Workbench'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/technician/daily-tasks" className={linkClass('/technician/daily-tasks')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Daily Task List'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/technician/shifts" className={linkClass('/technician/shifts')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'My Shifts'}
                  </Link>
                </motion.div>
                {/* PC Assets and License Management for TECH_SUPPORT group and SUPER_ADMIN */}
                {(session.user?.supportGroupCode === 'TECH_SUPPORT' || session.user?.role === 'SUPER_ADMIN') && (
                  <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/admin/pc-assets" className={linkClass('/admin/pc-assets')} onClick={handleLinkClick}>
                      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {(!isCollapsed || isMobile) && 'PC Assets'}
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Legacy Tickets'}
                  </Link>
                </motion.div>
              </div>
            )}

            {(session.user?.role === 'MANAGER' || session.user?.role === 'MANAGER_IT') && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Manager
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/manager/dashboard" className={linkClass('/manager/dashboard')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Manager Dashboard'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/manager/approvals" className={linkClass('/manager/approvals')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Approvals'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/manager/tickets" className={linkClass('/manager/tickets')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Branch Tickets'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/manager/users" className={linkClass('/manager/users')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Users'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/manager/atms" className={linkClass('/manager/atms')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'ATMs'}
                  </Link>
                </motion.div>

                {/* Shift Management - Only for MANAGER_IT */}
                {session.user?.role === 'MANAGER_IT' && (
                  <>
                    {(!isCollapsed || isMobile) && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2"
                      >
                        Shift Management
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/manager/shift-schedules" className={linkClass('/manager/shift-schedules')} onClick={handleLinkClick}>
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {(!isCollapsed || isMobile) && 'Shift Schedules'}
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/manager/staff-profiles" className={linkClass('/manager/staff-profiles')} onClick={handleLinkClick}>
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        {(!isCollapsed || isMobile) && 'Staff Shift Profiles'}
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/manager/leave-requests" className={linkClass('/manager/leave-requests')} onClick={handleLinkClick}>
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {(!isCollapsed || isMobile) && 'Leave Requests'}
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/manager/shift-swaps" className={linkClass('/manager/shift-swaps')} onClick={handleLinkClick}>
                        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        {(!isCollapsed || isMobile) && 'Shift Swaps'}
                      </Link>
                    </motion.div>
                  </>
                )}

                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Legacy Tickets'}
                  </Link>
                </motion.div>
              </div>
            )}

            {(session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN') && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Administration
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/task-templates" className={linkClass('/admin/task-templates')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Task Templates'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/services" className={linkClass('/admin/services')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Service Templates'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/field-templates" className={linkClass('/admin/field-templates')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Field Templates'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/categories" className={linkClass('/admin/categories')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Categories'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/tier-categories" className={linkClass('/admin/tier-categories')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Tier Categories'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/pc-assets" className={linkClass('/admin/pc-assets')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'PC Assets'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/branches" className={linkClass('/admin/branches')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Branches'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/atms" className={linkClass('/admin/atms')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'ATMs'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/users" className={linkClass('/admin/users')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'User Management'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/vendors" className={linkClass('/admin/vendors')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Vendor Management'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/support-groups" className={linkClass('/admin/support-groups')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Support Groups'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/technicians" className={linkClass('/admin/technicians')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Technicians'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/security" className={linkClass('/admin/security')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Security'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/api-keys" className={linkClass('/admin/api-keys')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 11-4 0 2 2 0 014 0zM7 10.172A2 2 0 116.172 9L7 10.172zM14 18.243a2 2 0 101.414-1.414L14 18.243zM17.828 10.172a2 2 0 11-1.414 1.414L17.828 10.172zM11 11h2v6h-2v-6z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'API Keys'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/announcements" className={linkClass('/admin/announcements')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Announcements'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/admin/import" className={linkClass('/admin/import')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Import'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/tickets/legacy" className={linkClass('/tickets/legacy')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Legacy Tickets'}
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Network Monitoring - For ADMIN, SUPER_ADMIN, TECHNICIAN, and Network Operations Center users */}
            {(session.user?.role === 'ADMIN' ||
              session.user?.role === 'SUPER_ADMIN' ||
              session.user?.role === 'TECHNICIAN' ||
              session.user?.supportGroupCode === 'NETWORK_OPERATIONS_CENTER') && (
              <div className="space-y-1 mt-4">
                {(!isCollapsed || isMobile) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2"
                  >
                    Network Monitoring
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/monitoring/network" className={linkClass('/monitoring/network')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Network Overview'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/monitoring/branches" className={linkClass('/monitoring/branches')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Branch Network'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/monitoring/atms" className={linkClass('/monitoring/atms')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'ATM Monitor'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/monitoring/incidents" className={linkClass('/monitoring/incidents')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Network Incidents'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: isCollapsed ? 1.05 : 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/monitoring/tickets" className={linkClass('/monitoring/tickets')} onClick={handleLinkClick}>
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    {(!isCollapsed || isMobile) && 'Auto Tickets'}
                  </Link>
                </motion.div>
              </div>
            )}
          </nav>

          {/* PREMIUM PROFILE PILL/BAR - The Star of the Show */}
          <div className="border-t border-sidebar-border/50 p-3 backdrop-blur-sm">
            <DropdownMenu>
              <div className="group relative">
                <GlowEffect containerClassName="w-full">
                  <DropdownMenuTrigger asChild>
                    <MovingBorderButton
                      duration={3000}
                      borderRadius="0.875rem"
                      aria-label={`Profile menu for ${session.user?.name}`}
                      className={`w-full ${
                        (isCollapsed && !isMobile)
                          ? 'p-3 min-w-[48px] min-h-[48px] justify-center'
                          : 'p-3.5 min-h-[48px]'
                      } flex ${
                        (isCollapsed && !isMobile) ? 'justify-center' : 'justify-start gap-3'
                      } items-center relative overflow-hidden group/button transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar`}
                    >
                      {(isCollapsed && !isMobile) ? (
                        // Collapsed state - enhanced avatar with pulse effect
                        <PulseGlow containerClassName="relative">
                          <div className="w-10 h-10 relative">
                            {(session.user as any)?.avatar && getAvatarById((session.user as any).avatar) ? (
                              <motion.div
                                className="w-full h-full"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                {getAvatarById((session.user as any).avatar)?.component}
                              </motion.div>
                            ) : (
                              <motion.div
                                className="w-full h-full rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 p-[2px] shadow-xl shadow-amber-900/30 dark:shadow-amber-950/50"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
                                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                    {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                            {/* Animated online status indicator */}
                            <motion.div
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar shadow-md"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.8, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />
                          </div>
                        </PulseGlow>
                      ) : (
                        // Expanded state - full premium profile display
                        <>
                          <PulseGlow containerClassName="relative flex-shrink-0">
                            <div className="w-12 h-12 relative">
                              {(session.user as any)?.avatar && getAvatarById((session.user as any).avatar) ? (
                                <motion.div
                                  className="w-full h-full"
                                  whileHover={{ scale: 1.05, rotate: 3 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                >
                                  {getAvatarById((session.user as any).avatar)?.component}
                                </motion.div>
                              ) : (
                                <motion.div
                                  className="w-full h-full rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 p-[2.5px] shadow-xl shadow-amber-900/30 dark:shadow-amber-950/50"
                                  whileHover={{ scale: 1.05, rotate: 3 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                >
                                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
                                    <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                                      {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                </motion.div>
                              )}
                              {/* Animated online status indicator */}
                              <motion.div
                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-sidebar shadow-md"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [1, 0.8, 1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                              />
                            </div>
                          </PulseGlow>

                          <motion.div
                            className="flex-1 min-w-0 text-left"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <motion.div
                              className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-tight truncate mb-1"
                              whileHover={{ x: 2 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                              {session.user?.name}
                            </motion.div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-semibold px-2.5 py-0.5 h-5 rounded bg-gradient-to-r from-amber-400 to-orange-400 dark:from-amber-700 dark:to-orange-700 text-white border-0 shadow-sm"
                                >
                                  {session.user?.role}
                                </Badge>
                              </motion.div>
                              {session.user?.branchName && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-medium px-2.5 py-0.5 h-5 rounded bg-gradient-to-r from-orange-400 to-yellow-400 dark:from-orange-700 dark:to-yellow-700 text-white border-0 shadow-sm truncate max-w-[100px]"
                                  >
                                    {session.user.branchName}
                                  </Badge>
                                </motion.div>
                              )}
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 leading-tight truncate">
                              {session.user?.email}
                            </div>
                          </motion.div>

                          {/* Animated chevron indicator */}
                          <motion.div
                            className="flex-shrink-0 ml-1"
                            animate={{ y: [-2, 2, -2] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <svg
                              className="w-4 h-4 text-amber-600 dark:text-amber-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                          </motion.div>
                        </>
                      )}
                    </MovingBorderButton>
                  </DropdownMenuTrigger>
                </GlowEffect>

                <DropdownMenuContent
                  align={(isCollapsed && !isMobile) ? "end" : "start"}
                  side="top"
                  sideOffset={16}
                  className="w-72 p-2 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 backdrop-blur-xl border-2 border-amber-200/70 dark:border-amber-800/50 rounded-2xl shadow-2xl shadow-amber-900/20 dark:shadow-amber-950/50"
                >
                  {/* Profile header - Enhanced with premium styling */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 mb-2 bg-gradient-to-br from-amber-100/70 via-orange-50/60 to-yellow-50/50 dark:from-amber-950/60 dark:via-orange-950/50 dark:to-yellow-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/50 shadow-lg relative overflow-hidden"
                  >
                    {/* Subtle animated background */}
                    <div className="absolute inset-0 opacity-30">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-yellow-400/20"
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          backgroundSize: '200% 200%',
                        }}
                      />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 flex-shrink-0 relative">
                          {(session.user as any)?.avatar && getAvatarById((session.user as any).avatar) ? (
                            <div className="w-full h-full">
                              {getAvatarById((session.user as any).avatar)?.component}
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 p-[2.5px] shadow-xl shadow-amber-900/30">
                              <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
                                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                  {session.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Animated online status */}
                          <motion.div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [1, 0.8, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-tight truncate mb-1">
                            {session.user?.name}
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-tight truncate">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge className="text-xs font-semibold px-3 py-1 h-6 rounded-md bg-gradient-to-r from-amber-400 to-orange-400 dark:from-amber-700 dark:to-orange-700 text-white border-0 shadow-md">
                          {session.user?.role}
                        </Badge>
                        {session.user?.branchName && (
                          <Badge className="text-xs font-medium px-3 py-1 h-6 rounded-md bg-gradient-to-r from-orange-400 to-yellow-400 dark:from-orange-700 dark:to-yellow-700 text-white border-0 shadow-md truncate max-w-[140px]">
                            {session.user.branchName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <div className="space-y-1">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <DropdownMenuItem
                        className="flex items-center p-3.5 min-h-[44px] hover:bg-gradient-to-r hover:from-amber-100/70 hover:to-orange-100/60 dark:hover:from-amber-900/40 dark:hover:to-orange-900/30 rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-md border border-transparent hover:border-amber-200/60 dark:hover:border-amber-800/40"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowNotifications(true);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-900/40 group-hover:bg-amber-200/80 dark:group-hover:bg-amber-900/60 transition-colors">
                            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            {unreadCount > 0 && (
                              <motion.span
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </motion.span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                            Notifications
                          </span>
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-auto text-xs px-2.5 py-0.5 font-bold shadow-md">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className="flex items-center p-3.5 min-h-[44px] hover:bg-gradient-to-r hover:from-amber-100/70 hover:to-orange-100/60 dark:hover:from-amber-900/40 dark:hover:to-orange-900/30 rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-md border border-transparent hover:border-amber-200/60 dark:hover:border-amber-800/40"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-900/40 group-hover:bg-amber-200/80 dark:group-hover:bg-amber-900/60 transition-colors">
                              <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </div>
                            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                              Profile
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/settings"
                          className="flex items-center p-3.5 min-h-[44px] hover:bg-gradient-to-r hover:from-amber-100/70 hover:to-orange-100/60 dark:hover:from-amber-900/40 dark:hover:to-orange-900/30 rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-md border border-transparent hover:border-amber-200/60 dark:hover:border-amber-800/40"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-900/40 group-hover:bg-amber-200/80 dark:group-hover:bg-amber-900/60 transition-colors">
                              <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </div>
                            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                              Settings
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <DropdownMenuItem
                        className="flex items-center p-3.5 min-h-[44px] hover:bg-gradient-to-r hover:from-amber-100/70 hover:to-orange-100/60 dark:hover:from-amber-900/40 dark:hover:to-orange-900/30 rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-md border border-transparent hover:border-amber-200/60 dark:hover:border-amber-800/40"
                        onClick={(e) => {
                          e.preventDefault();
                          setTheme(theme === 'dark' ? 'light' : 'dark');
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-900/40 group-hover:bg-amber-200/80 dark:group-hover:bg-amber-900/60 transition-colors">
                            <motion.div
                              animate={{ rotate: theme === 'dark' ? 180 : 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                              ) : (
                                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                              )}
                            </motion.div>
                          </div>
                          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </motion.div>
                  </div>

                  <div className="my-2 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent dark:via-amber-700/50" />

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <DropdownMenuItem asChild>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3.5 min-h-[44px] bg-gradient-to-r from-red-50/90 to-red-100/80 dark:from-red-950/40 dark:to-red-900/30 rounded-lg hover:from-red-100 hover:to-red-200 dark:hover:from-red-950/60 dark:hover:to-red-900/50 cursor-pointer border-2 border-red-200/70 dark:border-red-900/60 hover:border-red-300 dark:hover:border-red-800 hover:shadow-lg transition-all group"
                      >
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/60 group-hover:bg-red-200 dark:group-hover:bg-red-900/80 transition-colors">
                          <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300">
                          Sign Out
                        </span>
                      </button>
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>
          </div>

          {/* Version Footer - Below Profile */}
          <AnimatePresence>
            {(!isCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-gray-50/50 to-amber-50/30 dark:from-gray-900/50 dark:to-amber-950/20"
              >
                <div className="text-center">
                  <p className="text-xs text-brown-600 dark:text-cream-400 font-medium">
                    {getVersionString()}
                  </p>
                  <Link
                    href="/about"
                    className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-block"
                  >
                    {APP_VERSION.copyright}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Notification Inbox Modal */}
      <NotificationInbox
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </>
  );
}
