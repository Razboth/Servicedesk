'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Loader2, CheckCircle, KeyRound } from 'lucide-react';

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
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-center">Cek Email Anda</CardTitle>
              <CardDescription className="text-center">
                Password sementara telah dikirim ke email Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  Jika akun dengan email <strong>{email}</strong> terdaftar, Anda akan menerima password sementara untuk login.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <p className="text-sm text-blue-800 font-medium">
                  Langkah selanjutnya:
                </p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Cek email Anda (termasuk folder spam)</li>
                  <li>Login menggunakan password sementara</li>
                  <li>Anda akan diminta membuat password baru</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Tidak menerima email?</strong>
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Periksa folder spam atau junk</li>
                  <li>Pastikan alamat email sudah benar</li>
                  <li>Hubungi IT Support jika masih bermasalah</li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <Link href="/auth/signin" className="block">
                  <Button variant="default" className="w-full">
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
                  className="w-full"
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
            <CardTitle>Lupa Password?</CardTitle>
            <CardDescription>
              Masukkan email Anda dan kami akan mengirimkan password sementara untuk login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
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
                />
              </div>

              <Alert>
                <AlertDescription>
                  Password sementara akan dikirim ke email terdaftar. Anda harus mengganti password setelah login.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full"
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
                  <Button type="button" variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali ke Login
                  </Button>
                </Link>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Butuh bantuan? Hubungi IT Support
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
