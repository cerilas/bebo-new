import type { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Uploads are stored outside of `public/` so they persist across builds.
// Files are served via /api/files/[...path] route.
// UPLOAD_DIR env var can be set to an absolute path for custom storage location.
const UPLOADS_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

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
    const absolutePath = path.join(UPLOADS_ROOT, ...relativePath.split('/'));
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
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const id = randomUUID().slice(0, 8);
  const fileName = `${input.filePrefix}-${Date.now()}-${id}.${input.extension}`;

  // Relative path used for the serve URL: scope/year/month/fileName
  const relativePath = path.posix.join(input.scope, year, month, fileName);

  const absolutePath = path.join(UPLOADS_ROOT, ...relativePath.split('/'));
  const absoluteDir = path.dirname(absolutePath);

  try {
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, input.buffer);
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN';
    console.error('savePublicImageBuffer error:', {
      uploadRoot: UPLOADS_ROOT,
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
