/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  env: {
    // NEXTAUTH_URL is now dynamically detected based on the request host
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
  },
  experimental: {
    // Increase body size limit for large file downloads (default is 4MB)
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
}

module.exports = nextConfig