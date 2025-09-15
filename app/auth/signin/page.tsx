'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getVersionString, APP_VERSION } from '@/lib/version';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check for specific error messages
        if (result.error.includes('locked') || result.error.includes('administrator')) {
          setError('Your account has been locked due to too many failed login attempts. Please contact your administrator to unlock your account.');
        } else {
          // Always check remaining attempts first for any authentication error
          try {
            const response = await fetch('/api/auth/login-attempts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: username })
            });
            const data = await response.json();
            
            // Check if the account is actually locked
            if (data.isLocked) {
              setError('Your account has been locked due to too many failed login attempts. Please contact your administrator to unlock your account.');
            } else if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
              setError(`Invalid credentials. ${data.remainingAttempts} attempts remaining before account lockout.`);
            } else {
              setError('Invalid credentials');
            }
          } catch {
            setError('Invalid credentials');
          }
        }
      } else {
        // Check session and redirect
        const session = await getSession();
        if (session) {
          // Check if user needs to change password
          if (session.user?.mustChangePassword) {
            router.push('/auth/change-password');
          } else {
            router.push('/');
          }
        }
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <img 
              src="/logo-bsg.png" 
              alt="Bank SulutGo" 
              className="h-20 w-auto"
            />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ServiceDesk Portal
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact IT Support
              </p>
            </div>
            
            {/* Version Information */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 font-medium">
                {getVersionString()}
              </p>
              <Link
                href="/about"
                className="text-xs text-gray-400 mt-1 hover:text-blue-600 transition-colors inline-block"
              >
                {APP_VERSION.copyright}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}