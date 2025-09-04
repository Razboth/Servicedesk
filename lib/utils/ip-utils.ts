import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers
 * Handles various proxy headers and fallbacks
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check other common headers
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const clientIp = request.headers.get('x-client-ip');
  if (clientIp) {
    return clientIp;
  }

  // Cloudflare specific header
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to remote address or unknown
  const remoteAddr = request.headers.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr;
  }

  // If all else fails, return unknown
  return 'unknown';
}

/**
 * Check if an IP address is private/internal
 */
export function isPrivateIp(ip: string): boolean {
  // Check for private IP ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0 - 10.255.255.255
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0 - 172.31.255.255
    /^192\.168\./, // 192.168.0.0 - 192.168.255.255
    /^127\./, // 127.0.0.0 - 127.255.255.255 (loopback)
    /^::1$/, // IPv6 loopback
    /^fc00:/, // IPv6 private
    /^fe80:/, // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Format IP address for display
 */
export function formatIpAddress(ip: string): string {
  if (ip === 'unknown') {
    return 'Unknown';
  }
  
  if (ip === '::1' || ip === '127.0.0.1') {
    return 'Localhost';
  }

  if (isPrivateIp(ip)) {
    return `${ip} (Private)`;
  }

  return ip;
}