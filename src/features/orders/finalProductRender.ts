import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getUploadsRoot, savePublicImageBuffer } from '@/features/design/assetStorage';
import { getBaseUrl } from '@/utils/Helpers';
import type { MockupConfig, MockupType } from '@/utils/mockupUtils';

type ImageTransform = {
  x: number;
  y: number;
  scale: number;
};

type RenderOrderProductImageInput = {
  imageUrl: string;
  generationId: string;
  mockupTemplate?: string | null;
  mockupType: MockupType;
  mockupConfig: MockupConfig;
  imageTransform?: ImageTransform | null;
};

const loadFromApiFilesPath = async (apiPath: string): Promise<Buffer> => {
  const relativePath = apiPath.replace(/^\/api\/files\//, '');
  const uploadsRoot = await getUploadsRoot();
  const absolutePath = path.join(uploadsRoot, ...relativePath.split('/'));
  return readFile(absolutePath);
};

const loadFromPublicPath = async (publicPath: string): Promise<Buffer> => {
  const normalizedPath = publicPath.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', normalizedPath);
  return readFile(absolutePath);
};

const downloadUrlAsBuffer = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset: ${response.status} ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const resolveAssetBuffer = async (urlOrPath: string): Promise<Buffer> => {
  if (urlOrPath.startsWith('/api/files/')) {
    return loadFromApiFilesPath(urlOrPath);
  }

  if (urlOrPath.startsWith('/')) {
    try {
      return await loadFromPublicPath(urlOrPath);
    } catch {
      return downloadUrlAsBuffer(`${getBaseUrl()}${urlOrPath}`);
    }
  }

  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return downloadUrlAsBuffer(urlOrPath);
  }

  throw new Error(`Unsupported asset path: ${urlOrPath}`);
};

const parsePositive = (value: number, fallback: number): number => {
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const renderFinalOrderProductImage = async (
  input: RenderOrderProductImageInput,
): Promise<string> => {
  const sharp = (await import('sharp')).default;
  const imageBuffer = await resolveAssetBuffer(input.imageUrl);

  // If no mockup template exists, persist normalized original image as final output.
  if (!input.mockupTemplate) {
    const normalized = await sharp(imageBuffer).png().toBuffer();
    const saved = await savePublicImageBuffer({
      scope: 'uploads',
      filePrefix: `order-final-${input.generationId}`,
      extension: 'png',
      buffer: normalized,
    });
    return saved.url;
  }

  const templateBuffer = await resolveAssetBuffer(input.mockupTemplate);
  const templateMeta = await sharp(templateBuffer).metadata();

  const canvasWidth = parsePositive(templateMeta.width ?? 0, 0);
  const canvasHeight = parsePositive(templateMeta.height ?? 0, 0);

  if (!canvasWidth || !canvasHeight) {
    throw new Error('Mockup template dimensions could not be resolved');
  }

  const cfg = input.mockupConfig;
  const regionLeft = Math.round((parsePositive(cfg.x, 10) / 100) * canvasWidth);
  const regionTop = Math.round((parsePositive(cfg.y, 10) / 100) * canvasHeight);
  const regionWidth = Math.max(1, Math.round((parsePositive(cfg.width, 80) / 100) * canvasWidth));
  const regionHeight = Math.max(1, Math.round((parsePositive(cfg.height, 80) / 100) * canvasHeight));

  const transformScale = parsePositive(input.imageTransform?.scale ?? 1, 1);
  const transformX = input.imageTransform?.x ?? 0;
  const transformY = input.imageTransform?.y ?? 0;

  const artworkScaledWidth = Math.max(1, Math.round(regionWidth * transformScale));
  const artworkScaledHeight = Math.max(1, Math.round(regionHeight * transformScale));

  const artworkScaled = await sharp(imageBuffer)
    .resize(artworkScaledWidth, artworkScaledHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const offsetLeft = Math.round(((50 + transformX - (transformScale * 50)) / 100) * regionWidth);
  const offsetTop = Math.round(((50 + transformY - (transformScale * 50)) / 100) * regionHeight);

  const artworkLayer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: artworkScaled,
        left: regionLeft + offsetLeft,
        top: regionTop + offsetTop,
      },
    ])
    .png()
    .toBuffer();

  const outputBuffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      input.mockupType === 'frame'
        ? [{ input: artworkLayer }, { input: templateBuffer }]
        : [{ input: templateBuffer }, { input: artworkLayer }],
    )
    .png()
    .toBuffer();

  const saved = await savePublicImageBuffer({
    scope: 'uploads',
    filePrefix: `order-final-${input.generationId}`,
    extension: 'png',
    buffer: outputBuffer,
  });

  return saved.url;
};
