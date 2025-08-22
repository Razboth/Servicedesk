import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

// Validation for user data
function validateUserData(data: any): string[] {
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
  
  if (!data.password || data.password.trim() === '') {
    errors.push('Password is required');
  }
  
  if (data.role && !['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN', 'SECURITY_ANALYST'].includes(data.role)) {
    errors.push('Role must be one of: USER, TECHNICIAN, MANAGER, ADMIN, SECURITY_ANALYST');
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Password strength validation (optional but recommended)
  if (data.password && data.password.trim().length < 8) {
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
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      results.processed++;
      
      try {
        // Validate row data
        const validationErrors = validateUserData(row);
        if (validationErrors.length > 0) {
          results.errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Validate foreign key references
        let branchId = row.branchId?.trim() || null;
        let supportGroupId = row.supportGroupId?.trim() || null;

        if (branchId) {
          const branchExists = await prisma.branch.findUnique({
            where: { id: branchId }
          });
          if (!branchExists) {
            results.errors.push(`Row ${i + 1}: Branch ID ${branchId} not found`);
            continue;
          }
        }

        if (supportGroupId) {
          const supportGroupExists = await prisma.supportGroup.findUnique({
            where: { id: supportGroupId }
          });
          if (!supportGroupExists) {
            results.errors.push(`Row ${i + 1}: Support Group ID ${supportGroupId} not found`);
            continue;
          }
        }

        // Hash the provided password
        const providedPassword = row.password?.trim();
        if (!providedPassword) {
          results.errors.push(`Row ${i + 1}: Password is required`);
          continue;
        }
        const hashedPassword = await bcrypt.hash(providedPassword, 12);

        const userData = {
          username: row.username?.trim(),
          email: row.email?.trim().toLowerCase(),
          name: row.name?.trim(),
          phone: row.phone?.trim() || null,
          role: row.role?.trim() || 'USER',
          branchId: branchId,
          supportGroupId: supportGroupId,
          isActive: row.isActive === 'false' ? false : true,
          password: hashedPassword
        };

        // Check if user exists by username or email
        const existingUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { username: userData.username },
              { email: userData.email }
            ]
          }
        });

        if (existingUser) {
          // Update existing user (including password if updatePassword flag is set)
          const updatePassword = row.updatePassword?.toLowerCase() === 'true' || row.updatePassword === '1';
          
          if (updatePassword) {
            // Update including password
            await prisma.user.update({
              where: { id: existingUser.id },
              data: userData
            });
          } else {
            // Update excluding password to preserve existing password
            const { password, ...updateData } = userData;
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updateData
            });
          }
          results.updated++;
        } else {
          // Create new user
          await prisma.user.create({
            data: userData
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated.`,
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

    // Get users but add a placeholder password column for the template
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        branchId: true,
        supportGroupId: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    
    // Add password and updatePassword columns to the export as placeholders
    const exportData = users.map(user => ({
      ...user,
      password: '', // Empty placeholder for password
      updatePassword: 'false' // Default to not updating password for existing users
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