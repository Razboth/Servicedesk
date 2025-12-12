'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVersionString, APP_VERSION } from '@/lib/version';
import { LogIn, User, Lock, AlertCircle, CheckCircle2, Shield, Sparkles } from 'lucide-react';

function SignInForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

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
        if (result.error.includes('locked') || result.error.includes('administrator')) {
          setError('Akun Anda telah dikunci karena terlalu banyak percobaan login gagal. Silakan hubungi administrator untuk membuka kunci akun Anda.');
        } else {
          try {
            const response = await fetch('/api/auth/login-attempts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: username })
            });
            const data = await response.json();

            if (data.isLocked) {
              setError('Akun Anda telah dikunci karena terlalu banyak percobaan login gagal. Silakan hubungi administrator untuk membuka kunci akun Anda.');
            } else if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
              setError(`Kredensial tidak valid. ${data.remainingAttempts} percobaan tersisa sebelum akun dikunci.`);
            } else {
              setError('Kredensial tidak valid');
            }
          } catch {
            setError('Kredensial tidak valid');
          }
        }
      } else {
        const session = await getSession();
        if (session) {
          if (session.user?.mustChangePassword) {
            router.push('/auth/change-password');
          } else {
            router.push('/');
          }
        }
      }
    } catch (error) {
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding & Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg className="absolute top-0 right-0 w-[600px] h-[600px] text-primary-foreground/5" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="currentColor" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-[400px] h-[400px] text-primary-foreground/5" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="currentColor" />
            </svg>
          </div>
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary-foreground" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div>
            <img
              src="/logo-bsg.png"
              alt="Bank SulutGo"
              className="h-16 w-auto brightness-0 invert"
            />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Portal Layanan
                <br />
                <span className="text-primary-foreground/80">TI Bank SulutGo</span>
              </h1>
              <p className="text-lg text-primary-foreground/70 max-w-md">
                Dukungan TI dan layanan yang efisien untuk Bank SulutGo di 250+ cabang.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Sesuai ITIL v4</p>
                  <p className="text-sm text-primary-foreground/60">Manajemen layanan kelas enterprise</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Monitoring Real-time</p>
                  <p className="text-sm text-primary-foreground/60">Pemantauan status ATM & jaringan</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-primary-foreground/50">
            {APP_VERSION.copyright}
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <img
              src="/logo-bsg.png"
              alt="Bank SulutGo"
              className="h-16 w-auto mx-auto"
            />
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Selamat Datang
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Masuk ke akun ServiceDesk Anda
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[hsl(var(--success))]">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">
                  Nama Pengguna
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 bg-background border-input"
                    placeholder="Masukkan nama pengguna"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-background border-input"
                    placeholder="Masukkan kata sandi"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Lupa kata sandi?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Sedang masuk...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Masuk
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">
                Butuh bantuan?
              </span>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Hubungi IT Support untuk masalah akun
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>{getVersionString()}</span>
              <span>|</span>
              <Link href="/about" className="hover:text-foreground transition-colors">
                Tentang
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-foreground">Memuat...</span>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
