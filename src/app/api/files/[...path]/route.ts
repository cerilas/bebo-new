import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIMARY_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

const TMP_FALLBACK_ROOT = '/tmp/uploads';

const SCOPES = new Set(['uploads', 'ai']);

function buildCandidatePaths(joinedPath: string): string[] {
  const normalizedPath = joinedPath
    .split('/')
    .filter(Boolean)
    .join('/');

  if (!normalizedPath) {
    return [];
  }

  const segments = normalizedPath.split('/');
  if (SCOPES.has(segments[0] ?? '')) {
    return [normalizedPath];
  }

  return [
    normalizedPath,
    path.posix.join('uploads', normalizedPath),
    path.posix.join('ai', normalizedPath),
  ];
}

// Search both primary and /tmp fallback for the file
function findFile(joinedPath: string): string | null {
  for (const candidatePath of buildCandidatePaths(joinedPath)) {
    const primaryPath = path.join(PRIMARY_ROOT, candidatePath);
    if (existsSync(primaryPath)) {
      return primaryPath;
    }

    const tmpPath = path.join(TMP_FALLBACK_ROOT, candidatePath);
    if (existsSync(tmpPath)) {
      return tmpPath;
    }
  }

  return null;
}

const MIME_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    const segments = params.path;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Prevent path traversal attacks
    const joinedPath = segments
      .map(s => s.replace(/\.\./g, ''))
      .filter(Boolean)
      .join('/');

    const absolutePath = findFile(joinedPath);
    if (!absolutePath) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure the resolved path is inside one of the allowed roots
    const isInsidePrimary = absolutePath.startsWith(PRIMARY_ROOT + path.sep) || absolutePath === PRIMARY_ROOT;
    const isInsideTmp = absolutePath.startsWith(TMP_FALLBACK_ROOT + path.sep) || absolutePath === TMP_FALLBACK_ROOT;
    if (!isInsidePrimary && !isInsideTmp) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(absolutePath).replace('.', '').toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    const stream = createReadStream(absolutePath);
    const readable = Readable.toWeb(stream) as ReadableStream;

    return new Response(readable, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
