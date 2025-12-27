/**
 * Error Handling Types
 *
 * Standardized error codes and interfaces for consistent error handling
 * across the ServiceDesk application.
 */

/**
 * Error codes for programmatic handling
 * Format: CATEGORY_XXX where XXX is a 3-digit code
 */
export enum ErrorCode {
  // Authentication errors (AUTH_0XX)
  AUTH_UNAUTHORIZED = 'AUTH_001',
  AUTH_FORBIDDEN = 'AUTH_002',
  AUTH_SESSION_EXPIRED = 'AUTH_003',
  AUTH_INVALID_CREDENTIALS = 'AUTH_004',
  AUTH_ACCOUNT_LOCKED = 'AUTH_005',
  AUTH_MFA_REQUIRED = 'AUTH_006',

  // Validation errors (VAL_0XX)
  VALIDATION_FAILED = 'VAL_001',
  VALIDATION_REQUIRED_FIELD = 'VAL_002',
  VALIDATION_INVALID_FORMAT = 'VAL_003',
  VALIDATION_CONSTRAINT_VIOLATION = 'VAL_004',
  VALIDATION_FILE_TOO_LARGE = 'VAL_005',
  VALIDATION_INVALID_FILE_TYPE = 'VAL_006',

  // Resource errors (RES_0XX)
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_ALREADY_EXISTS = 'RES_002',
  RESOURCE_CONFLICT = 'RES_003',
  RESOURCE_LOCKED = 'RES_004',
  RESOURCE_DELETED = 'RES_005',

  // Business logic errors (BIZ_0XX)
  BUSINESS_RULE_VIOLATION = 'BIZ_001',
  BUSINESS_PRIORITY_VALIDATION = 'BIZ_002',
  BUSINESS_SLA_BREACH = 'BIZ_003',
  BUSINESS_APPROVAL_REQUIRED = 'BIZ_004',
  BUSINESS_STATUS_TRANSITION = 'BIZ_005',
  BUSINESS_INSUFFICIENT_PERMISSIONS = 'BIZ_006',
  BUSINESS_ASSIGNMENT_ERROR = 'BIZ_007',

  // System errors (SYS_0XX)
  INTERNAL_ERROR = 'SYS_001',
  DATABASE_ERROR = 'SYS_002',
  EXTERNAL_SERVICE_ERROR = 'SYS_003',
  RATE_LIMIT_EXCEEDED = 'SYS_004',
  SERVICE_UNAVAILABLE = 'SYS_005',
  TIMEOUT_ERROR = 'SYS_006',

  // Network errors (NET_0XX)
  NETWORK_ERROR = 'NET_001',
  CONNECTION_REFUSED = 'NET_002',
  DNS_ERROR = 'NET_003',

  // Integration errors (INT_0XX)
  OMNI_API_ERROR = 'INT_001',
  EMAIL_SEND_ERROR = 'INT_002',
  EXTERNAL_API_ERROR = 'INT_003',
}

/**
 * Field-level error for form validation
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Standardized API error response
 */
export interface ApiError {
  code: ErrorCode | string;
  message: string;           // User-friendly summary
  details?: string;          // Technical details (optional)
  fieldErrors?: FieldError[];// For form validation
  timestamp: string;
  requestId?: string;        // For support/debugging
  path?: string;             // API path that failed
  suggestion?: string;       // Helpful suggestion to fix
}

/**
 * Full API error response wrapper
 */
export interface ApiErrorResponse {
  error: ApiError;
}

