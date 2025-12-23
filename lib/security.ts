// Security utilities for input sanitization and validation
import { randomBytes } from 'crypto';

/**
 * Sanitize search input to prevent injection attacks
 * @param input - Raw search input
 * @returns Sanitized search string
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters and patterns
  const sanitized = input
    // Remove SQL injection patterns
    .replace(/['";\\]/g, '')
    // Remove script tags and javascript
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potentially dangerous patterns
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim();

  // Limit length to prevent DoS
  return sanitized.slice(0, 200);
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename for file uploads
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  // Remove path traversal attempts
  const sanitized = filename
    .replace(/[\/\\:*?"<>|]/g, '_') // Replace invalid filename characters
    .replace(/\.\./g, '_') // Remove path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  // Ensure filename is not empty and has reasonable length
  const result = sanitized || 'file';
  return result.slice(0, 255);
}

/**
 * Validate and sanitize phone number
 * @param phone - Phone number to validate
 * @returns Sanitized phone number or null if invalid
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except + at the start
  const sanitized = phone.replace(/[^\d+]/g, '').replace(/\+(?=.*\+)/g, '');
  
  // Basic validation - should be between 10-15 digits
  const digitCount = sanitized.replace(/\+/, '').length;
  if (digitCount < 10 || digitCount > 15) {
    return null;
  }

  return sanitized;
}

/**
 * Rate limiting key generator
 * @param ip - IP address
 * @param endpoint - API endpoint
 * @returns Rate limiting key
 */
export function generateRateLimitKey(ip: string, endpoint: string): string {
  return `${ip}:${endpoint}`;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validatePasswordStrength(password: string): { 
  isValid: boolean; 
  message: string; 
  score: number; 
} {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required', score: 0 };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length < 8) {
    feedback.push('at least 8 characters');
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    feedback.push('one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('one special character');
  } else {
    score += 1;
  }

  const isValid = score >= 4; // Require at least 4 out of 5 criteria
  const message = isValid 
    ? 'Password is strong' 
    : `Password must contain ${feedback.join(', ')}`;

  return { isValid, message, score };
}

/**
 * Escape HTML to prevent XSS
 * @param unsafe - Unsafe HTML string
 * @returns HTML escaped string
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate secure random token
 * @param length - Token length (default: 32)
 * @returns Secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(Math.ceil(length * 0.75)).toString('base64url').slice(0, length);
}

/**
 * Validate and sanitize numeric input
 * @param input - Input to validate
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumericInput(
  input: any, 
  min?: number, 
  max?: number
): number | null {
  const num = parseFloat(input);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  if (min !== undefined && num < min) {
    return null;
  }
  
  if (max !== undefined && num > max) {
    return null;
  }
  
  return num;
}