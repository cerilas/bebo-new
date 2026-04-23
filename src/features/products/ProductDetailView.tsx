'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, Play, ShoppingCart } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

type Size = {
  id: number;
  slug: string;
  name: string;
  dimensions: string;
  price: number;
};

type Frame = {
  id: number;
  slug: string;
  name: string;
  price: number;
  colorCode?: string | null;
  frameImage?: string | null;
};

type ProductDetailData = {
  id: number;
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  longDescriptionHtml: string | null;
  galleryImages: string[];
  videoUrl: string | null;
  sizeLabel: string;
  frameLabel: string;
  sizes: Size[];
  frames: Frame[];
};

type Props = {
  product: ProductDetailData;
  locale: string;
};

function getYouTubeEmbedUrl(url: string): string | null {
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([-\w]{11})/,
  );
  if (!match) {
    return null;
  }
  return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
}

export function ProductDetailView({ product, locale }: Props) {
  const t = useTranslations('ProductDetail');
  // Index 0...(galleryImages.length-1) = images, galleryImages.length = video
  const totalSlides = product.galleryImages.length + (product.videoUrl ? 1 : 0);
  const videoIndex = product.videoUrl ? product.galleryImages.length : -1;
  const [currentIndex, setCurrentIndex] = useState(0);

  const isVideoSlide = currentIndex === videoIndex;

  const handlePrevImage = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const handleNextImage = useCallback(() => {
    setCurrentIndex(prev => (prev === totalSlides - 1 ? 0 : prev + 1));
  }, [totalSlides]);

  const minPrice = product.sizes.length > 0
    ? Math.min(...product.sizes.map(s => s.price)) + (product.frames.length > 0 ? Math.min(...product.frames.map(f => f.price)) : 0)
    : null;

  const orderUrl = `/${locale}/products?openProduct=${product.slug}`;

  return (
    <div className="bg-background px-3 pb-12 pt-2 md:px-4 md:pt-6">
      <div className="mx-auto max-w-screen-xl">
        {/* Back Button */}
        <div className="mb-4 md:mb-6">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-primary/30 bg-primary/5 text-primary transition-all hover:bg-primary/10 hover:text-primary-foreground"
          >
            <Link href={`/${locale}/products`}>
              <ArrowLeft className="mr-2 size-4" />
              {t('back_to_products')}
            </Link>
          </Button>
        </div>

        {/* Main layout: gallery left, info right */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          {/* Gallery Section */}
          <div>
            {/* Main Slide: Image or Video */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              {isVideoSlide
                ? (() => {
                    const embedUrl = getYouTubeEmbedUrl(product.videoUrl!);
                    return embedUrl
                      ? (
                          <iframe
                            src={embedUrl}
                            className="size-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={product.name}
                          />
                        )
                      : (
                          <video
                            src={product.videoUrl!}
                            controls
                            autoPlay
                            className="size-full object-contain"
                          >
                            <track kind="captions" />
                          </video>
                        );
                  })()
                : product.galleryImages.length > 0 && (
                  <NextImage
                    src={product.galleryImages[currentIndex]!}
                    alt={`${product.name} - ${currentIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                )}

              {/* Navigation Arrows */}
              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                    aria-label="Next"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {totalSlides > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {product.galleryImages.map((img, index) => (
                  <button
                    type="button"
                    key={`thumb-${img}`}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all md:size-20',
                      currentIndex === index
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-transparent opacity-60 hover:opacity-100',
                    )}
                  >
                    <NextImage
                      src={img}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
                {/* Video thumbnail inside strip */}
                {product.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(videoIndex)}
                    className={cn(
                      'relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-muted transition-all md:size-20',
                      currentIndex === videoIndex
                        ? 'border-primary ring-1 ring-primary opacity-100'
                        : 'border-transparent opacity-60 hover:opacity-100',
                    )}
                  >
                    <Play className="size-6 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="flex flex-col">
            {/* Product Name */}
            <h1 className="mb-2 text-2xl font-bold md:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {/* Short Description */}
            {(product.shortDescription || product.description) && (
              <p className="mb-4 text-base text-muted-foreground md:text-lg">
                {product.shortDescription || product.description}
              </p>
            )}

            {/* Price */}
            {minPrice !== null && (
              <div className="mb-6">
                <span className="text-sm text-muted-foreground">{t('starting_from')}</span>
                <span className="ml-2 text-2xl font-bold text-primary md:text-3xl">
                  {minPrice}
                  ₺
                </span>
              </div>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {product.sizeLabel}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <div
                      key={size.id}
                      className="rounded-lg border bg-card px-3 py-2 text-sm transition-colors"
                    >
                      <span className="font-medium">{size.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        (
                        {size.dimensions}
                        )
                      </span>
                      <span className="ml-2 font-semibold text-primary">
                        {size.price}
                        ₺
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frames / Colors */}
            {product.frames.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {product.frameLabel}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.frames.map(frame => (
                    <div
                      key={frame.id}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors"
                    >
                      {frame.colorCode && (
                        <div
                          className="size-5 rounded-full border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: frame.colorCode }}
                        />
                      )}
                      {frame.frameImage && (
                        <div className="relative size-8 overflow-hidden rounded">
                          <NextImage
                            src={frame.frameImage}
                            alt={frame.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      )}
                      <span className="font-medium">{frame.name}</span>
                      <span className="text-primary">
                        {frame.price > 0 ? `+${frame.price}₺` : t('free')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Button */}
            <div className="mt-auto pt-4">
              <Link href={orderUrl}>
                <Button size="lg" className="w-full gap-2 text-base md:text-lg">
                  <ShoppingCart className="size-5" />
                  {t('order_now')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Long Description HTML */}
        {product.longDescriptionHtml && (
          <div className="mt-10 md:mt-14">
            <h2 className="mb-4 text-xl font-bold md:text-2xl">
              {t('long_description')}
            </h2>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Product description HTML is managed by admins */}
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: product.longDescriptionHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
