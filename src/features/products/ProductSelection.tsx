'use client';

import { ArrowLeft, ChevronRight, Frame, Maximize2 } from 'lucide-react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
};

type Props = {
  products: Product[];
  locale: string;
  imageUrl?: string;
};

export const ProductSelection = ({ products, locale, imageUrl }: Props) => {
  const t = useTranslations('Products');
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [frames, setFrames] = useState<ProductFrame[]>([]);
  const [productData, setProductData] = useState<Record<string, { sizes: Size[]; frames: ProductFrame[] }>>({});
  const [sizeLabel, setSizeLabel] = useState<string>('');
  const [frameLabel, setFrameLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<SizeFrameAvailability[]>([]);
  const [config, setConfig] = useState<ProductConfig>({
    frame: null,
    size: null,
  });

  // Load full details for all products on mount to calculate starting prices
  useEffect(() => {
    products.forEach((product) => {
      getProductDetails(product.slug, locale).then((details) => {
        if (details) {
          setProductData(prev => ({
            ...prev,
            [product.slug]: {
              sizes: details.sizes,
              frames: details.frames,
            },
          }));
        }
      });
    });
  }, [products, locale]);

  useEffect(() => {
    if (selectedProduct) {
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
  }, [selectedProduct, locale]);

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
    setConfig({ frame: null, size: null });
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
    if (config.frame && config.size && selectedProduct) {
      setNavigating(true);
      const params = new URLSearchParams({
        product: selectedProduct,
        size: config.size,
        frame: config.frame,
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

  const isConfigComplete = config.frame !== null && config.size !== null;
  const currentProduct = products.find(p => p.slug === selectedProduct);

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
                        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
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
                          setConfig({ frame: null, size: null });
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
                            <div>
                              <div className="mb-3 flex items-center gap-2">
                                <Frame className="size-4 text-primary md:size-5" />
                                <h4 className="text-base font-semibold md:text-lg">{frameLabel || t('select_frame')}</h4>
                              </div>
                              <div className="grid gap-2 md:gap-3">
                                {frames.map((frame) => {
                                  const available = isFrameAvailable(frame.id, config.size);
                                  const isSelectedFrame = config.frame === frame.slug;
                                  const previewImage = frame.frameImageLarge || currentProduct?.imageWideUrl;

                                  return (
                                    <div
                                      key={frame.id}
                                      className={cn(
                                        'overflow-hidden rounded-lg border-2 transition-all duration-300',
                                        !available
                                          ? 'cursor-not-allowed border-border opacity-[0.35]'
                                          : isSelectedFrame
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50',
                                      )}
                                    >
                                      <button
                                        type="button"
                                        disabled={!available}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (available) {
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
                                              {!available && (
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
                                            <div className="relative mx-3 mb-3 aspect-[16/9] overflow-hidden rounded-lg md:mx-4 md:mb-4">
                                              <NextImage
                                                src={previewImage}
                                                alt={`${frame.name} - ${currentProduct?.name}`}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                              />
                                            </div>
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
