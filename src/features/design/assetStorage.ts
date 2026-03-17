import type { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Uploads are stored outside of `public/` so they persist across builds.
// Files are served via /api/files/[...path] route.
// UPLOAD_DIR env var can be set to an absolute path for custom storage location.
const UPLOADS_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

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

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, input.buffer);

  // URL served by /api/files/[...path]
  return {
    url: `/api/files/${relativePath}`,
    relativePath,
  };
};
