'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  if (!session) return null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Bank SulutGo</h1>
                  <p className="text-xs text-gray-500">ServiceDesk Portal</p>
                </div>
              </Link>
            </div>
            
            {/* Navigation Links */}
            <nav className="ml-10 flex space-x-8">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/tickets"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/tickets' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Tickets
              </Link>
              {session.user?.role === 'TECHNICIAN' && (
                <Link
                  href="/technician"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/technician' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Workbench
                </Link>
              )}
              {session.user?.role === 'MANAGER' && (
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
              )}
              {(['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) && (
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
                    href="/admin/import"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === '/admin/import' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Import
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {session.user?.role}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
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