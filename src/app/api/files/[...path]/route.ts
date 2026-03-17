import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOADS_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

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

    const absolutePath = path.join(UPLOADS_ROOT, joinedPath);

    // Ensure the resolved path is inside UPLOADS_ROOT
    if (!absolutePath.startsWith(UPLOADS_ROOT + path.sep) && absolutePath !== UPLOADS_ROOT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
