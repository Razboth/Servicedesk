'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
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
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else {
        // Check session and redirect
        const session = await getSession();
        if (session) {
          router.push('/');
        }
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Bank SulutGo</CardTitle>
          <CardDescription className="text-gray-600">
            ServiceDesk Portal
            <br />
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">Demo Accounts (Click to fill):</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2 text-left justify-start"
                onClick={() => fillDemoCredentials('user@banksulutgo.co.id', 'password123')}
              >
                <div className="text-xs">
                  <div className="font-medium text-blue-600">👤 User</div>
                  <div className="text-gray-500">Branch Employee</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2 text-left justify-start"
                onClick={() => fillDemoCredentials('manager@banksulutgo.co.id', 'password123')}
              >
                <div className="text-xs">
                  <div className="font-medium text-green-600">👔 Manager</div>
                  <div className="text-gray-500">Branch Manager</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2 text-left justify-start"
                onClick={() => fillDemoCredentials('tech@banksulutgo.co.id', 'password123')}
              >
                <div className="text-xs">
                  <div className="font-medium text-purple-600">🔧 Technician</div>
                  <div className="text-gray-500">IT Support</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto p-2 text-left justify-start"
                onClick={() => fillDemoCredentials('admin@banksulutgo.co.id', 'password123')}
              >
                <div className="text-xs">
                  <div className="font-medium text-red-600">⚙️ Admin</div>
                  <div className="text-gray-500">System Admin</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}