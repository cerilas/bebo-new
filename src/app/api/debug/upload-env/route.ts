import path from 'node:path';

import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check upload environment configuration
 * Helps diagnose HTTP 500 errors on image upload
 *
 * Access at GET /api/debug/upload-env
 * Only available in development mode to prevent info leakage
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  const uploadDirEnv = process.env.UPLOAD_DIR;
  const uploadsRoot = uploadDirEnv ? path.resolve(uploadDirEnv) : path.join(process.cwd(), 'uploads');

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      UPLOAD_DIR_env: uploadDirEnv ?? 'NOT_SET',
      cwd: process.cwd(),
    },
    paths: {
      UPLOADS_ROOT: uploadsRoot,
      expectedUploadPath: path.join(uploadsRoot, 'uploads', new Date().getFullYear().toString(), String(new Date().getMonth() + 1).padStart(2, '0')),
    },
    diagnostics: {
      uploadDirIsSet: !!uploadDirEnv,
      usingFallback: !uploadDirEnv,
      fallbackPath: path.join(process.cwd(), 'uploads'),
    },
    instructions: {
      ifProduction: 'Set UPLOAD_DIR environment variable in Railway Service Variables to /app/uploads or similar persistent path',
      ifLocal: 'Add UPLOAD_DIR to .env.local with absolute path, e.g. /Users/username/project/uploads',
      volumeMount: 'Ensure Railway service has a Volume mount at the UPLOAD_DIR location',
    },
  });
}
