'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Loader2, CheckCircle, KeyRound, AlertCircle, Info } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <img
              src="/logo-bsg.png"
              alt="Bank SulutGo"
              className="h-16 w-auto mx-auto"
            />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              ServiceDesk Portal
            </h1>
          </div>

          {/* Success Card */}
          <Card className="border-border bg-card">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--success)/0.1)]">
                <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
              </div>
              <CardTitle className="text-foreground">Cek Email Anda</CardTitle>
              <CardDescription className="text-muted-foreground">
                Password sementara telah dikirim ke email Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Info Alert */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Jika akun dengan email <strong className="text-foreground">{email}</strong> terdaftar, Anda akan menerima password sementara untuk login.
                </p>
              </div>

              {/* Steps */}
              <div className="p-4 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)]">
                <p className="text-sm font-medium text-[hsl(var(--info))]">
                  Langkah selanjutnya:
                </p>
                <ol className="text-sm text-[hsl(var(--info)/0.8)] mt-2 space-y-1 list-decimal list-inside">
                  <li>Cek email Anda (termasuk folder spam)</li>
                  <li>Login menggunakan password sementara</li>
                  <li>Anda akan diminta membuat password baru</li>
                </ol>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)]">
                <p className="text-sm font-medium text-[hsl(var(--warning))]">
                  Tidak menerima email?
                </p>
                <ul className="text-sm text-[hsl(var(--warning)/0.8)] mt-2 space-y-1 list-disc list-inside">
                  <li>Periksa folder spam atau junk</li>
                  <li>Pastikan alamat email sudah benar</li>
                  <li>Hubungi IT Support jika masih bermasalah</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Link href="/auth/signin" className="block">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Mail className="mr-2 h-4 w-4" />
                    Login Sekarang
                  </Button>
                </Link>

                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted"
                >
                  Coba Email Lain
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/logo-bsg.png"
            alt="Bank SulutGo"
            className="h-16 w-auto mx-auto"
          />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            ServiceDesk Portal
          </h1>
        </div>

        {/* Form Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Lupa Password?</CardTitle>
            <CardDescription className="text-muted-foreground">
              Masukkan email Anda dan kami akan mengirimkan password sementara untuk login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

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
                    placeholder="Masukkan alamat email Anda"
                    disabled={isLoading}
                    className="pl-10 h-12 bg-background border-input"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Password sementara akan dikirim ke email terdaftar. Anda harus mengganti password setelah login.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Kirim Password Sementara
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
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Butuh bantuan? Hubungi IT Support
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
