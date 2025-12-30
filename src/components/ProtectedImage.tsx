'use client';

import Image, { type ImageProps } from 'next/image';
import React from 'react';

import { cn } from '@/utils/Helpers';

type OmittedProps = {
  onContextMenu?: React.MouseEventHandler<any>;
  onDragStart?: React.DragEventHandler<any>;
};

type ProtectedImageProps = {
  containerClassName?: string;
} & Omit<ImageProps, keyof OmittedProps>;

/**
 * A wrapper component that protects images from being downloaded via:
 * 1. Right-click (context menu)
 * 2. Drag-and-drop
 * 3. Mobile "long-press" menu
 * 4. CSS selection
 */
export const ProtectedImage = ({
  containerClassName,
  className,
  ...props
}: ProtectedImageProps) => {
  const preventDefault = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const protectionClasses = 'select-none pointer-events-none touch-none';
  // Note: pointer-events-none might break some interactions if not careful,
  // but for pure display images it's the most effective.
  // user-select: none is also key.

  return (
    <div
      className={cn('relative overflow-hidden select-none', containerClassName)}
      onContextMenu={preventDefault}
    >
      <Image
        {...props}
        className={cn(className, protectionClasses)}
        onContextMenu={preventDefault}
        onDragStart={preventDefault}
        unoptimized
      />
      {/* Overlay to further prevent interaction if pointer-events-none on image is too much */}
      <div
        className="absolute inset-0 z-10 bg-transparent"
        onContextMenu={preventDefault}
        onDragStart={preventDefault}
      />
    </div>
  );
};
