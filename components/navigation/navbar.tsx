'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Don't render navbar while loading or if not authenticated
  if (status === 'loading' || !session) return null;

  return (
    <nav className="bg-white/[0.9] dark:bg-gray-900/[0.9] backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-blue-50/50 dark:shadow-gray-900/50 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-blue-200/40 group-hover:shadow-xl group-hover:shadow-blue-300/60 transition-all duration-300 group-hover:scale-105">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="group-hover:translate-x-1 transition-transform duration-200">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Bank SulutGo</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">ServiceDesk Portal</p>
                </div>
              </Link>
            </div>
            
            {/* Navigation Links */}
            <nav className="ml-10 flex space-x-2 overflow-x-auto">
              {/* Always show dashboard */}
              <Link
                href="/"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden group ${
                  pathname === '/' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/60' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                  </svg>
                  Dashboard
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>
              
              {/* Show tickets and reports for all users except pure admin users */}
              {session?.user?.role !== 'ADMIN' && (
                <>
                  <Link
                    href="/tickets"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden group ${
                      pathname === '/tickets' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/50' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Tickets
                    </span>
                  </Link>
                  <Link
                    href="/tickets/modern"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden group ${
                      pathname === '/tickets/modern' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-200/50' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Modern Tickets
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">✨</span>
                    </span>
                  </Link>
                  <Link
                    href="/reports"
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden group ${
                      pathname.startsWith('/reports') 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Reports
                    </span>
                  </Link>
                </>
              )}
              {session.user?.role === 'TECHNICIAN' && (
                <>
                  <Link
                    href="/technician"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/technician' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/technician/workbench"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/technician/workbench' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Workbench
                  </Link>
                  <Link
                    href="/monitoring/atms"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/monitoring/atms' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ATM Monitor
                  </Link>
                </>
              )}
              {session.user?.role === 'MANAGER' && (
                <>
                  <Link
                    href="/manager/approvals"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/manager/approvals' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Approvals
                  </Link>
                  <Link
                    href="/monitoring/atms"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/monitoring/atms' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ATM Monitor
                  </Link>
                </>
              )}
              {session.user?.role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin/task-templates"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/task-templates' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Task Templates
                  </Link>
                  <Link
                    href="/admin/services"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/services' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Service Templates
                  </Link>
                  <Link
                    href="/admin/field-templates"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/field-templates' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Field Templates
                  </Link>
                  <Link
                    href="/admin/categories"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/categories' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Categories
                  </Link>
                  <Link
                    href="/admin/tier-categories"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/tier-categories' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Tier Categories
                  </Link>
                  <Link
                    href="/admin/branches"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/branches' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Branches
                  </Link>
                  <Link
                    href="/admin/atms"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/atms' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ATMs
                  </Link>
                  <Link
                    href="/admin/import"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/import' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Import
                  </Link>
                  <Link
                    href="/admin/api-keys"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/api-keys' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    API Keys
                  </Link>
                  <Link
                    href="/monitoring/atms"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/monitoring/atms' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ATM Monitor
                  </Link>
                </>
              )}

              {/* Security Analyst Menu - Show for SECURITY_ANALYST role or SECURITY_OPS support group */}
              {(session?.user?.role === 'SECURITY_ANALYST' || session?.user?.supportGroupCode === 'SECURITY_OPS') && (
                <>
                  <Link
                    href="/tickets"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/tickets' || pathname.startsWith('/tickets/') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Tickets
                  </Link>
                  <Link
                    href="/security/soc-parser"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border-2 ${
                      pathname === '/security/soc-parser' 
                        ? 'bg-red-100 text-red-700 border-red-300' 
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                    }`}
                  >
                    🔒 SOC Parser
                  </Link>
                  <Link
                    href="/reports"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname.startsWith('/reports') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Reports
                  </Link>
                </>
              )}

              {/* Manager Menu */}
              {session?.user?.role === 'MANAGER' && (
                <>
                  <Link
                    href="/manager/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/manager/dashboard' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Manager Dashboard
                  </Link>
                  <Link
                    href="/manager/tickets"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/manager/tickets' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Branch Tickets
                  </Link>
                  <Link
                    href="/manager/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/manager/users' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/manager/atms"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/manager/atms' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    ATMs
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{session.user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{session.user?.email}</p>
              </div>
              <Badge 
                variant="outline" 
                className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium px-2.5 py-1"
              >
                {session.user?.role}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 border-gray-300 dark:border-gray-600 hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}