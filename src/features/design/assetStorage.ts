import type { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Uploads are stored outside of `public/` so they persist across builds.
// Files are served via /api/files/[...path] route.
// UPLOAD_DIR env var can be set to an absolute path for custom storage location.
// In production, falls back to /tmp/uploads if primary path is not writable.
const PRIMARY_UPLOADS_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

const TMP_FALLBACK_ROOT = '/tmp/uploads';

// Test which root is writable (resolved lazily on first call)
let resolvedUploadsRoot: string | null = null;

export async function getUploadsRoot(): Promise<string> {
  if (resolvedUploadsRoot) {
    return resolvedUploadsRoot;
  }

  // Try primary path first
  try {
    await mkdir(PRIMARY_UPLOADS_ROOT, { recursive: true });
    const testFile = path.join(PRIMARY_UPLOADS_ROOT, `.write-test-${Date.now()}`);
    await writeFile(testFile, 'test');
    const { unlink } = await import('node:fs/promises');
    await unlink(testFile);
    resolvedUploadsRoot = PRIMARY_UPLOADS_ROOT;
    console.log(`[assetStorage] Using primary uploads root: ${PRIMARY_UPLOADS_ROOT}`);
    return resolvedUploadsRoot;
  } catch {
    // Primary path not writable, try fallback
  }

  // Try /tmp fallback (always writable on Linux containers)
  try {
    await mkdir(TMP_FALLBACK_ROOT, { recursive: true });
    const testFile = path.join(TMP_FALLBACK_ROOT, `.write-test-${Date.now()}`);
    await writeFile(testFile, 'test');
    const { unlink } = await import('node:fs/promises');
    await unlink(testFile);
    resolvedUploadsRoot = TMP_FALLBACK_ROOT;
    console.warn(
      `[assetStorage] Primary path ${PRIMARY_UPLOADS_ROOT} not writable, using /tmp fallback. Files will NOT persist across deploys!`,
    );
    return resolvedUploadsRoot;
  } catch {
    // Both failed - use primary and let the error propagate
  }

  resolvedUploadsRoot = PRIMARY_UPLOADS_ROOT;
  console.error(`[assetStorage] WARNING: Neither ${PRIMARY_UPLOADS_ROOT} nor ${TMP_FALLBACK_ROOT} are writable!`);
  return resolvedUploadsRoot;
}

// For reading files - must check both paths since files could be in either location
export async function resolveFilePath(relativePath: string): Promise<string> {
  const uploadsRoot = await getUploadsRoot();
  const primaryPath = path.join(PRIMARY_UPLOADS_ROOT, ...relativePath.split('/'));
  const resolvedPath = path.join(uploadsRoot, ...relativePath.split('/'));

  // If using fallback, check primary first (in case files were there before)
  if (uploadsRoot !== PRIMARY_UPLOADS_ROOT) {
    try {
      await import('node:fs/promises').then(fs => fs.access(primaryPath));
      return primaryPath;
    } catch {
      // Not in primary, use resolved root
    }
  }

  return resolvedPath;
}

/**
 * Given a /api/files/... URL, reads the file from disk and returns a base64 data URL.
 * This allows OpenAI vision API to receive the image even on localhost or private servers.
 */
export const toBase64DataUrl = async (fileUrl: string): Promise<string | null> => {
  try {
    const prefix = '/api/files/';
    if (!fileUrl.startsWith(prefix)) {
      return null; // not a local file, caller should use the URL directly
    }
    const relativePath = fileUrl.slice(prefix.length);
    const absolutePath = await resolveFilePath(relativePath);
    const buffer = await readFile(absolutePath);
    const ext = path.extname(absolutePath).slice(1).toLowerCase();
    const mimeMap: Record<string, string> = {
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    const mime = mimeMap[ext] ?? 'image/webp';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
};

type SavePublicImageInput = {
  scope: 'ai' | 'uploads';
  filePrefix: string;
  extension: 'png' | 'jpg' | 'jpeg' | 'webp';
  buffer: Buffer;
};

export const savePublicImageBuffer = async (
  input: SavePublicImageInput,
): Promise<{ url: string; relativePath: string }> => {
  const uploadsRoot = await getUploadsRoot();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id = randomUUID().slice(0, 8);
  const fileName = `${input.filePrefix}-${Date.now()}-${id}.${input.extension}`;

  // Relative path used for the serve URL: scope/year/month/fileName
  const relativePath = path.posix.join(input.scope, year, month, fileName);

  const absolutePath = path.join(uploadsRoot, ...relativePath.split('/'));
  const absoluteDir = path.dirname(absolutePath);

  try {
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, input.buffer);
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN';
    console.error('savePublicImageBuffer error:', {
      uploadsRoot,
      primaryRoot: PRIMARY_UPLOADS_ROOT,
      uploadDirEnv: process.env.UPLOAD_DIR ?? 'NOT_SET',
      absolutePath,
      absoluteDir,
      relativePath,
      errorCode,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // URL served by /api/files/[...path]
  return {
    url: `/api/files/${relativePath}`,
    relativePath,
  };
};
