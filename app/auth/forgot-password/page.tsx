'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVersionString, APP_VERSION } from '@/lib/version';
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Info,
  Shield,
  Lock
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } catch (error) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
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
                Pemulihan
                <br />
                <span className="text-primary-foreground/80">Kata Sandi</span>
              </h1>
              <p className="text-lg text-primary-foreground/70 max-w-md">
                Pemulihan kata sandi yang aman untuk akun Bank SulutGo ServiceDesk.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Proses Aman</p>
                  <p className="text-sm text-primary-foreground/60">Kata sandi sementara dikirim via email</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Pemulihan Cepat</p>
                  <p className="text-sm text-primary-foreground/60">Akses kembali dalam hitungan menit</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-primary-foreground/50">
            {APP_VERSION.copyright}
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
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

          {isSubmitted ? (
            // Success State
            <>
              {/* Header */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--success)/0.1)]">
                    <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Periksa Email Anda
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Kata sandi sementara telah dikirim ke alamat email Anda
                </p>
              </div>

              {/* Success Content */}
              <div className="space-y-6">
                {/* Email Info */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Jika akun dengan email <strong className="text-foreground">{email}</strong> terdaftar, Anda akan menerima kata sandi sementara untuk login.
                  </p>
                </div>

                {/* Next Steps */}
                <div className="p-4 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)]">
                  <p className="text-sm font-medium text-[hsl(var(--info))]">
                    Langkah selanjutnya:
                  </p>
                  <ol className="text-sm text-[hsl(var(--info)/0.8)] mt-2 space-y-1 list-decimal list-inside">
                    <li>Periksa email Anda (termasuk folder spam)</li>
                    <li>Login menggunakan kata sandi sementara</li>
                    <li>Anda akan diminta membuat kata sandi baru</li>
                  </ol>
                </div>

                {/* Warning */}
                <div className="p-4 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)]">
                  <p className="text-sm font-medium text-[hsl(var(--warning))]">
                    Tidak menerima email?
                  </p>
                  <ul className="text-sm text-[hsl(var(--warning)/0.8)] mt-2 space-y-1 list-disc list-inside">
                    <li>Periksa folder spam atau junk</li>
                    <li>Pastikan alamat email benar</li>
                    <li>Hubungi IT Support jika masalah berlanjut</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link href="/auth/signin" className="block">
                    <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                      <Mail className="mr-2 h-4 w-4" />
                      Ke Halaman Login
                    </Button>
                  </Link>

                  <Button
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full h-12 border-border text-foreground hover:bg-muted"
                  >
                    Coba email lain
                  </Button>
                </div>
              </div>

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
            </>
          ) : (
            // Form State
            <>
              {/* Logo above form */}
              <div className="hidden lg:block">
                <img
                  src="/logo-bsg.png"
                  alt="Bank SulutGo"
                  className="h-14 w-auto"
                />
              </div>

              {/* Header */}
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Lupa Kata Sandi?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Masukkan email Anda dan kami akan mengirimkan kata sandi sementara untuk login
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      Alamat Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-background border-input"
                        placeholder="Masukkan alamat email Anda"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
                    <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Kata sandi sementara akan dikirim ke email terdaftar. Anda akan diminta untuk mengubah kata sandi setelah login.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Kirim Kata Sandi Sementara
                    </>
                  )}
                </Button>

                <Link href="/auth/signin" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-border text-foreground hover:bg-muted"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali ke Login
                  </Button>
                </Link>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
