import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sanitizeFilename } from './security';

// File storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '52428800'); // 50MB default
const ALLOWED_MIME_TYPES = process.env.UPLOAD_ALLOWED_TYPES?.split(',') || null; // null means allow all types

// Ensure upload directory exists
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Generate secure filename
export function generateSecureFilename(originalName: string, userId: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const baseName = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  return `${userId}_${timestamp}_${random}_${baseName}${ext}`;
}

// Validate file type and size
export function validateFile(file: {
  size: number;
  type: string;
  name: string;
}): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check MIME type only if restrictions are configured
  if (ALLOWED_MIME_TYPES && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }

  // Check for dangerous executable extensions (minimal security)
  const ext = path.extname(file.name).toLowerCase();
  const dangerousExts = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs'];
  if (dangerousExts.includes(ext)) {
    return {
      isValid: false,
      error: `File extension ${ext} is not allowed for security reasons`
    };
  }

  return { isValid: true };
}

// Save file to storage
export async function saveFile(
  fileData: Buffer,
  originalName: string,
  mimeType: string,
  userId: string
): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  error?: string;
}> {
  try {
    // Validate file
    const validation = validateFile({
      size: fileData.length,
      type: mimeType,
      name: originalName
    });

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate secure filename
    const secureFilename = generateSecureFilename(originalName, userId);
    const filePath = path.join(UPLOAD_DIR, secureFilename);

    // Save file
    await fs.writeFile(filePath, fileData);

    // Set restrictive permissions (readable only by owner)
    await fs.chmod(filePath, 0o600);

    return {
      success: true,
      filePath: secureFilename, // Return relative path for security
      filename: secureFilename
    };
  } catch (error) {
    console.error('File save error:', error);
    return {
      success: false,
      error: 'Failed to save file'
    };
  }
}

// Read file from storage
export async function readFile(filePath: string): Promise<{
  success: boolean;
  data?: Buffer;
  error?: string;
}> {
  try {
    // Security check - ensure path is within upload directory
    const fullPath = path.join(UPLOAD_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);
    
    if (!normalizedPath.startsWith(path.normalize(UPLOAD_DIR))) {
      return {
        success: false,
        error: 'Invalid file path'
      };
    }

    // Check if file exists
    await fs.access(normalizedPath);

    // Read file
    const data = await fs.readFile(normalizedPath);

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('File read error:', error);
    return {
      success: false,
      error: 'File not found or access denied'
    };
  }
}

// Delete file from storage
export async function deleteFile(filePath: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Security check - ensure path is within upload directory
    const fullPath = path.join(UPLOAD_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);
    
    if (!normalizedPath.startsWith(path.normalize(UPLOAD_DIR))) {
      return {
        success: false,
        error: 'Invalid file path'
      };
    }

    // Delete file
    await fs.unlink(normalizedPath);

    return {
      success: true
    };
  } catch (error) {
    console.error('File delete error:', error);
    return {
      success: false,
      error: 'Failed to delete file'
    };
  }
}

// Get file info
export async function getFileInfo(filePath: string): Promise<{
  success: boolean;
  stats?: {
    size: number;
    created: Date;
    modified: Date;
  };
  error?: string;
}> {
  try {
    // Security check - ensure path is within upload directory
    const fullPath = path.join(UPLOAD_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);
    
    if (!normalizedPath.startsWith(path.normalize(UPLOAD_DIR))) {
      return {
        success: false,
        error: 'Invalid file path'
      };
    }

    // Get file stats
    const stats = await fs.stat(normalizedPath);

    return {
      success: true,
      stats: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }
    };
  } catch (error) {
    console.error('File info error:', error);
    return {
      success: false,
      error: 'File not found or access denied'
    };
  }
}

// Clean up old files (for maintenance)
export async function cleanupOldFiles(daysOld: number = 30): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    await ensureUploadDir();
    
    const files = await fs.readdir(UPLOAD_DIR);
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    return {
      success: true,
      deletedCount
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      error: 'Failed to cleanup files'
    };
  }
}