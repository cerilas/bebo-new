'use client';

import { ArrowLeft, ChevronRight, Frame, Info, Maximize2, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ProductCarousel } from '@/components/ProductCarousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

import { getProductDetails } from './productActions';
import type { SizeFrameAvailability } from './sizeFrameActions';
import { getSizeFrameAvailability } from './sizeFrameActions';

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageSquareUrl?: string | null;
  imageSquareUrl2?: string | null;
  imageSquareUrl3?: string | null;
  imageWideUrl?: string | null;
  sizes?: Size[];
  frames?: ProductFrame[];
  sizeLabel?: string;
  frameLabel?: string;
};

type Size = {
  id: number;
  slug: string;
  name: string;
  dimensions: string;
  price: number;
};

type ProductFrame = {
  id: number;
  slug: string;
  name: string;
  price: number;
  colorCode?: string | null;
  frameImage?: string | null;
  frameImageLarge?: string | null;
};

type ProductConfig = {
  frame: string | null;
  size: string | null;
  orientation: 'landscape' | 'portrait' | null;
};

type Props = {
  products: Product[];
  locale: string;
  imageUrl?: string;
};

export const ProductSelection = ({ products, locale, imageUrl }: Props) => {
  const t = useTranslations('Products');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [frames, setFrames] = useState<ProductFrame[]>([]);
  // Seed with server-provided data to avoid client-side fetch on mount
  const [productData, setProductData] = useState<Record<string, { sizes: Size[]; frames: ProductFrame[]; sizeLabel?: string; frameLabel?: string }>>(() => {
    const initial: Record<string, { sizes: Size[]; frames: ProductFrame[]; sizeLabel?: string; frameLabel?: string }> = {};
    products.forEach((p) => {
      if (p.sizes && p.frames) {
        initial[p.slug] = { sizes: p.sizes, frames: p.frames, sizeLabel: p.sizeLabel, frameLabel: p.frameLabel };
      }
    });
    return initial;
  });
  const [sizeLabel, setSizeLabel] = useState<string>('');
  const [frameLabel, setFrameLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<SizeFrameAvailability[]>([]);
  const frameCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const frameSectionRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<ProductConfig>({
    frame: null,
    size: null,
    orientation: null,
  });

  // Sizes/frames are already seeded from server-provided props.
  // Only fetch if a product was not included in initial data (shouldn't normally happen).
  useEffect(() => {
    products.forEach((product) => {
      if (!productData[product.slug]) {
        getProductDetails(product.slug, locale).then((details) => {
          if (details) {
            setProductData(prev => ({
              ...prev,
              [product.slug]: {
                sizes: details.sizes,
                frames: details.frames,
                sizeLabel: details.sizeLabel,
                frameLabel: details.frameLabel,
              },
            }));
          }
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open product from ?openProduct=slug query param (e.g. from detail page "Hemen Sipariş Ver")
  useEffect(() => {
    const openSlug = searchParams.get('openProduct');
    if (openSlug && products.some(p => p.slug === openSlug)) {
      setSelectedProduct(openSlug);
      setConfig({ frame: null, size: null, orientation: null });
    }
  }, [searchParams, products]);

  useEffect(() => {
    if (selectedProduct) {
      const cached = productData[selectedProduct];
      if (cached) {
        // Use server-provided data — no network request needed
        setSizes(cached.sizes);
        setFrames(cached.frames);
        setSizeLabel(cached.sizeLabel || '');
        setFrameLabel(cached.frameLabel || '');
      } else {
        setLoading(true);
        getProductDetails(selectedProduct, locale).then((details) => {
          if (details) {
            setSizes(details.sizes);
            setFrames(details.frames);
            setSizeLabel(details.sizeLabel);
            setFrameLabel(details.frameLabel);
          }
          setLoading(false);
        });
      }
    }
  }, [selectedProduct, locale, productData]);

  // Ürün seçildiğinde stok verisini tek seferde çek
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(p => p.slug === selectedProduct);
      if (product?.id) {
        getSizeFrameAvailability(product.id).then((data) => {
          setAvailabilityData(data);
        }).catch(() => {
          setAvailabilityData([]);
        });
      }
    } else {
      setAvailabilityData([]);
    }
  }, [selectedProduct, products]);

  // Belirli bir boyut için çerçevenin stokta olup olmadığını kontrol et
  const isFrameAvailable = useCallback(
    (frameId: number, sizeSlug: string | null): boolean => {
      if (!sizeSlug) {
        return true;
      }
      const size = sizes.find(s => s.slug === sizeSlug);
      if (!size) {
        return true;
      }
      // Tabloda kayıt yoksa varsayılan olarak stokta
      const record = availabilityData.find(
        item => item.sizeId === size.id && item.frameId === frameId,
      );
      if (!record) {
        return true;
      }
      return record.isAvailable;
    },
    [availabilityData, sizes],
  );

  // Stokta yok etiketi (çok dilli)
  const outOfStockLabel = useMemo(() => {
    if (locale === 'en') {
      return 'Out of stock';
    }
    if (locale === 'fr') {
      return 'Rupture de stock';
    }
    return 'Stokta yok';
  }, [locale]);

  const handleProductClick = (productSlug: string) => {
    setSelectedProduct(productSlug);
    setConfig({ frame: null, size: null, orientation: null });
  };

  const calculateStartingPrice = (productSlug: string) => {
    const data = productData[productSlug];
    if (!data || data.sizes.length === 0) {
      return null;
    }

    const minSizePrice = Math.min(...data.sizes.map(s => s.price));
    const minFramePrice = data.frames.length > 0
      ? Math.min(...data.frames.map(f => f.price))
      : 0;

    return minSizePrice + minFramePrice;
  };

  const handleContinue = () => {
    if (config.frame && config.size && config.orientation && selectedProduct) {
      setNavigating(true);
      const params = new URLSearchParams({
        product: selectedProduct,
        size: config.size,
        frame: config.frame,
        orientation: config.orientation,
      });

      // Add imageUrl if provided
      if (imageUrl) {
        params.set('imageUrl', imageUrl);
      }

      router.push(`/${locale}/design?${params.toString()}`);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    if (config.size) {
      const size = sizes.find(s => s.slug === config.size);
      total += size?.price || 0;
    }
    if (config.frame) {
      const frame = frames.find(f => f.slug === config.frame);
      total += frame?.price || 0;
    }
    return total;
  };

  const isConfigComplete = config.frame !== null && config.size !== null && config.orientation !== null;
  const currentProduct = products.find(p => p.slug === selectedProduct);

  // Auto-scroll to selected frame card when frame preview expands
  useEffect(() => {
    if (!config.frame) {
      return;
    }

    const targetCard = frameCardRefs.current[config.frame];
    if (!targetCard) {
      return;
    }

    const timer = window.setTimeout(() => {
      // Animasyonun (300ms) bitmesini bekleyip tam expanded haldeyken ortala
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [config.frame]);

  return (
    <div className="bg-background px-3 pb-24 pt-2 md:px-4 md:pb-28 md:pt-6">
      <div className="mx-auto max-w-screen-xl">
        {/* Header */}
        <div className="mb-3 text-center md:mb-6">
          <h1 className="text-xl font-bold md:mb-2 md:text-4xl">
            {t('page_title')}
          </h1>
          <p className="hidden text-muted-foreground md:block">
            {t('page_description')}
          </p>
        </div>

        {/* Product Grid */}
        <div className={cn(
          'grid gap-4 transition-all duration-500 md:gap-6',
          selectedProduct
            ? 'grid-cols-1'
            : (
                products.length === 1
                  ? 'mx-auto max-w-lg grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              ),
        )}
        >
          {/* Product Cards */}
          {products.map((product) => {
            const isSelected = selectedProduct === product.slug;
            const isHidden = selectedProduct && !isSelected;
            const currentProductData = productData[product.slug];
            const productFramesList = currentProductData?.frames || [];
            const startingPrice = calculateStartingPrice(product.slug);

            // Consolidate images for carousel
            const carouselImages: string[] = [];
            if (product.imageSquareUrl) {
              carouselImages.push(product.imageSquareUrl);
            }
            if (product.imageSquareUrl2) {
              carouselImages.push(product.imageSquareUrl2);
            }
            if (product.imageSquareUrl3) {
              carouselImages.push(product.imageSquareUrl3);
            }

            // Fallback to placeholder if empty (shouldn't happen for active products)
            if (carouselImages.length === 0) {
              carouselImages.push('/assets/images/placeholder.png');
            }

            if (isHidden) {
              return null;
            }

            return (
              <div
                key={product.id}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-500',
                  isSelected
                    ? 'col-span-full cursor-default'
                    : 'hover:scale-[1.02] hover:shadow-lg',
                )}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !selectedProduct) {
                    handleProductClick(product.slug);
                  }
                }}
                role="button"
                tabIndex={0}
                onClick={() => !selectedProduct && handleProductClick(product.slug)}
              >
                {/* Product Card - Horizontal compact layout */}
                {!isSelected && (
                  products.length === 1
                    ? (
                        <div className="aspect-square w-full overflow-hidden rounded-2xl">
                          <div className="h-3/5">
                            <ProductCarousel
                              images={carouselImages}
                              productName={product.name}
                              variant="square"
                              className="size-full rounded-none"
                            />
                          </div>

                          <div className="flex h-2/5 flex-col justify-between p-3 md:p-4">
                            <div>
                              <h3 className="line-clamp-1 text-base font-semibold md:text-lg">{product.name}</h3>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground md:text-sm">
                                {product.description}
                              </p>
                            </div>

                            <div>
                              {productFramesList.length > 0 && productFramesList.some(f => f.colorCode) && (
                                <div className="mb-2 flex items-center gap-2">
                                  <div className="flex gap-1.5">
                                    {productFramesList
                                      .filter(frame => frame.colorCode)
                                      .map(frame => (
                                        <div
                                          key={frame.id}
                                          className="size-4 rounded-full border border-gray-300 dark:border-gray-600"
                                          style={{ backgroundColor: frame.colorCode || '#gray' }}
                                          title={frame.name}
                                        />
                                      ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-primary md:text-base">
                                  {t('starting_from')}
                                  {' '}
                                  {startingPrice !== null ? `${startingPrice}₺` : '...'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/${locale}/products/${product.slug}`}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary hover:text-primary hover:shadow-md"
                                  >
                                    <Info className="size-3.5" />
                                    {t('detail_button')}
                                  </Link>
                                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    : (
                        <div className={cn(
                          'flex gap-4 p-3',
                          products.length > 1 && 'md:flex-col md:p-0',
                        )}
                        >
                          {/* Image - small on mobile, larger on desktop */}
                          <div className="shrink-0">
                            <ProductCarousel
                              images={carouselImages}
                              productName={product.name}
                              variant="square"
                              className={cn(
                                'size-36 rounded-xl md:size-60',
                                products.length > 1 && 'md:aspect-[4/3] md:size-auto md:w-full md:rounded-b-none md:rounded-t-2xl',
                              )}
                            />
                          </div>

                          {/* Info */}
                          <div className={cn(
                            'flex flex-1 flex-col justify-center',
                            products.length > 1 && 'md:p-4',
                          )}
                          >
                            <h3 className="mb-0.5 text-base font-semibold md:mb-1 md:text-lg">{product.name}</h3>
                            <p className="mb-1 hidden text-sm text-muted-foreground md:mb-3 md:line-clamp-2 md:block">
                              {product.description}
                            </p>

                            {/* Color Options Display */}
                            {productFramesList.length > 0 && productFramesList.some(f => f.colorCode) && (
                              <div className="mb-1.5 flex items-center gap-2 md:mb-3">
                                <div className="flex gap-1.5">
                                  {productFramesList
                                    .filter(frame => frame.colorCode)
                                    .map(frame => (
                                      <div
                                        key={frame.id}
                                        className="size-4 rounded-full border border-gray-300 dark:border-gray-600 md:size-5"
                                        style={{ backgroundColor: frame.colorCode || '#gray' }}
                                        title={frame.name}
                                      />
                                    ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-primary md:text-lg">
                                {t('starting_from')}
                                {' '}
                                {startingPrice !== null ? `${startingPrice}₺` : '...'}
                              </span>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/${locale}/products/${product.slug}`}
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary hover:text-primary hover:shadow-md"
                                >
                                  <Info className="size-3.5" />
                                  {t('detail_button')}
                                </Link>
                                <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                )}

                {/* Expanded Configuration - normal page flow */}
                {isSelected && currentProduct && (
                  <div className="p-4 md:p-8">
                    {/* Product header */}
                    <div className="mb-4 flex items-center justify-between md:mb-6">
                      <h3 className="text-xl font-bold md:text-2xl">{currentProduct.name}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/30 bg-primary/5 text-primary transition-all hover:bg-primary/10 hover:text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(null);
                          setConfig({ frame: null, size: null, orientation: null });
                        }}
                      >
                        <ArrowLeft className="mr-2 size-4" />
                        {t('back_to_products')}
                      </Button>
                    </div>

                    {loading
                      ? (
                          <div className="py-12 text-center text-muted-foreground">
                            {t('loading') || 'Yükleniyor...'}
                          </div>
                        )
                      : (
                          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                            {/* Size Selection */}
                            <div>
                              <div className="mb-3 flex items-center gap-2">
                                <Maximize2 className="size-4 text-primary md:size-5" />
                                <h4 className="text-base font-semibold md:text-lg">{sizeLabel || t('select_size')}</h4>
                              </div>
                              <div className="grid gap-2 md:gap-3">
                                {sizes.map(size => (
                                  <button
                                    key={size.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Mobile-only autoscroll to frame section
                                      if (window.innerWidth < 768) {
                                        setTimeout(() => {
                                          frameSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 50);
                                      }
                                      setConfig((prev) => {
                                        const newConfig = { ...prev, size: size.slug };
                                        // Mevcut çerçeve yeni boyutta stokta mı kontrol et
                                        if (prev.frame) {
                                          const currentFrame = frames.find(f => f.slug === prev.frame);
                                          if (currentFrame) {
                                            const record = availabilityData.find(
                                              item => item.sizeId === size.id && item.frameId === currentFrame.id,
                                            );
                                            const isStillAvailable = !record || record.isAvailable;
                                            if (!isStillAvailable) {
                                              // Stokta olan ilk çerçeveye geç
                                              const firstAvailable = frames.find((f) => {
                                                const r = availabilityData.find(
                                                  item => item.sizeId === size.id && item.frameId === f.id,
                                                );
                                                return !r || r.isAvailable;
                                              });
                                              newConfig.frame = firstAvailable?.slug ?? null;
                                            }
                                          }
                                        }
                                        return newConfig;
                                      });
                                    }}
                                    className={cn(
                                      'rounded-lg border-2 p-3 text-left transition-all md:p-4',
                                      config.size === size.slug
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50',
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-sm font-semibold md:text-base">{size.name}</div>
                                        <div className="text-xs text-muted-foreground md:text-sm">
                                          {size.dimensions}
                                        </div>
                                      </div>
                                      <div className="font-bold text-primary">
                                        {size.price}
                                        ₺
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Frame Selection */}
                            <div ref={frameSectionRef}>
                              <div className="mb-3 flex items-center gap-2">
                                <Frame className="size-4 text-primary md:size-5" />
                                <h4 className="text-base font-semibold md:text-lg">{frameLabel || t('select_frame')}</h4>
                              </div>
                              <div className="grid gap-2 md:gap-3">
                                {frames.map((frame) => {
                                  const available = isFrameAvailable(frame.id, config.size);
                                  const sizeNotSelected = !config.size;
                                  const isDisabled = !available || sizeNotSelected;
                                  const isSelectedFrame = config.frame === frame.slug;
                                  const previewImage = frame.frameImageLarge || currentProduct?.imageWideUrl;

                                  return (
                                    <div
                                      key={frame.id}
                                      ref={(element) => {
                                        frameCardRefs.current[frame.slug] = element;
                                      }}
                                      className={cn(
                                        'overflow-hidden rounded-lg border-2 transition-all duration-300',
                                        isDisabled
                                          ? 'cursor-not-allowed border-border opacity-40'
                                          : isSelectedFrame
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50',
                                      )}
                                    >
                                      <button
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!isDisabled) {
                                            setConfig(prev => ({ ...prev, frame: frame.slug }));
                                          }
                                        }}
                                        className="w-full p-3 text-left md:p-4"
                                      >
                                        <div className="flex items-center gap-3 md:gap-4">
                                          {/* Frame Preview */}
                                          <div className="relative size-12 shrink-0 overflow-hidden rounded md:size-16">
                                            {frame.frameImage
                                              ? (
                                                  <NextImage
                                                    src={frame.frameImage}
                                                    alt={frame.name}
                                                    className="size-full object-cover"
                                                    fill
                                                    sizes="64px"
                                                  />
                                                )
                                              : (
                                                  <div className={cn(
                                                    'flex size-full items-center justify-center',
                                                    frame.slug === 'no-frame' && 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
                                                    frame.slug === 'black' && 'bg-black p-1',
                                                    frame.slug === 'white' && 'bg-white p-1 ring-2 ring-gray-200',
                                                    frame.slug === 'wood' && 'bg-gradient-to-br from-amber-700 to-amber-900 p-1',
                                                  )}
                                                  >
                                                    <div className={cn(
                                                      'size-full rounded-sm bg-gradient-to-br from-purple-400 to-pink-400',
                                                      frame.slug !== 'no-frame' && 'ring-1 ring-white/20',
                                                    )}
                                                    />
                                                  </div>
                                                )}
                                          </div>

                                          {/* Frame Info */}
                                          <div className="flex flex-1 items-center justify-between">
                                            <div>
                                              <div className="text-sm font-semibold md:text-base">{frame.name}</div>
                                              {sizeNotSelected
                                                ? (
                                                    <div className="text-xs text-muted-foreground">
                                                      {locale === 'en' ? 'Select a size first' : locale === 'fr' ? 'Choisissez d\'abord une taille' : 'Önce boyut seçin'}
                                                    </div>
                                                  )
                                                : !available && (
                                                    <div className="text-xs text-muted-foreground">
                                                      {outOfStockLabel}
                                                    </div>
                                                  )}
                                            </div>
                                            <div className="font-bold text-primary">
                                              {frame.price > 0 ? `+${frame.price}₺` : t('free')}
                                            </div>
                                          </div>
                                        </div>
                                      </button>

                                      {/* Expanded Frame Preview Image */}
                                      <div
                                        className={cn(
                                          'grid transition-all duration-300 ease-in-out',
                                          isSelectedFrame && previewImage
                                            ? 'grid-rows-[1fr] opacity-100'
                                            : 'grid-rows-[0fr] opacity-0',
                                        )}
                                      >
                                        <div className="overflow-hidden">
                                          {previewImage && (
                                            <>
                                              <div className="relative mx-3 mb-3 aspect-[16/9] overflow-hidden rounded-lg md:mx-4 md:mb-4">
                                                <NextImage
                                                  src={previewImage}
                                                  alt={`${frame.name} - ${currentProduct?.name}`}
                                                  fill
                                                  className="object-cover"
                                                  sizes="(max-width: 768px) 100vw, 50vw"
                                                />
                                              </div>

                                              {config.size && (
                                                <div className="mx-3 mb-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 duration-300 animate-in fade-in-0 slide-in-from-top-2 md:mx-4 md:mb-4 md:p-3">
                                                  <p className="mb-2 text-xs font-medium text-muted-foreground md:text-sm">
                                                    {t('select_orientation')}
                                                  </p>
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfig(prev => ({ ...prev, orientation: 'portrait' }));
                                                      }}
                                                      className={cn(
                                                        'group flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-all duration-300 md:text-sm',
                                                        config.orientation === 'portrait'
                                                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                          : 'border-border bg-background hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5',
                                                      )}
                                                    >
                                                      <RectangleVertical className={cn('size-4 transition-transform duration-300', config.orientation === 'portrait' ? 'scale-110' : 'group-hover:scale-105')} />
                                                      {t('orientation_portrait')}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfig(prev => ({ ...prev, orientation: 'landscape' }));
                                                      }}
                                                      className={cn(
                                                        'group flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-all duration-300 md:text-sm',
                                                        config.orientation === 'landscape'
                                                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                          : 'border-border bg-background hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5',
                                                      )}
                                                    >
                                                      <RectangleHorizontal className={cn('size-4 transition-transform duration-300', config.orientation === 'landscape' ? 'scale-110' : 'group-hover:scale-105')} />
                                                      {t('orientation_landscape')}
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Placeholder for future products */}
          {!selectedProduct && products.length > 1 && products.length < 3 && (
            <>
              <div className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 opacity-50">
                <div className="text-center">
                  <div className="mb-1 text-sm font-semibold text-muted-foreground">
                    {t('coming_soon')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('new_products')}
                  </div>
                </div>
              </div>
              {products.length < 2 && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 opacity-50">
                  <div className="text-center">
                    <div className="mb-1 text-sm font-semibold text-muted-foreground">
                      {t('coming_soon')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('new_products')}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fixed floating bottom bar - always visible when product selected */}
      {selectedProduct && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-sm md:px-8 md:py-4">
          <div className="mx-auto flex max-w-screen-xl items-center gap-4">
            {isConfigComplete
              ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground md:text-base">{t('total')}</span>
                      <span className="text-xl font-bold text-primary md:text-2xl">
                        {calculateTotal()}
                        ₺
                      </span>
                    </div>
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={handleContinue}
                      disabled={navigating}
                    >
                      {navigating
                        ? (
                            <>
                              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              {t('loading') || 'Yükleniyor...'}
                            </>
                          )
                        : (
                            <>
                              {t('continue')}
                              <ChevronRight className="ml-2 size-5" />
                            </>
                          )}
                    </Button>
                  </>
                )
              : (
                  <p className="flex-1 text-center text-sm text-muted-foreground">
                    {t('please_select_options')}
                  </p>
                )}
          </div>
        </div>
      )}
    </div>
  );
};
