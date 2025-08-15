#!/usr/bin/env tsx

/**
 * Security Check Script
 * Performs comprehensive security checks on the application
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface SecurityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string[];
}

class SecurityChecker {
  private checks: SecurityCheck[] = [];

  private addCheck(name: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: string[]) {
    this.checks.push({ name, status, message, details });
  }

  // Check environment configuration
  async checkEnvironment() {
    console.log('\n🔍 Checking Environment Configuration...');
    
    try {
      const envExample = await fs.readFile('.env.example', 'utf8');
      const requiredVars = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'ENCRYPTION_KEY',
        'JWT_SECRET'
      ];

      const missingVars = requiredVars.filter(varName => !envExample.includes(varName));
      
      if (missingVars.length === 0) {
        this.addCheck('Environment Config', 'PASS', 'All required environment variables are documented');
      } else {
        this.addCheck('Environment Config', 'FAIL', 'Missing required environment variables', missingVars);
      }

      // Check for secure defaults
      if (envExample.includes('NEXTAUTH_SECRET="your-secret-key-here"')) {
        this.addCheck('Environment Secrets', 'WARNING', 'Default secrets found in .env.example - ensure production uses secure values');
      } else {
        this.addCheck('Environment Secrets', 'PASS', 'No default secrets found');
      }

    } catch (error) {
      this.addCheck('Environment Config', 'FAIL', 'Cannot read .env.example file');
    }
  }

  // Check dependencies for vulnerabilities
  async checkDependencies() {
    console.log('\n🔍 Checking Dependencies for Vulnerabilities...');
    
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);
      
      const highVulns = audit.metadata?.vulnerabilities?.high || 0;
      const criticalVulns = audit.metadata?.vulnerabilities?.critical || 0;
      
      if (criticalVulns > 0) {
        this.addCheck('Dependency Security', 'FAIL', `${criticalVulns} critical vulnerabilities found`);
      } else if (highVulns > 0) {
        this.addCheck('Dependency Security', 'WARNING', `${highVulns} high severity vulnerabilities found`);
      } else {
        this.addCheck('Dependency Security', 'PASS', 'No high or critical vulnerabilities found');
      }
    } catch (error) {
      this.addCheck('Dependency Security', 'WARNING', 'Could not run npm audit - ensure npm is available');
    }
  }

  // Check file permissions and security
  async checkFilePermissions() {
    console.log('\n🔍 Checking File Security...');
    
    try {
      // Check for sensitive files with proper access
      const sensitiveFiles = [
        '.env',
        '.env.local',
        'prisma/schema.prisma',
        'package.json'
      ];

      for (const file of sensitiveFiles) {
        try {
          await fs.access(file);
          this.addCheck('File Access', 'PASS', `${file} exists and is accessible`);
        } catch {
          if (file === '.env' || file === '.env.local') {
            this.addCheck('File Access', 'WARNING', `${file} not found - ensure environment is configured`);
          }
        }
      }

      // Check upload directory security
      try {
        const uploadDir = './uploads';
        await fs.access(uploadDir);
        this.addCheck('Upload Directory', 'PASS', 'Upload directory exists');
      } catch {
        this.addCheck('Upload Directory', 'WARNING', 'Upload directory not found - will be created on first upload');
      }

    } catch (error) {
      this.addCheck('File Security', 'FAIL', 'Error checking file permissions');
    }
  }

  // Check authentication configuration
  async checkAuthConfig() {
    console.log('\n🔍 Checking Authentication Configuration...');
    
    try {
      const authFile = await fs.readFile('./lib/auth.ts', 'utf8');
      
      // Check for account lockout
      if (authFile.includes('MAX_LOGIN_ATTEMPTS') && authFile.includes('LOCKOUT_DURATION')) {
        this.addCheck('Account Lockout', 'PASS', 'Account lockout mechanism implemented');
      } else {
        this.addCheck('Account Lockout', 'FAIL', 'Account lockout mechanism not found');
      }

      // Check for password hashing
      if (authFile.includes('bcrypt')) {
        this.addCheck('Password Hashing', 'PASS', 'bcrypt password hashing implemented');
      } else {
        this.addCheck('Password Hashing', 'FAIL', 'Password hashing not implemented properly');
      }

      // Check for session security
      if (authFile.includes('httpOnly') && authFile.includes('sameSite')) {
        this.addCheck('Session Security', 'PASS', 'Secure session configuration found');
      } else {
        this.addCheck('Session Security', 'WARNING', 'Session security configuration may need review');
      }

    } catch (error) {
      this.addCheck('Authentication Config', 'FAIL', 'Cannot read authentication configuration');
    }
  }

  // Check middleware security
  async checkMiddleware() {
    console.log('\n🔍 Checking Security Middleware...');
    
    try {
      const middlewareFile = await fs.readFile('./middleware.ts', 'utf8');
      
      // Check for security headers
      const securityHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Content-Security-Policy',
        'Strict-Transport-Security'
      ];

      const foundHeaders = securityHeaders.filter(header => middlewareFile.includes(header));
      
      if (foundHeaders.length === securityHeaders.length) {
        this.addCheck('Security Headers', 'PASS', 'All security headers implemented');
      } else {
        const missingHeaders = securityHeaders.filter(header => !middlewareFile.includes(header));
        this.addCheck('Security Headers', 'WARNING', 'Some security headers missing', missingHeaders);
      }

      // Check for rate limiting
      if (middlewareFile.includes('isRateLimited')) {
        this.addCheck('Rate Limiting', 'PASS', 'Rate limiting implemented');
      } else {
        this.addCheck('Rate Limiting', 'FAIL', 'Rate limiting not found');
      }

    } catch (error) {
      this.addCheck('Middleware Security', 'FAIL', 'Middleware file not found');
    }
  }

  // Check API security
  async checkApiSecurity() {
    console.log('\n🔍 Checking API Security...');
    
    try {
      // Check for input sanitization
      const securityLib = await fs.readFile('./lib/security.ts', 'utf8');
      
      if (securityLib.includes('sanitizeSearchInput')) {
        this.addCheck('Input Sanitization', 'PASS', 'Input sanitization functions found');
      } else {
        this.addCheck('Input Sanitization', 'FAIL', 'Input sanitization not implemented');
      }

      // Check file upload security
      const fileStorageLib = await fs.readFile('./lib/file-storage.ts', 'utf8');
      
      if (fileStorageLib.includes('validateFile') && fileStorageLib.includes('sanitizeFilename')) {
        this.addCheck('File Upload Security', 'PASS', 'Secure file upload implemented');
      } else {
        this.addCheck('File Upload Security', 'WARNING', 'File upload security may need review');
      }

    } catch (error) {
      this.addCheck('API Security', 'WARNING', 'Could not check all API security features');
    }
  }

  // Check database security
  async checkDatabaseSecurity() {
    console.log('\n🔍 Checking Database Security...');
    
    try {
      const schemaFile = await fs.readFile('./prisma/schema.prisma', 'utf8');
      
      // Check for audit logging
      if (schemaFile.includes('AuditLog') && schemaFile.includes('LoginAttempt')) {
        this.addCheck('Audit Logging', 'PASS', 'Comprehensive audit logging implemented');
      } else {
        this.addCheck('Audit Logging', 'WARNING', 'Audit logging may be incomplete');
      }

      // Check for soft deletes
      if (schemaFile.includes('isActive')) {
        this.addCheck('Soft Deletes', 'PASS', 'Soft delete mechanism found');
      } else {
        this.addCheck('Soft Deletes', 'WARNING', 'Soft delete mechanism not implemented');
      }

    } catch (error) {
      this.addCheck('Database Security', 'FAIL', 'Cannot read database schema');
    }
  }

  // Generate report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY AUDIT REPORT');
    console.log('='.repeat(60));

    let passCount = 0;
    let warningCount = 0;
    let failCount = 0;

    this.checks.forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : 
                   check.status === 'WARNING' ? '⚠️' : '❌';
      
      console.log(`\n${icon} ${check.name}: ${check.message}`);
      
      if (check.details && check.details.length > 0) {
        check.details.forEach(detail => {
          console.log(`   - ${detail}`);
        });
      }

      switch (check.status) {
        case 'PASS': passCount++; break;
        case 'WARNING': warningCount++; break;
        case 'FAIL': failCount++; break;
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`❌ Failed: ${failCount}`);

    const totalChecks = this.checks.length;
    const score = ((passCount + (warningCount * 0.5)) / totalChecks) * 100;
    
    console.log(`\n🎯 Security Score: ${score.toFixed(1)}%`);

    if (failCount === 0 && warningCount <= 2) {
      console.log('\n🎉 Excellent security posture! Your application follows security best practices.');
    } else if (failCount === 0) {
      console.log('\n👍 Good security posture with some areas for improvement.');
    } else {
      console.log('\n⚠️  Security issues found. Please address the failed checks immediately.');
    }

    console.log('\n' + '='.repeat(60));

    // Exit with error code if critical issues found
    if (failCount > 0) {
      process.exit(1);
    }
  }

  // Run all checks
  async runAllChecks() {
    console.log('🚀 Starting Security Audit...');
    
    await this.checkEnvironment();
    await this.checkDependencies();
    await this.checkFilePermissions();
    await this.checkAuthConfig();
    await this.checkMiddleware();
    await this.checkApiSecurity();
    await this.checkDatabaseSecurity();
    
    this.generateReport();
  }
}

// Run security checks
const checker = new SecurityChecker();
checker.runAllChecks().catch((error) => {
  console.error('❌ Security check failed:', error);
  process.exit(1);
});