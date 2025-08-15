import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    
    // Extract IP using the same logic as auth
    const getClientIP = (): string | undefined => {
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
        return normalizeIP(forwardedFor.split(',')[0].trim())
      }
      
      const realIP = headersList.get('x-real-ip')
      if (realIP) {
        return normalizeIP(realIP.trim())
      }
      
      const clientIP = headersList.get('x-client-ip')
      if (clientIP) {
        return normalizeIP(clientIP.trim())
      }
      
      const cfConnectingIP = headersList.get('cf-connecting-ip')
      if (cfConnectingIP) {
        return normalizeIP(cfConnectingIP.trim())
      }
      
      const trueClientIP = headersList.get('true-client-ip')
      if (trueClientIP) {
        return normalizeIP(trueClientIP.trim())
      }
      
      return undefined
    }

    const detectedIP = getClientIP()
    const userAgent = headersList.get('user-agent')

    // Get all headers for debugging
    const allHeaders: Record<string, string> = {}
    headersList.forEach((value, key) => {
      allHeaders[key] = value
    })

    return NextResponse.json({
      detectedIP,
      userAgent,
      allHeaders,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('IP test error:', error)
    return NextResponse.json(
      { error: 'Failed to detect IP', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}