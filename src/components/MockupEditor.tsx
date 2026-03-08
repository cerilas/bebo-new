'use client';

import { Check, Minus, Move, Plus, RotateCcw, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';
import type { MockupConfig, MockupType } from '@/utils/mockupUtils';

import { ProtectedImage } from './ProtectedImage';

type MockupEditorProps = {
  imageUrl: string;
  mockupTemplate: string;
  mockupType: MockupType;
  mockupConfig: MockupConfig;
  orientation: 'landscape' | 'portrait';
  onSave: (transform: ImageTransform) => void;
  onCancel: () => void;
  className?: string;
};

export type ImageTransform = {
  x: number; // offset X in %
  y: number; // offset Y in %
  scale: number; // scale factor (1 = 100%)
};

/**
 * MockupEditor Component
 *
 * Kullanıcının mockup çerçevesi içinde görselini sürükleyip
 * boyutlandırmasına olanak tanır.
 */
export function MockupEditor({
  imageUrl,
  mockupTemplate,
  mockupType,
  mockupConfig,
  orientation,
  onSave,
  onCancel,
  className = '',
}: MockupEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const [mockupDimensions, setMockupDimensions] = useState<{ width: number; height: number } | null>(null);

  // Transform state - başlangıçta 1.5x zoom ile başla ki hareket alanı olsun
  const [transform, setTransform] = useState<ImageTransform>({
    x: 0,
    y: 0,
    scale: 1.5,
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [transformStart, setTransformStart] = useState({ x: 0, y: 0 });

  const {
    x: configX = 10,
    y: configY = 10,
    width: configWidth = 80,
    height: configHeight = 80,
  } = mockupConfig;

  // Load mockup dimensions
  useEffect(() => {
    if (mockupTemplate) {
      const img = new window.Image();
      img.onload = () => {
        setMockupDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = mockupTemplate;
    }
  }, [mockupTemplate]);

  // Handle mouse/touch down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setTransformStart({ x: transform.x, y: transform.y });
    // Capture pointer on the target element
    if (imageAreaRef.current) {
      imageAreaRef.current.setPointerCapture(e.pointerId);
    }
  }, [transform.x, transform.y]);

  // Hareket sınırlarını hesapla - görsel çerçeve dışına çıkamaz
  const getMaxOffset = useCallback((scale: number) => {
    // scale = 1 iken hareket yok
    // scale > 1 iken görsel büyük, (scale - 1) * 50 kadar hareket alanı
    // scale < 1 iken görsel küçük, (1 - scale) * 50 kadar hareket alanı (çerçeve içinde)
    return Math.abs(scale - 1) * 50;
  }, []);

  // Sınırlı değer döndür
  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  }, []);

  // Handle mouse/touch move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !imageAreaRef.current) {
      return;
    }
    e.preventDefault();

    const rect = imageAreaRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    setTransform((prev) => {
      const maxOffset = getMaxOffset(prev.scale);
      const newX = clamp(transformStart.x + deltaX, -maxOffset, maxOffset);
      const newY = clamp(transformStart.y + deltaY, -maxOffset, maxOffset);
      return {
        ...prev,
        x: newX,
        y: newY,
      };
    });
  }, [isDragging, dragStart, transformStart, getMaxOffset, clamp]);

  // Handle mouse/touch up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (imageAreaRef.current && isDragging) {
      imageAreaRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  }, [isDragging]);

  // Handle scale change - minimum 0.5 (yarı boyut)
  const handleScaleChange = useCallback((delta: number) => {
    setTransform((prev) => {
      const newScale = Math.max(0.5, Math.min(3, prev.scale + delta));
      const maxOffset = getMaxOffset(newScale);
      // Scale küçülünce x/y'yi de sınırla
      const newX = clamp(prev.x, -maxOffset, maxOffset);
      const newY = clamp(prev.y, -maxOffset, maxOffset);
      return {
        x: newX,
        y: newY,
        scale: newScale,
      };
    });
  }, [getMaxOffset, clamp]);

  // Fit to frame - tam sığdır
  const handleFitToFrame = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Reset to default crop position
  const handleReset = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1.5 });
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(transform);
  }, [onSave, transform]);

  // Loading state
  if (!mockupDimensions) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <div className="size-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  const aspectRatio = mockupDimensions.width / mockupDimensions.height;

  // Determine if mockup is overlay type (image on top) or frame type (image behind)
  const isJpgTemplate = mockupTemplate?.toLowerCase().endsWith('.jpg') || mockupTemplate?.toLowerCase().endsWith('.jpeg');
  const effectiveMockupType = (mockupType === 'frame' && isJpgTemplate) ? 'overlay' : mockupType;
  const isOverlay = effectiveMockupType === 'overlay';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Move className="size-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Görseli Konumlandır (
            {orientation === 'landscape'
              ? 'Yatay'
              : 'Dikey'}
            )
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Scale controls */}
          <div className="flex items-center gap-1 rounded-md bg-white px-2 py-1 dark:bg-gray-700">
            <button
              type="button"
              onClick={() => handleScaleChange(-0.1)}
              className="rounded p-0.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
              disabled={transform.scale <= 0.5}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
              <ZoomIn className="mr-1 inline size-3" />
              {Math.round(transform.scale * 100)}
              %
            </span>
            <button
              type="button"
              onClick={() => handleScaleChange(0.1)}
              className="rounded p-0.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
              disabled={transform.scale >= 3}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleFitToFrame}
            className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            Tam Sığdır
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <RotateCcw className="size-3" />
            Sıfırla
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-purple-300 bg-gray-50 dark:border-purple-700 dark:bg-gray-900"
        style={{ aspectRatio: aspectRatio.toString() }}
      >
        {/* Mockup Background (for overlay type) */}
        {isOverlay && (
          <Image
            src={mockupTemplate}
            alt="Background"
            fill
            className="pointer-events-none select-none object-fill"
            unoptimized
          />
        )}

        {/* Image Area - where user can drag */}
        <div
          ref={imageAreaRef}
          className={cn(
            'absolute cursor-move',
            isOverlay ? 'z-10' : 'z-0',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          style={{
            left: `${configX}%`,
            top: `${configY}%`,
            width: `${configWidth}%`,
            height: `${configHeight}%`,
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* User's Image - overflow:hidden on parent clips, transform on child moves */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute"
              style={{
                // Image is larger than container (scale determines base size)
                // Position is adjusted by transform.x/y
                width: `${transform.scale * 100}%`,
                height: `${transform.scale * 100}%`,
                left: `${50 + transform.x - (transform.scale * 50)}%`,
                top: `${50 + transform.y - (transform.scale * 50)}%`,
              }}
            >
              <ProtectedImage
                src={imageUrl}
                alt="Your artwork"
                fill
                containerClassName="size-full"
                className={cn('pointer-events-none object-cover', isDragging && 'opacity-90')}
              />
            </div>
          </div>

          {/* Drag overlay indicator - shows on hover */}
          {!isDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-purple-400 bg-purple-500/10">
              <div className="rounded-full bg-white/90 p-2 shadow-lg dark:bg-gray-800/90">
                <Move className="size-6 text-purple-600" />
              </div>
            </div>
          )}
        </div>

        {/* Frame Overlay (for frame type) */}
        {!isOverlay && (
          <Image
            src={mockupTemplate}
            alt="Frame"
            fill
            className="pointer-events-none relative z-10 select-none object-fill"
            unoptimized
          />
        )}
      </div>

      {/* Instructions */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Görseli sürükleyerek konumlandırın, yakınlaştırıp uzaklaştırın
      </p>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="gap-2"
        >
          <X className="size-4" />
          İptal
        </Button>
        <Button
          onClick={handleSave}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
        >
          <Check className="size-4" />
          Konumu Kaydet
        </Button>
      </div>
    </div>
  );
}
