import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

/**
 * Diagnostic endpoint that tests upload environment, filesystem write, and sharp.
 *
 * GET /api/debug/upload-env
 * Protected by UPLOAD_DEBUG_KEY env var in production.
 * Usage: /api/debug/upload-env?key=YOUR_DEBUG_KEY
 */
export async function GET(request: Request) {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, require a debug key to access this endpoint
  if (isProduction) {
    const debugKey = process.env.UPLOAD_DEBUG_KEY;
    if (!debugKey) {
      return NextResponse.json(
        { error: 'UPLOAD_DEBUG_KEY not configured' },
        { status: 403 },
      );
    }
    const url = new URL(request.url);
    const providedKey = url.searchParams.get('key');
    if (providedKey !== debugKey) {
      return NextResponse.json(
        { error: 'Invalid debug key' },
        { status: 403 },
      );
    }
  }

  const uploadDirEnv = process.env.UPLOAD_DIR;
  const uploadsRoot = uploadDirEnv
    ? path.resolve(uploadDirEnv)
    : path.join(process.cwd(), 'uploads');

  // Test 1: Filesystem write
  let fsWriteTest = 'NOT_TESTED';
  const testDir = path.join(uploadsRoot, '_diag');
  const testFile = path.join(testDir, `test-${Date.now()}.txt`);
  try {
    await mkdir(testDir, { recursive: true });
    await writeFile(testFile, 'diagnostic write test');
    await unlink(testFile);
    fsWriteTest = 'OK';
  } catch (err) {
    const code = err instanceof Error && 'code' in err ? (err as any).code : 'UNKNOWN';
    fsWriteTest = `FAIL: ${code} - ${err instanceof Error ? err.message : String(err)}`;
  }

  // Test 2: /tmp write (always-writable fallback)
  let tmpWriteTest = 'NOT_TESTED';
  const tmpTestFile = `/tmp/_upload_diag_${Date.now()}.txt`;
  try {
    await writeFile(tmpTestFile, 'tmp write test');
    await unlink(tmpTestFile);
    tmpWriteTest = 'OK';
  } catch (err) {
    const code = err instanceof Error && 'code' in err ? (err as any).code : 'UNKNOWN';
    tmpWriteTest = `FAIL: ${code} - ${err instanceof Error ? err.message : String(err)}`;
  }

  // Test 3: Sharp
  let sharpTest = 'NOT_TESTED';
  try {
    const sharp = (await import('sharp')).default;
    const buf = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .webp()
      .toBuffer();
    sharpTest = `OK (${buf.length} bytes)`;
  } catch (err) {
    sharpTest = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      UPLOAD_DIR: uploadDirEnv ?? 'NOT_SET',
      cwd: process.cwd(),
    },
    resolvedPaths: {
      UPLOADS_ROOT: uploadsRoot,
      exampleUploadDir: path.join(uploadsRoot, 'uploads', '2026', '03'),
    },
    tests: {
      filesystemWrite: fsWriteTest,
      tmpWrite: tmpWriteTest,
      sharp: sharpTest,
    },
    summary:
      fsWriteTest === 'OK' && sharpTest.startsWith('OK')
        ? 'ALL_OK: Upload should work'
        : `ISSUES_FOUND: fs=${fsWriteTest}, sharp=${sharpTest}`,
  });
}
