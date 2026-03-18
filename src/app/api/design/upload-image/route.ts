import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { savePublicImageBuffer } from '@/features/design/assetStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FileLike = {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

const isFileLike = (value: unknown): value is FileLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<FileLike>;
  return typeof candidate.arrayBuffer === 'function'
    && typeof candidate.type === 'string'
    && typeof candidate.size === 'number';
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const effectiveUserId = userId ?? (process.env.NODE_ENV === 'development' ? 'local-dev' : null);

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image');

    if (!isFileLike(image)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await image.arrayBuffer());

    // Dynamic import: if sharp fails (platform binary issue), fall back to raw buffer
    let normalizedBuffer: Buffer;
    let thumbBuffer: Buffer;
    let sharpExtension: 'webp' | 'png' | 'jpg' = 'webp';

    try {
      const sharp = (await import('sharp')).default;
      normalizedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      thumbBuffer = await sharp(normalizedBuffer)
        .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      sharpExtension = 'webp';
      console.log('[upload] sharp processed successfully');
    } catch (sharpErr) {
      console.warn('[upload] sharp failed, using raw buffer fallback:', sharpErr instanceof Error ? sharpErr.message : sharpErr);
      normalizedBuffer = inputBuffer;
      thumbBuffer = inputBuffer;
      // Detect extension from mime type
      if (image.type === 'image/png') {
        sharpExtension = 'png';
      } else if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
        sharpExtension = 'jpg';
      } else {
        sharpExtension = 'jpg';
      }
    }

    const basePrefix = `${effectiveUserId}-${randomUUID().slice(0, 8)}`;

    const imageAsset = await savePublicImageBuffer({
      scope: 'uploads',
      filePrefix: `${basePrefix}-image`,
      extension: sharpExtension,
      buffer: normalizedBuffer,
    });

    const thumbAsset = await savePublicImageBuffer({
      scope: 'uploads',
      filePrefix: `${basePrefix}-thumb`,
      extension: sharpExtension,
      buffer: thumbBuffer,
    });

    return NextResponse.json({
      image_url: imageAsset.url,
      thumb_url: thumbAsset.url,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN';
    console.error('Native upload image error:', {
      message: errorMessage,
      code: errorCode,
      nodeEnv: process.env.NODE_ENV,
      uploadDirEnv: process.env.UPLOAD_DIR ?? 'NOT_SET',
      error:
        error instanceof Error
          ? {
              name: error.name,
              stack: error.stack,
            }
          : error,
    });
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}${errorCode !== 'UNKNOWN' ? ` (${errorCode})` : ''}` },
      { status: 500 },
    );
  }
}
