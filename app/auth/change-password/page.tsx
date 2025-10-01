'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { data: session, update } = useSession();

  // Password strength indicators
  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    
    return checks;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const allChecksPassed = Object.values(passwordStrength).every(v => v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      setIsLoading(false);
      return;
    }

    if (!allChecksPassed) {
      setError('Please meet all password requirements');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
      } else {
        setSuccess(true);
        // Update session to refresh JWT token with new mustChangePassword value
        await update();
        // Hard redirect to home page after 1 second to ensure session refresh
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (error) {
      setError('An error occurred while changing password');
    } finally {
      setIsLoading(false);
    }
  };

  const isFirstLogin = session?.user?.mustChangePassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-4">
            <img 
              src="/logo-bsg.png" 
              alt="Bank SulutGo" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            Change Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isFirstLogin 
              ? 'You must change your password before continuing'
              : 'Please enter your current password and choose a new one'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Requirements</CardTitle>
            <CardDescription>
              Your new password must meet all of the following criteria:
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Password changed successfully! Redirecting...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {isFirstLogin && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                    <strong>First Login:</strong> For security reasons, you must set a new password before accessing the system.
                  </div>
                )}

                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs space-y-1">
                        <div className={`flex items-center ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                          {passwordStrength.length ? '✓' : '○'} At least 8 characters
                        </div>
                        <div className={`flex items-center ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          {passwordStrength.uppercase ? '✓' : '○'} One uppercase letter
                        </div>
                        <div className={`flex items-center ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          {passwordStrength.lowercase ? '✓' : '○'} One lowercase letter
                        </div>
                        <div className={`flex items-center ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                          {passwordStrength.number ? '✓' : '○'} One number
                        </div>
                        <div className={`flex items-center ${passwordStrength.special ? 'text-green-600' : 'text-gray-400'}`}>
                          {passwordStrength.special ? '✓' : '○'} One special character (@$!%*?&)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !allChecksPassed || newPassword !== confirmPassword}
                    className="flex-1"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                  {!isFirstLogin && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/')}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}