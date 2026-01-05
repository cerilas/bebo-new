'use client';

import type { MockupConfig, MockupType } from '@/utils/mockupUtils';

import { ProtectedImage } from './ProtectedImage';

type MockupPreviewProps = {
  imageUrl: string; // Kullanıcının görseli
  mockupTemplate?: string; // Mockup arka plan görseli
  mockupType: MockupType;
  mockupConfig: MockupConfig;
  className?: string;
};

/**
 * MockupPreview Component
 *
 * Kullanıcının görselini seçilen mockup şablonuna yerleştirir.
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
  className = '',
}: MockupPreviewProps) {
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

  // Mockup tipi: frame - görsel üstte, çerçeve arkada
  if (mockupType === 'frame') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* Çerçeve (arkada) */}
        <ProtectedImage
          src={mockupTemplate}
          alt="Frame"
          fill
          containerClassName="size-full"
          className="relative z-0 object-contain"
        />
        {/* Kullanıcı görseli (önde) */}
        <div
          className="absolute z-10"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            ...perspectiveStyle,
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
    );
  }

  // Mockup tipi: overlay - görsel üstte, mockup arkada (canvas tarzı)
  if (mockupType === 'overlay') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* Mockup arka planı */}
        <ProtectedImage
          src={mockupTemplate}
          alt="Background"
          fill
          containerClassName="size-full"
          className="object-contain"
        />
        {/* Kullanıcı görseli (üstte) */}
        <div
          className="absolute z-10"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            ...perspectiveStyle,
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
    );
  }

  // Mockup tipi: perspective - yastık, t-shirt gibi ürünler
  if (mockupType === 'perspective') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* Mockup arka planı */}
        <ProtectedImage
          src={mockupTemplate}
          alt="Product mockup"
          fill
          containerClassName="size-full"
          className="relative z-10 object-contain"
        />
        {/* Kullanıcı görseli (perspektif ile) */}
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
          <ProtectedImage
            src={imageUrl}
            alt="Your artwork"
            fill
            containerClassName="size-full"
            className="object-cover"
          />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className={`relative overflow-hidden ${className}`}>
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
