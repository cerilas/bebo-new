'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { MockupConfig, MockupType } from '@/utils/mockupUtils';

import type { ImageTransform } from './MockupEditor';
import { ProtectedImage } from './ProtectedImage';

type MockupPreviewProps = {
  imageUrl: string; // Kullanıcının görseli
  mockupTemplate?: string; // Mockup arka plan görseli
  mockupType: MockupType;
  mockupConfig: MockupConfig;
  imageTransform?: ImageTransform; // User's image position/scale adjustments
  className?: string;
};

/**
 * MockupPreview Component
 *
 * Kullanıcının görselini seçilen mockup şablonuna yerleştirir.
 * Konumlandırma, mockup görselinin gerçek boyutları üzerinden yapılır.
 *
 * Mockup Tipleri:
 * - frame: Çerçeve PNG'si üstte, görsel arkada
 * - overlay: Görsel üstte, mockup arkada (canvas, poster)
 * - perspective: Perspektif dönüşümü ile (yastık, t-shirt)
 * - none: Sadece görseli göster
 */
export function MockupPreview({
  imageUrl,
  mockupTemplate,
  mockupType,
  mockupConfig,
  imageTransform,
  className = '',
}: MockupPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mockupDimensions, setMockupDimensions] = useState<{ width: number; height: number } | null>(null);

  const {
    x = 10,
    y = 10,
    width = 80,
    height = 80,
    rotation = 0,
    perspective = 0,
    skewX = 0,
    skewY = 0,
  } = mockupConfig;

  // Image transform from user adjustments
  const transformX = imageTransform?.x ?? 0;
  const transformY = imageTransform?.y ?? 0;
  const transformScale = imageTransform?.scale ?? 1;

  // Mockup görselinin doğal boyutlarını al
  useEffect(() => {
    if (mockupTemplate) {
      const img = new window.Image();
      img.onload = () => {
        setMockupDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = mockupTemplate;
    }
  }, [mockupTemplate]);

  // Perspektif transform stili
  const perspectiveStyle = perspective > 0 || skewX !== 0 || skewY !== 0
    ? {
        transform: `perspective(${perspective || 1000}px) rotateY(${rotation}deg) skewX(${skewX}deg) skewY(${skewY}deg)`,
        transformOrigin: 'center center',
      }
    : rotation !== 0
      ? { transform: `rotate(${rotation}deg)` }
      : {};

  // Mockup tipi: none - sadece görseli göster
  if (mockupType === 'none' || !mockupTemplate) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <ProtectedImage
          src={imageUrl}
          alt="Preview"
          fill
          containerClassName="size-full"
          className="object-contain"
          style={perspectiveStyle}
        />
      </div>
    );
  }

  // Mockup boyutları yüklenene kadar loading göster
  if (!mockupDimensions) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="size-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  // Aspect ratio hesapla
  const aspectRatio = mockupDimensions.width / mockupDimensions.height;

  // JPG dosyaları şeffaflık desteklemez, bu yüzden frame tipi yerine overlay kullan
  const isJpgTemplate = mockupTemplate?.toLowerCase().endsWith('.jpg') || mockupTemplate?.toLowerCase().endsWith('.jpeg');
  const effectiveMockupType = (mockupType === 'frame' && isJpgTemplate) ? 'overlay' : mockupType;

  // Mockup tipi: frame - görsel arkada, çerçeve önde
  if (effectiveMockupType === 'frame') {
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${className}`}
        style={{ aspectRatio: aspectRatio.toString() }}
      >
        {/* Kullanıcı görseli (arkada) - mockup görselinin boyutlarına göre konumlandırılır */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            ...perspectiveStyle,
          }}
        >
          <div
            className="absolute"
            style={{
              width: `${transformScale * 100}%`,
              height: `${transformScale * 100}%`,
              left: `${50 + transformX - (transformScale * 50)}%`,
              top: `${50 + transformY - (transformScale * 50)}%`,
            }}
          >
            <ProtectedImage
              src={imageUrl}
              alt="Your artwork"
              fill
              containerClassName="size-full"
              className="object-cover"
            />
          </div>
        </div>
        {/* Çerçeve (önde) */}
        <Image
          src={mockupTemplate}
          alt="Frame"
          fill
          className="pointer-events-none relative z-10 select-none object-fill"
          unoptimized
        />
      </div>
    );
  }

  // Mockup tipi: overlay - görsel üstte, mockup arkada (canvas tarzı)
  if (effectiveMockupType === 'overlay') {
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${className}`}
        style={{ aspectRatio: aspectRatio.toString() }}
      >
        {/* Mockup arka planı */}
        <Image
          src={mockupTemplate}
          alt="Background"
          fill
          className="pointer-events-none select-none object-fill"
          unoptimized
        />
        {/* Kullanıcı görseli (üstte) */}
        <div
          className="absolute z-10 overflow-hidden"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            ...perspectiveStyle,
          }}
        >
          <div
            className="absolute"
            style={{
              width: `${transformScale * 100}%`,
              height: `${transformScale * 100}%`,
              left: `${50 + transformX - (transformScale * 50)}%`,
              top: `${50 + transformY - (transformScale * 50)}%`,
            }}
          >
            <ProtectedImage
              src={imageUrl}
              alt="Your artwork"
              fill
              containerClassName="size-full"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  // Mockup tipi: perspective - yastık, t-shirt gibi ürünler
  if (effectiveMockupType === 'perspective') {
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden ${className}`}
        style={{ aspectRatio: aspectRatio.toString() }}
      >
        {/* Kullanıcı görseli (perspektif ile, arkada) */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            transform: `perspective(${perspective || 800}px) rotateX(${skewY}deg) rotateY(${skewX}deg) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="absolute"
            style={{
              width: `${transformScale * 100}%`,
              height: `${transformScale * 100}%`,
              left: `${50 + transformX - (transformScale * 50)}%`,
              top: `${50 + transformY - (transformScale * 50)}%`,
            }}
          >
            <ProtectedImage
              src={imageUrl}
              alt="Your artwork"
              fill
              containerClassName="size-full"
              className="object-cover"
            />
          </div>
        </div>
        {/* Mockup arka planı (önde) */}
        <Image
          src={mockupTemplate}
          alt="Product mockup"
          fill
          className="pointer-events-none relative z-10 select-none object-fill"
          unoptimized
        />
      </div>
    );
  }

  // Fallback
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: aspectRatio.toString() }}
    >
      <ProtectedImage
        src={imageUrl}
        alt="Preview"
        fill
        containerClassName="size-full"
        className="object-contain"
      />
    </div>
  );
}
