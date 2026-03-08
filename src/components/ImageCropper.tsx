'use client';

import 'react-image-crop/dist/ReactCrop.css';

import { Check, Crop, RotateCcw, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import ReactCrop, { centerCrop, type Crop as CropType, makeAspectCrop } from 'react-image-crop';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

type ImageCropperProps = {
  imageUrl: string;
  orientation: 'landscape' | 'portrait';
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  className?: string;
};

// Aspect ratios based on orientation
const ASPECT_RATIOS = {
  landscape: 16 / 9,
  portrait: 9 / 16,
};

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): CropType {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCropper({
  imageUrl,
  orientation,
  onCropComplete,
  onCancel,
  className = '',
}: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropType>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [freeAspect, setFreeAspect] = useState(false);

  const aspect = freeAspect ? undefined : ASPECT_RATIOS[orientation];

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initialCrop = centerAspectCrop(width, height, ASPECT_RATIOS[orientation]);
      setCrop(initialCrop);
    },
    [orientation],
  );

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop) {
      return;
    }

    setIsProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Calculate pixel values from percentage crop
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelCrop = {
        x: (crop.x / 100) * image.width * scaleX,
        y: (crop.y / 100) * image.height * scaleY,
        width: (crop.width / 100) * image.width * scaleX,
        height: (crop.height / 100) * image.height * scaleY,
      };

      // Set canvas size to cropped area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      // Convert to blob and create URL
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            onCropComplete(croppedUrl);
          }
          setIsProcessing(false);
        },
        'image/png',
        1,
      );
    } catch (error) {
      console.error('Crop error:', error);
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, ASPECT_RATIOS[orientation]));
      setFreeAspect(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Crop className="size-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Görseli Kırp (
            {orientation === 'landscape'
              ? 'Yatay'
              : 'Dikey'}
            )
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFreeAspect(!freeAspect)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              freeAspect
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            )}
          >
            {freeAspect ? 'Serbest' : 'Sabit Oran'}
          </button>
          <button
            type="button"
            onClick={resetCrop}
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <RotateCcw className="size-3" />
            Sıfırla
          </button>
        </div>
      </div>

      {/* Crop Area */}
      <div className="overflow-hidden rounded-xl border-2 border-dashed border-purple-300 bg-gray-50 p-2 dark:border-purple-700 dark:bg-gray-900">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          aspect={aspect}
          className="max-h-[60vh]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop preview"
            onLoad={onImageLoad}
            className="max-h-[60vh] w-full object-contain"
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="gap-2"
        >
          <X className="size-4" />
          İptal
        </Button>
        <Button
          onClick={handleCropComplete}
          disabled={isProcessing || !crop}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
        >
          {isProcessing
            ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  İşleniyor...
                </>
              )
            : (
                <>
                  <Check className="size-4" />
                  Kırpmayı Uygula
                </>
              )}
        </Button>
      </div>
    </div>
  );
}
