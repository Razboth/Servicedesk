import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    branchId?: string | null
    branchName?: string | null
    supportGroupId?: string | null
    supportGroupCode?: string | null
    mustChangePassword?: boolean
    isFirstLogin?: boolean
  }

  interface Session {
    user: {
      id: string
      role: string
      branchId?: string | null
      branchName?: string | null
      supportGroupId?: string | null
      supportGroupCode?: string | null
      mustChangePassword?: boolean
      isFirstLogin?: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    branchId?: string | null
    branchName?: string | null
    supportGroupId?: string | null
    supportGroupCode?: string | null
    mustChangePassword?: boolean
    isFirstLogin?: boolean
  }
}