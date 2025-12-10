'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getVersionString, APP_VERSION } from '@/lib/version';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Check,
  X,
  Info,
  Shield,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

function ChangePasswordForm() {
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
  const { data: session } = useSession();

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
      setError('Kata sandi baru dan konfirmasi tidak cocok');
      setIsLoading(false);
      return;
    }

    if (!allChecksPassed) {
      setError('Mohon penuhi semua persyaratan kata sandi');
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
        setError(data.error || 'Gagal mengubah kata sandi');
      } else {
        setSuccess(true);
        setTimeout(async () => {
          await signOut({
            callbackUrl: '/auth/signin?message=Kata sandi berhasil diubah. Silakan masuk kembali.'
          });
        }, 1500);
      }
    } catch {
      setError('Terjadi kesalahan saat mengubah kata sandi');
    } finally {
      setIsLoading(false);
    }
  };

  const isFirstLogin = session?.user?.mustChangePassword;

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'}`}>
      {met ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {text}
    </div>
  );

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
                Ubah
                <br />
                <span className="text-primary-foreground/80">Kata Sandi</span>
              </h1>
              <p className="text-lg text-primary-foreground/70 max-w-md">
                Perbarui kata sandi Anda untuk menjaga keamanan akun Bank SulutGo ServiceDesk.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Keamanan Terjamin</p>
                  <p className="text-sm text-primary-foreground/60">Kata sandi terenkripsi dengan aman</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/10">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Persyaratan Kuat</p>
                  <p className="text-sm text-primary-foreground/60">Kombinasi karakter untuk keamanan maksimal</p>
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

          {success ? (
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
                  Kata Sandi Berhasil Diubah
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Anda akan dialihkan ke halaman login...
                </p>
              </div>

              {/* Success Content */}
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[hsl(var(--success))]">
                    Kata sandi Anda telah berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru Anda.
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </div>
            </>
          ) : (
            // Form State
            <>
              {/* Header */}
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {isFirstLogin ? 'Buat Kata Sandi Baru' : 'Ubah Kata Sandi'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isFirstLogin
                    ? 'Anda harus mengubah kata sandi sebelum melanjutkan'
                    : 'Masukkan kata sandi saat ini dan pilih yang baru'}
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

                {isFirstLogin && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)]">
                    <Info className="h-5 w-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[hsl(var(--warning))]">
                      <strong>Login Pertama:</strong> Demi keamanan, Anda harus mengatur kata sandi baru sebelum mengakses sistem.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-foreground font-medium">
                      Kata Sandi Saat Ini
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Masukkan kata sandi saat ini"
                        className="pl-10 pr-10 h-12 bg-background border-input"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-foreground font-medium">
                      Kata Sandi Baru
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Masukkan kata sandi baru"
                        className="pl-10 pr-10 h-12 bg-background border-input"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Requirements */}
                    {newPassword && (
                      <div className="mt-3 p-3 rounded-lg bg-muted border border-border space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Persyaratan Kata Sandi:</p>
                        <RequirementItem met={passwordStrength.length} text="Minimal 8 karakter" />
                        <RequirementItem met={passwordStrength.uppercase} text="Satu huruf besar" />
                        <RequirementItem met={passwordStrength.lowercase} text="Satu huruf kecil" />
                        <RequirementItem met={passwordStrength.number} text="Satu angka" />
                        <RequirementItem met={passwordStrength.special} text="Satu karakter khusus (@$!%*?&)" />
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                      Konfirmasi Kata Sandi Baru
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Konfirmasi kata sandi baru"
                        className="pl-10 pr-10 h-12 bg-background border-input"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Kata sandi tidak cocok
                      </p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword && (
                      <p className="mt-1 text-xs text-[hsl(var(--success))] flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Kata sandi cocok
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !allChecksPassed || newPassword !== confirmPassword}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Mengubah Kata Sandi...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Ubah Kata Sandi
                    </>
                  )}
                </Button>

                {!isFirstLogin && (
                  <Link href="/" className="block">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 border-border text-foreground hover:bg-muted"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Kembali ke Dashboard
                    </Button>
                  </Link>
                )}
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

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-foreground">Memuat...</span>
        </div>
      </div>
    }>
      <ChangePasswordForm />
    </Suspense>
  );
}
