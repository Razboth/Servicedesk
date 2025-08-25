/**
 * Environment Configuration
 * Maps Windows system environment variables to application config
 * Supports both .env files and Windows environment variables
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // NextAuth
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // Application
  NODE_ENV: string;
  PORT: number;
  
  // Email (Optional)
  EMAIL_SERVER?: string;
  EMAIL_FROM?: string;
  EMAIL_USER?: string;
  EMAIL_PASSWORD?: string;
  
  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  
  // Monitoring
  AUTO_START_MONITORING: boolean;
  BRANCH_MONITORING_INTERVAL: number;
  ATM_MONITORING_INTERVAL: number;
  
  // Security
  SESSION_TIMEOUT: number;
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_DURATION: number;
  
  // Logging
  LOG_LEVEL: string;
  LOG_DIR: string;
  
  // Features
  ENABLE_NETWORK_MONITORING: boolean;
  ENABLE_EMAIL_NOTIFICATIONS: boolean;
  ENABLE_AUDIT_LOGGING: boolean;
}

/**
 * Get environment variable with fallback
 * Checks both prefixed (SERVICEDESK_) and non-prefixed versions
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  // Check Windows system environment variable with prefix
  const prefixedKey = `SERVICEDESK_${key}`;
  const prefixedValue = process.env[prefixedKey];
  if (prefixedValue !== undefined) {
    return prefixedValue;
  }
  
  // Check regular environment variable (for .env compatibility)
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  
  return defaultValue;
}

/**
 * Get boolean environment variable
 */
function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = getEnvVar(key);
  if (value === undefined) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  // Required variables - will throw if not set
  const requiredVars = {
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),
    NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET')
  };
  
  // Check for required variables
  const missingVars: string[] = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => {
      console.error(`   - ${v} (or SERVICEDESK_${v})`);
    });
    console.error('\nPlease set these variables using one of these methods:');
    console.error('1. Run: .\\deployment\\setup-environment-variables.ps1');
    console.error('2. Create a .env file in the project root');
    console.error('3. Set Windows system environment variables manually');
    
    // In development, provide more helpful error
    if (process.env.NODE_ENV !== 'production') {
      console.error('\nFor development, you can copy .env.example to .env');
    }
    
    throw new Error('Missing required environment variables');
  }
  
  return {
    // Database
    DATABASE_URL: requiredVars.DATABASE_URL!,
    
    // NextAuth
    NEXTAUTH_URL: requiredVars.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: requiredVars.NEXTAUTH_SECRET!,
    
    // Application
    NODE_ENV: getEnvVar('NODE_ENV', 'production')!,
    PORT: getNumberEnv('PORT', 3000),
    
    // Email (Optional)
    EMAIL_SERVER: getEnvVar('EMAIL_SERVER'),
    EMAIL_FROM: getEnvVar('EMAIL_FROM'),
    EMAIL_USER: getEnvVar('EMAIL_USER'),
    EMAIL_PASSWORD: getEnvVar('EMAIL_PASSWORD'),
    
    // File Upload
    MAX_FILE_SIZE: getNumberEnv('MAX_FILE_SIZE', 10),
    UPLOAD_DIR: getEnvVar('UPLOAD_DIR', 'C:\\ServiceDesk\\uploads')!,
    
    // Monitoring
    AUTO_START_MONITORING: getBoolEnv('AUTO_START_MONITORING', false),
    BRANCH_MONITORING_INTERVAL: getNumberEnv('BRANCH_MONITORING_INTERVAL', 120000),
    ATM_MONITORING_INTERVAL: getNumberEnv('ATM_MONITORING_INTERVAL', 60000),
    
    // Security
    SESSION_TIMEOUT: getNumberEnv('SESSION_TIMEOUT', 30),
    MAX_LOGIN_ATTEMPTS: getNumberEnv('MAX_LOGIN_ATTEMPTS', 5),
    LOCKOUT_DURATION: getNumberEnv('LOCKOUT_DURATION', 30),
    
    // Logging
    LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info')!,
    LOG_DIR: getEnvVar('LOG_DIR', 'C:\\ServiceDesk\\logs')!,
    
    // Features
    ENABLE_NETWORK_MONITORING: getBoolEnv('ENABLE_NETWORK_MONITORING', true),
    ENABLE_EMAIL_NOTIFICATIONS: getBoolEnv('ENABLE_EMAIL_NOTIFICATIONS', false),
    ENABLE_AUDIT_LOGGING: getBoolEnv('ENABLE_AUDIT_LOGGING', true)
  };
}

/**
 * Get single environment variable value
 */
export function getConfig(key: keyof EnvConfig): any {
  const config = loadEnvConfig();
  return config[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV') === 'development';
}

/**
 * Export configuration for use in the application
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig();
  }
  return cachedConfig;
}

// Log configuration status on load (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Configuration:');
  console.log('   Source:', process.env.SERVICEDESK_DATABASE_URL ? 'Windows Environment Variables' : '.env file');
  console.log('   NODE_ENV:', getEnvVar('NODE_ENV', 'development'));
  console.log('   PORT:', getEnvVar('PORT', '3000'));
}

export default getEnvConfig;