/**
 * User-friendly messages for error codes
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Silakan masuk untuk melanjutkan',
  [ErrorCode.AUTH_FORBIDDEN]: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Sesi Anda telah berakhir. Silakan masuk kembali',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Email atau password salah',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Akun Anda terkunci. Hubungi administrator',
  [ErrorCode.AUTH_MFA_REQUIRED]: 'Verifikasi dua faktor diperlukan',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Silakan periksa input Anda dan coba lagi',
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Field yang wajib diisi belum lengkap',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 'Format data tidak valid',
  [ErrorCode.VALIDATION_CONSTRAINT_VIOLATION]: 'Data tidak memenuhi persyaratan',
  [ErrorCode.VALIDATION_FILE_TOO_LARGE]: 'Ukuran file terlalu besar',
  [ErrorCode.VALIDATION_INVALID_FILE_TYPE]: 'Tipe file tidak diizinkan',

  // Resource
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Data yang diminta tidak ditemukan',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Data sudah ada',
  [ErrorCode.RESOURCE_CONFLICT]: 'Terjadi konflik data. Silakan refresh dan coba lagi',
  [ErrorCode.RESOURCE_LOCKED]: 'Data sedang digunakan oleh pengguna lain',
  [ErrorCode.RESOURCE_DELETED]: 'Data telah dihapus',

  // Business
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 'Operasi tidak diizinkan oleh aturan bisnis',
  [ErrorCode.BUSINESS_PRIORITY_VALIDATION]: 'Validasi prioritas gagal',
  [ErrorCode.BUSINESS_SLA_BREACH]: 'Pelanggaran SLA terdeteksi',
  [ErrorCode.BUSINESS_APPROVAL_REQUIRED]: 'Persetujuan diperlukan untuk melanjutkan',
  [ErrorCode.BUSINESS_STATUS_TRANSITION]: 'Perubahan status tidak valid',
  [ErrorCode.BUSINESS_INSUFFICIENT_PERMISSIONS]: 'Izin tidak mencukupi untuk operasi ini',
  [ErrorCode.BUSINESS_ASSIGNMENT_ERROR]: 'Gagal menetapkan tugas',

  // System
  [ErrorCode.INTERNAL_ERROR]: 'Terjadi kesalahan sistem. Silakan coba lagi nanti',
  [ErrorCode.DATABASE_ERROR]: 'Gagal mengakses database. Silakan coba lagi',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Layanan eksternal tidak tersedia',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Terlalu banyak permintaan. Silakan tunggu sebentar',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Layanan sedang tidak tersedia',
  [ErrorCode.TIMEOUT_ERROR]: 'Permintaan timeout. Silakan coba lagi',

  // Network
  [ErrorCode.NETWORK_ERROR]: 'Gagal terhubung ke server. Periksa koneksi internet Anda',
  [ErrorCode.CONNECTION_REFUSED]: 'Koneksi ditolak oleh server',
  [ErrorCode.DNS_ERROR]: 'Gagal menghubungi server',

  // Integration
  [ErrorCode.OMNI_API_ERROR]: 'Gagal terhubung ke Omni/Sociomile',
  [ErrorCode.EMAIL_SEND_ERROR]: 'Gagal mengirim email notifikasi',
  [ErrorCode.EXTERNAL_API_ERROR]: 'Gagal terhubung ke layanan eksternal',
};

/**
 * HTTP status codes for error codes
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  // Auth - 401/403
  [ErrorCode.AUTH_UNAUTHORIZED]: 401,
  [ErrorCode.AUTH_FORBIDDEN]: 403,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 403,
  [ErrorCode.AUTH_MFA_REQUIRED]: 403,

  // Validation - 400
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 400,
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCode.VALIDATION_CONSTRAINT_VIOLATION]: 400,
  [ErrorCode.VALIDATION_FILE_TOO_LARGE]: 400,
  [ErrorCode.VALIDATION_INVALID_FILE_TYPE]: 400,

  // Resource - 404/409
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 423,
  [ErrorCode.RESOURCE_DELETED]: 410,

  // Business - 400/403
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,
  [ErrorCode.BUSINESS_PRIORITY_VALIDATION]: 400,
  [ErrorCode.BUSINESS_SLA_BREACH]: 400,
  [ErrorCode.BUSINESS_APPROVAL_REQUIRED]: 403,
  [ErrorCode.BUSINESS_STATUS_TRANSITION]: 400,
  [ErrorCode.BUSINESS_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.BUSINESS_ASSIGNMENT_ERROR]: 400,

  // System - 500
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT_ERROR]: 504,

  // Network - 500
  [ErrorCode.NETWORK_ERROR]: 500,
  [ErrorCode.CONNECTION_REFUSED]: 503,
  [ErrorCode.DNS_ERROR]: 503,

  // Integration - 502
  [ErrorCode.OMNI_API_ERROR]: 502,
  [ErrorCode.EMAIL_SEND_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
};

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: ErrorCode | string): string {
  if (code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return 'Terjadi kesalahan. Silakan coba lagi';
}

/**
 * Get HTTP status code for an error code
 */
export function getErrorStatusCode(code: ErrorCode | string): number {
  if (code in ERROR_STATUS_CODES) {
    return ERROR_STATUS_CODES[code as ErrorCode];
  }
  return 500;
}
