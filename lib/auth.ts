import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { getConfig } from '@/lib/env-config'

const prisma = new PrismaClient()

// Account lockout configuration from environment or defaults
const MAX_LOGIN_ATTEMPTS = getConfig('MAX_LOGIN_ATTEMPTS') || 5
const LOCKOUT_DURATION = (getConfig('LOCKOUT_DURATION') || 30) * 60 * 1000 // Convert minutes to milliseconds

// Helper function to extract IP address from request headers
async function getClientIP(): Promise<string | undefined> {
  try {
    const headersList = await headers()
    
    // Helper function to normalize IPv4-mapped IPv6 addresses
    const normalizeIP = (ip: string): string => {
      // Remove IPv4-mapped IPv6 prefix ::ffff:
      if (ip.startsWith('::ffff:')) {
        return ip.substring(7)
      }
      return ip
    }
    
    // Check for forwarded IP from proxy/load balancer
    const forwardedFor = headersList.get('x-forwarded-for')
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return normalizeIP(forwardedFor.split(',')[0].trim())
    }
    
    // Check for real IP from proxy
    const realIP = headersList.get('x-real-ip')
    if (realIP) {
      return normalizeIP(realIP.trim())
    }
    
    // Check for client IP
    const clientIP = headersList.get('x-client-ip')
    if (clientIP) {
      return normalizeIP(clientIP.trim())
    }
    
    // Check for CF-Connecting-IP (Cloudflare)
    const cfConnectingIP = headersList.get('cf-connecting-ip')
    if (cfConnectingIP) {
      return normalizeIP(cfConnectingIP.trim())
    }
    
    // Check for true-client-ip
    const trueClientIP = headersList.get('true-client-ip')
    if (trueClientIP) {
      return normalizeIP(trueClientIP.trim())
    }
    
    return undefined
  } catch (error) {
    console.error('Error extracting client IP:', error)
    return undefined
  }
}

// Helper function to check if account is locked
async function isAccountLocked(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { loginAttempts: true, lockedAt: true }
  })

  if (!user || !user.lockedAt) return false

  // Check if lockout period has expired
  const lockoutExpired = new Date().getTime() - new Date(user.lockedAt).getTime() > LOCKOUT_DURATION
  
  if (lockoutExpired) {
    // Reset lockout if expired
    await prisma.user.update({
      where: { username },
      data: {
        loginAttempts: 0,
        lockedAt: null,
        lastLoginAttempt: null
      }
    })
    return false
  }

  return user.loginAttempts >= MAX_LOGIN_ATTEMPTS
}

// Helper function to record login attempt
async function recordLoginAttempt(username: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, loginAttempts: true, email: true }
  })

  if (!user) {
    // Record attempt even for non-existent users
    await prisma.loginAttempt.create({
      data: {
        email: username, // Store username in email field for backward compatibility
        success: false,
        ipAddress,
        userAgent
      }
    })
    return
  }

  const newAttempts = success ? 0 : user.loginAttempts + 1
  const shouldLock = !success && newAttempts >= MAX_LOGIN_ATTEMPTS
  
  // Update user login tracking
  await prisma.user.update({
    where: { username },
    data: {
      loginAttempts: newAttempts,
      lastLoginAttempt: new Date(),
      lockedAt: shouldLock ? new Date() : undefined,
      lastActivity: success ? new Date() : undefined
    }
  })

  // Record in audit log
  await prisma.loginAttempt.create({
    data: {
      email: user.email, // Store actual email for audit purposes
      success,
      ipAddress,
      userAgent,
      lockTriggered: shouldLock
    }
  })
}

// Generate unique cookie name based on port or instance
const getCookieName = () => {
  const port = process.env.PORT || '3000'
  const instanceId = process.env.INSTANCE_ID || port
  const baseToken = process.env.NODE_ENV === 'production'
    ? '__Secure-bsg-auth.session-token'
    : 'bsg-auth.session-token'
  return `${baseToken}-${instanceId}`
}

const authOptions = {
  // Use secure cookies in production with unique names per instance
  cookies: {
    sessionToken: {
      name: getCookieName(),
      options: {
        httpOnly: true,
        sameSite: 'lax' as const, // Changed from 'strict' to allow cross-origin navigation
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined // Let browser handle domain to prevent cross-domain sharing
      }
    },
    callbackUrl: {
      name: `bsg-auth.callback-url-${process.env.PORT || '3000'}`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `bsg-auth.csrf-token-${process.env.PORT || '3000'}`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const username = credentials.username as string
        const password = credentials.password as string

        // Extract IP and User Agent from request headers
        const ipAddress = await getClientIP()
        const headersList = await headers()
        const userAgent = headersList.get('user-agent')
        
        // Log for debugging
        console.log('Login attempt:', { username, ipAddress, userAgent: userAgent?.slice(0, 50) })

        try {
          // Check if account is locked
          if (await isAccountLocked(username)) {
            await recordLoginAttempt(username, false, ipAddress, userAgent || undefined)
            throw new Error('ACCOUNT_LOCKED')
          }

          // Find user in database
          const user = await prisma.user.findUnique({
            where: {
              username: username,
              isActive: true
            },
            include: {
              branch: true
            }
          })

          if (!user || !user.password) {
            await recordLoginAttempt(username, false, ipAddress, userAgent || undefined)
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            await recordLoginAttempt(username, false, ipAddress, userAgent || undefined)
            return null
          }

          // Successful login - record attempt and update activity
          await recordLoginAttempt(username, true, ipAddress, userAgent || undefined)
          
          // Update isFirstLogin to false after successful first login
          if (user.isFirstLogin) {
            await prisma.user.update({
              where: { id: user.id },
              data: { isFirstLogin: false }
            })
          }

          // Get user with support group
          const userWithSupportGroup = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              supportGroup: true
            }
          })

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branchName: user.branch?.name,
            supportGroupId: userWithSupportGroup?.supportGroupId,
            supportGroupCode: userWithSupportGroup?.supportGroup?.code,
            mustChangePassword: user.mustChangePassword,
            isFirstLogin: user.isFirstLogin,
            avatar: user.avatar
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'ACCOUNT_LOCKED') {
            throw new Error('Your account has been locked due to too many failed login attempts. Please contact your administrator.')
          }
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 8 * 60 * 60, // 8 hours session lifetime
    updateAge: 60 * 60, // Update session every hour if active
  },
  jwt: {
    maxAge: 8 * 60 * 60, // JWT expires in 8 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.sub = user.id; // Ensure sub is set for session
        token.role = user.role;
        token.branchId = user.branchId;
        token.branchName = user.branchName;
        token.supportGroupId = user.supportGroupId;
        token.supportGroupCode = user.supportGroupCode;
        token.mustChangePassword = user.mustChangePassword;
        token.isFirstLogin = user.isFirstLogin;
        token.avatar = user.avatar;
      }
      
      // Handle session updates (when update() is called)
      if (trigger === 'update' && session?.avatar) {
        token.avatar = session.avatar;
      }
      
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub || token.id; // Use sub or id, whichever is available
        session.user.role = token.role as string;
        session.user.branchId = token.branchId as string | null;
        session.user.branchName = token.branchName as string | null;
        session.user.supportGroupId = token.supportGroupId as string | null;
        session.user.supportGroupCode = token.supportGroupCode as string | null;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.isFirstLogin = token.isFirstLogin as boolean;
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  // Dynamic URL configuration to handle different hosts (IP addresses, domains)
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)