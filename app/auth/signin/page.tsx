'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVersionString, APP_VERSION } from '@/lib/version';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-50 to-brown-50 dark:from-brown-950 dark:via-warm-dark-300 dark:to-brown-900">
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[max(50%,25rem)] top-0 h-[64rem] w-[128rem] -translate-x-1/2 stroke-brown-200 dark:stroke-brown-800 [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)]">
          <svg
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="e813992c-7d03-4cc4-a2bd-151760b470a0"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
              >
                <path d="M100 200V.5M.5 .5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-brown-100/20 dark:fill-brown-900/20">
              <path
                d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect width="100%" height="100%" strokeWidth={0} fill="url(#e813992c-7d03-4cc4-a2bd-151760b470a0)" />
          </svg>
        </div>
      </div>

      <div className="relative w-full max-w-md px-6">
        <div className="mx-auto w-full">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="mx-auto flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brown-400 to-brown-600 dark:from-brown-200 dark:to-brown-300 blur-2xl opacity-20 rounded-full"></div>
                <img
                  src="/logo-bsg.png"
                  alt="Bank SulutGo"
                  className="relative h-20 w-auto"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-brown-900 dark:text-cream-200">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-brown-600 dark:text-cream-400">
              Sign in to ServiceDesk Portal
            </p>
          </div>

          {/* Sign In Form */}
          <div className="bg-white/80 dark:bg-warm-dark-300/80 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-brown-200/50 dark:ring-warm-dark-200/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-brown-900 dark:text-cream-200">
                    Username
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-400 dark:text-cream-500" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-cream-50 dark:bg-warm-dark-200 border-brown-300 dark:border-warm-dark-100 focus:border-brown-500 dark:focus:border-brown-300 focus:ring-brown-500 dark:focus:ring-brown-300"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-brown-900 dark:text-cream-200">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brown-400 dark:text-cream-500" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-cream-50 dark:bg-warm-dark-200 border-brown-300 dark:border-warm-dark-100 focus:border-brown-500 dark:focus:border-brown-300 focus:ring-brown-500 dark:focus:ring-brown-300"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-brown-600 hover:text-brown-500 dark:text-brown-300 dark:hover:text-brown-200 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brown-500 to-brown-600 dark:from-brown-300 dark:to-brown-400 text-white dark:text-brown-950 hover:from-brown-600 hover:to-brown-700 dark:hover:from-brown-400 dark:hover:to-brown-500 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-brown-950 border-t-transparent dark:border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brown-200 dark:border-warm-dark-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-warm-dark-300 px-2 text-brown-500 dark:text-cream-400">
                    Need assistance?
                  </span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-brown-600 dark:text-cream-400">
                  Contact IT Support for account issues
                </p>
              </div>
            </div>

            {/* Version Information */}
            <div className="mt-6 pt-6 border-t border-brown-200 dark:border-warm-dark-200 text-center">
              <p className="text-xs text-brown-500 dark:text-cream-500 font-medium">
                {getVersionString()}
              </p>
              <Link
                href="/about"
                className="text-xs text-brown-500 dark:text-cream-500 mt-1 hover:text-brown-700 dark:hover:text-cream-300 transition-colors inline-block"
              >
                {APP_VERSION.copyright}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}