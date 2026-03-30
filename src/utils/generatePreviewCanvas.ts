import type { ImageTransform } from '@/components/MockupEditor';
import type { MockupConfig, MockupType } from '@/utils/mockupUtils';

/**
 * Fetches an image through the browser's fetch API and returns a blob: URL.
 * This avoids canvas CORS taint regardless of the image source.
 */
async function fetchAsBlobUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}): ${url}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Generates a pixel-perfect composite preview using the Canvas 2D API.
 * Exactly replicates the MockupPreview.tsx rendering logic without any DOM dependency.
 *
 * Returns a base64 data URL (image/png).
 */
export async function generatePreviewCanvas(
  imageUrl: string,
  mockupTemplate: string,
  mockupConfig: MockupConfig,
  imageTransform: ImageTransform,
  mockupType: MockupType = 'frame',
): Promise<string> {
  // Fetch both images via blob: URL to avoid CORS taint on canvas
  const [frameBlobUrl, artBlobUrl] = await Promise.all([
    fetchAsBlobUrl(mockupTemplate),
    fetchAsBlobUrl(imageUrl),
  ]);

  try {
    const [frameImg, artImg] = await Promise.all([
      loadImage(frameBlobUrl),
      loadImage(artBlobUrl),
    ]);

    const canvasW = frameImg.naturalWidth;
    const canvasH = frameImg.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const {
      x: cfgX = 10,
      y: cfgY = 10,
      width: cfgW = 80,
      height: cfgH = 80,
    } = mockupConfig;

    // Art area in pixels (mockupConfig values are % of total frame)
    const artLeft = (cfgX / 100) * canvasW;
    const artTop = (cfgY / 100) * canvasH;
    const artW = (cfgW / 100) * canvasW;
    const artH = (cfgH / 100) * canvasH;

    // Image div size and position within art area — mirrors MockupPreview.tsx CSS exactly:
    //   width: scale * 100%   height: scale * 100%
    //   left: (50 + tx - scale*50)%   top: (50 + ty - scale*50)%
    const { x: tx, y: ty, scale } = imageTransform;
    const imgDivW = scale * artW;
    const imgDivH = scale * artH;
    const imgDivLeft = artLeft + ((50 + tx - scale * 50) / 100) * artW;
    const imgDivTop = artTop + ((50 + ty - scale * 50) / 100) * artH;

    // object-fit: cover within imgDiv
    const imgAR = artImg.naturalWidth / artImg.naturalHeight;
    const divAR = imgDivW / imgDivH;

    let drawW: number;
    let drawH: number;
    if (imgAR > divAR) {
      // Image is wider than the box → fit by height
      drawH = imgDivH;
      drawW = imgDivH * imgAR;
    } else {
      // Image is taller than the box → fit by width
      drawW = imgDivW;
      drawH = imgDivW / imgAR;
    }

    // Center within imgDiv
    const drawX = imgDivLeft + (imgDivW - drawW) / 2;
    const drawY = imgDivTop + (imgDivH - drawH) / 2;

    // JPG frames have no transparency, treat them as overlay type
    const isJpg = /\.(?:jpg|jpeg)(?:\?|$)/i.test(mockupTemplate);
    const effectiveType: MockupType = mockupType === 'frame' && isJpg ? 'overlay' : mockupType;

    if (effectiveType === 'overlay') {
      // Mockup background first, then user image clipped to art area on top
      ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);
      ctx.save();
      ctx.beginPath();
      ctx.rect(artLeft, artTop, artW, artH);
      ctx.clip();
      ctx.drawImage(artImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // frame (PNG with transparent hole): user image behind, frame on top
      ctx.save();
      ctx.beginPath();
      ctx.rect(artLeft, artTop, artW, artH);
      ctx.clip();
      ctx.drawImage(artImg, drawX, drawY, drawW, drawH);
      ctx.restore();
      ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);
    }

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(frameBlobUrl);
    URL.revokeObjectURL(artBlobUrl);
  }
}
