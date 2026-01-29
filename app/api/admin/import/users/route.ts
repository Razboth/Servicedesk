import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImportMode } from '@prisma/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Valid roles
const VALID_ROLES = ['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN', 'SECURITY_ANALYST', 'AGENT', 'SUPER_ADMIN'];

// Validation for user data
function validateUserData(data: any, isUpdate: boolean = false): string[] {
  const errors: string[] = [];

  if (!data.username || data.username.trim() === '') {
    errors.push('Username is required');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  }

  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }

  // Password required only for new users or when explicitly updating password
  if (!isUpdate && (!data.password || data.password.trim() === '')) {
    errors.push('Password is required for new users');
  }

  if (data.role && !VALID_ROLES.includes(data.role)) {
    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Password strength validation (only if password provided)
  if (data.password && data.password.trim().length > 0 && data.password.trim().length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return errors;
}

// POST /api/admin/import/users - Import users
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importModeStr = formData.get('importMode') as string || 'CREATE_OR_UPDATE';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate import mode
    const validModes = ['ADD_ONLY', 'UPDATE_ONLY', 'REPLACE_ALL', 'CREATE_OR_UPDATE'];
    if (!validModes.includes(importModeStr)) {
      return NextResponse.json({ error: `Invalid import mode. Must be one of: ${validModes.join(', ')}` }, { status: 400 });
    }
    const importMode = importModeStr as ImportMode;

    const buffer = await file.arrayBuffer();
    let data: any[] = [];

    // Parse based on file type
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(buffer);
      const parsed = Papa.parse(text, { header: true, delimiter: ';' });
      data = parsed.data as any[];
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    // Filter out empty rows
    data = data.filter(row => row.username && row.username.toString().trim() !== '');

    // Create import log
    const importLog = await prisma.importLog.create({
      data: {
        entityType: 'USER',
        importMode,
        fileName: file.name,
        fileSize: file.size,
        totalRows: data.length,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        createdById: session.user.id
      }
    });

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Handle REPLACE_ALL mode - delete all users except current user first
      if (importMode === 'REPLACE_ALL') {
        const deleteCount = await prisma.user.count({
          where: { id: { not: session.user.id } }
        });
        await prisma.user.deleteMany({
          where: { id: { not: session.user.id } }
        });
        results.errors.push(`Cleared ${deleteCount} existing users before import (current user preserved)`);
      }

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        results.processed++;

        try {
          // Check if user exists first to determine validation mode
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { username: row.username?.toString().trim() },
                { email: row.email?.toString().trim().toLowerCase() }
              ]
            }
          });

          // Validate row data
          const validationErrors = validateUserData(row, !!existingUser);
          if (validationErrors.length > 0) {
            results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
            continue;
          }

          // Validate foreign key references - Support both codes and IDs
          let branchId = null;
          const branchRef = row.branchCode?.toString().trim() || row.branchId?.toString().trim();

          if (branchRef) {
            // First try to find by code, then by ID
            let branch = await prisma.branch.findUnique({
              where: { code: branchRef }
            });

            if (!branch) {
              // Try as ID if not found by code
              branch = await prisma.branch.findUnique({
                where: { id: branchRef }
              });
            }

            if (!branch) {
              results.errors.push(`Row ${i + 1}: Branch '${branchRef}' not found (tried as code and ID)`);
              continue;
            }

            branchId = branch.id;
          }

          let supportGroupId = null;
          const supportGroupRef = row.supportGroupCode?.toString().trim() || row.supportGroupId?.toString().trim();

          if (supportGroupRef) {
            // First try to find by code, then by ID
            let supportGroup = await prisma.supportGroup.findUnique({
              where: { code: supportGroupRef }
            });

            if (!supportGroup) {
              // Try as ID if not found by code
              supportGroup = await prisma.supportGroup.findUnique({
                where: { id: supportGroupRef }
              });
            }

            if (!supportGroup) {
              results.errors.push(`Row ${i + 1}: Support Group '${supportGroupRef}' not found (tried as code and ID)`);
              continue;
            }

            supportGroupId = supportGroup.id;
          }

          // Parse boolean values for password change flags
          const mustChangePassword = row.mustChangePassword === undefined ?
            true : // Default to true for new users
            (row.mustChangePassword === 'true' || row.mustChangePassword === '1' || row.mustChangePassword === true);

          const isFirstLogin = row.isFirstLogin === undefined ?
            true : // Default to true for new users
            (row.isFirstLogin === 'true' || row.isFirstLogin === '1' || row.isFirstLogin === true);

          const passwordChangedAt = row.passwordChangedAt ?
            new Date(row.passwordChangedAt) :
            null;

          if (existingUser) {
            // Handle based on import mode
            if (importMode === 'ADD_ONLY') {
              results.skipped++;
              continue;
            }

            // Update existing user
            const updatePassword = row.updatePassword?.toString().toLowerCase() === 'true' || row.updatePassword === '1';

            if (updatePassword && row.password && row.password.toString().trim()) {
              // Update including password
              const hashedPassword = await bcrypt.hash(row.password.toString().trim(), 12);
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  email: row.email?.toString().trim().toLowerCase(),
                  name: row.name?.toString().trim(),
                  phone: row.phone?.toString().trim() || null,
                  role: row.role?.toString().trim() || existingUser.role,
                  branchId,
                  supportGroupId,
                  isActive: row.isActive === 'false' || row.isActive === false ? false : true,
                  password: hashedPassword,
                  mustChangePassword: true, // Force password change when admin updates password
                  passwordChangedAt: null   // Reset password change timestamp
                }
              });
            } else {
              // Update excluding password to preserve existing password and password flags
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  email: row.email?.toString().trim().toLowerCase(),
                  name: row.name?.toString().trim(),
                  phone: row.phone?.toString().trim() || null,
                  role: row.role?.toString().trim() || existingUser.role,
                  branchId,
                  supportGroupId,
                  isActive: row.isActive === 'false' || row.isActive === false ? false : true
                }
              });
            }
            results.updated++;
          } else {
            // Handle based on import mode
            if (importMode === 'UPDATE_ONLY') {
              results.skipped++;
              continue;
            }

            // Hash the provided password for new user
            const providedPassword = row.password?.toString().trim();
            if (!providedPassword) {
              results.errors.push(`Row ${i + 1}: Password is required for new users`);
              continue;
            }
            const hashedPassword = await bcrypt.hash(providedPassword, 12);

            // Create new user
            await prisma.user.create({
              data: {
                username: row.username?.toString().trim(),
                email: row.email?.toString().trim().toLowerCase(),
                name: row.name?.toString().trim(),
                phone: row.phone?.toString().trim() || null,
                role: row.role?.toString().trim() || 'USER',
                branchId,
                supportGroupId,
                isActive: row.isActive === 'false' || row.isActive === false ? false : true,
                password: hashedPassword,
                mustChangePassword: true,  // Always force password change for new users
                isFirstLogin: true,        // Always mark as first login for new users
                passwordChangedAt: null    // No password change yet for new users
              }
            });
            results.created++;
          }
        } catch (error) {
          results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update import log with success
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'COMPLETED',
          processedRows: results.processed,
          createdRows: results.created,
          updatedRows: results.updated,
          skippedRows: results.skipped,
          errorRows: results.errors.length,
          errors: results.errors.length > 0 ? results.errors : null,
          completedAt: new Date()
        }
      });

    } catch (error) {
      // Update import log with failure
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'FAILED',
          processedRows: results.processed,
          createdRows: results.created,
          updatedRows: results.updated,
          skippedRows: results.skipped,
          errorRows: results.errors.length + 1,
          errors: [...results.errors, error instanceof Error ? error.message : 'Unknown error'],
          completedAt: new Date()
        }
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.`,
      importLogId: importLog.id,
      importMode,
      results
    });

  } catch (error) {
    console.error('Users import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/import/users - Export users
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isExport = searchParams.get('export') === 'true';

    if (!isExport) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const format = searchParams.get('format') || 'csv';

    // Get users including password change tracking fields and branch code
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branch: {
          select: {
            code: true
          }
        },
        supportGroup: {
          select: {
            code: true
          }
        },
        isActive: true,
        mustChangePassword: true,
        isFirstLogin: true,
        passwordChangedAt: true
      },
      orderBy: { name: 'asc' }
    });

    // Transform data to include branch and support group codes
    const exportData = users.map(user => ({
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      branchCode: user.branch?.code || '',
      supportGroupCode: user.supportGroup?.code || '',
      isActive: user.isActive,
      password: '', // Empty placeholder for password
      updatePassword: 'false', // Default to not updating password for existing users
      mustChangePassword: user.mustChangePassword,
      isFirstLogin: user.isFirstLogin,
      passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : ''
    }));

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=users_export.xlsx'
        }
      });
    } else {
      const csv = Papa.unparse(exportData, { delimiter: ';' });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=users_export.csv'
        }
      });
    }

  } catch (error) {
    console.error('Users export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/import/users - Clear all users (except current user)
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.user.count({
      where: {
        id: { not: session.user.id } // Don't delete current user
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { not: session.user.id } // Don't delete current user
      }
    });

    return NextResponse.json({
      success: true,
      message: `${count} users deleted successfully (current user preserved)`
    });

  } catch (error) {
    console.error('Users delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
