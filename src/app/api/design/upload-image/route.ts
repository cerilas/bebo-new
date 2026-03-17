import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { savePublicImageBuffer } from '@/features/design/assetStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await image.arrayBuffer());

    const normalizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();

    const thumbBuffer = await sharp(normalizedBuffer)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const basePrefix = `${userId}-${randomUUID().slice(0, 8)}`;

    const imageAsset = await savePublicImageBuffer({
      scope: 'uploads',
      filePrefix: `${basePrefix}-image`,
      extension: 'webp',
      buffer: normalizedBuffer,
    });

    const thumbAsset = await savePublicImageBuffer({
      scope: 'uploads',
      filePrefix: `${basePrefix}-thumb`,
      extension: 'webp',
      buffer: thumbBuffer,
    });

    return NextResponse.json({
      image_url: imageAsset.url,
      thumb_url: thumbAsset.url,
    });
  } catch (error) {
    console.error('Native upload image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
