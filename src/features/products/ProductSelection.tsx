'use client';

import { ChevronRight, Frame, Maximize2 } from 'lucide-react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ProductCarousel } from '@/components/ProductCarousel';
import { ProductImage } from '@/components/ProductImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/Helpers';

import { getProductDetails } from './productActions';

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
  const [sizeLabel, setSizeLabel] = useState<string>('');
  const [frameLabel, setFrameLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [productFrames, setProductFrames] = useState<Record<string, ProductFrame[]>>({});
  const [config, setConfig] = useState<ProductConfig>({
    frame: null,
    size: null,
  });

  // Load frames for all products on mount
  useEffect(() => {
    products.forEach((product) => {
      getProductDetails(product.slug, locale).then((details) => {
        if (details) {
          setProductFrames(prev => ({
            ...prev,
            [product.slug]: details.frames,
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

  const handleProductClick = (productSlug: string) => {
    setSelectedProduct(productSlug);
    setConfig({ frame: null, size: null });
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
  const selectedFrame = frames.find(f => f.slug === config.frame);

  return (
    <div className="min-h-screen bg-background px-3 py-8">
      <div className="mx-auto max-w-screen-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">
            {t('page_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('page_description')}
          </p>
        </div>

        {/* Product Grid */}
        <div className={cn(
          'grid gap-6 transition-all duration-500',
          selectedProduct
            ? 'grid-cols-1'
            : (
                products.length === 1
                  ? 'grid-cols-1 max-w-2xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              ),
        )}
        >
          {/* Product Cards */}
          {products.map((product) => {
            const isSelected = selectedProduct === product.slug;
            const isHidden = selectedProduct && !isSelected;
            const productFramesList = productFrames[product.slug] || [];

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
                    ? 'col-span-full'
                    : 'hover:shadow-lg hover:scale-[1.02]',
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
                {/* Product Image / Carousel */}
                {isSelected
                  ? (
                      <ProductImage
                        imageUrl={selectedFrame?.frameImageLarge ? selectedFrame.frameImageLarge : product.imageWideUrl}
                        productName={product.name}
                        variant="wide"
                        className="h-48 md:h-64 lg:h-80 xl:h-96"
                      />
                    )
                  : (
                      <ProductCarousel
                        images={carouselImages}
                        productName={product.name}
                        variant="square"
                        className="aspect-square w-full"
                      />
                    )}

                {/* Product Info (when not selected) */}
                {!isSelected && (
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-semibold">{product.name}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {product.description}
                    </p>

                    {/* Color Options Display - Show available colors */}
                    {productFramesList.length > 0 && productFramesList.some(f => f.colorCode) && (
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          {productFramesList
                            .filter(frame => frame.colorCode)
                            .map(frame => (
                              <div
                                key={frame.id}
                                className="size-5 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: frame.colorCode || '#gray' }}
                                title={frame.name}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {t('starting_from')}
                        {' '}
                        299₺
                      </span>
                      <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                )}

                {/* Expanded Configuration */}
                {isSelected && currentProduct && (
                  <div className="p-6 md:p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-2xl font-bold">{currentProduct.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(null);
                          setConfig({ frame: null, size: null });
                        }}
                      >
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
                          <div className="grid gap-8 md:grid-cols-2">
                            {/* Size Selection */}
                            <div>
                              <div className="mb-4 flex items-center gap-2">
                                <Maximize2 className="size-5 text-primary" />
                                <h4 className="text-lg font-semibold">{sizeLabel || t('select_size')}</h4>
                              </div>
                              <div className="grid gap-3">
                                {sizes.map(size => (
                                  <button
                                    key={size.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfig(prev => ({ ...prev, size: size.slug }));
                                    }}
                                    className={cn(
                                      'rounded-lg border-2 p-4 text-left transition-all',
                                      config.size === size.slug
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50',
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-semibold">{size.name}</div>
                                        <div className="text-sm text-muted-foreground">
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
                              <div className="mb-4 flex items-center gap-2">
                                <Frame className="size-5 text-primary" />
                                <h4 className="text-lg font-semibold">{frameLabel || t('select_frame')}</h4>
                              </div>
                              <div className="grid gap-3">
                                {frames.map(frame => (
                                  <button
                                    key={frame.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfig(prev => ({ ...prev, frame: frame.slug }));
                                    }}
                                    className={cn(
                                      'rounded-lg border-2 p-4 text-left transition-all',
                                      config.frame === frame.slug
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50',
                                    )}
                                  >
                                    <div className="flex items-center gap-4">
                                      {/* Frame Preview */}
                                      <div className="relative size-16 shrink-0 overflow-hidden rounded">
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
                                        <div className="font-semibold">{frame.name}</div>
                                        <div className="font-bold text-primary">
                                          {frame.price > 0 ? `+${frame.price}₺` : t('free')}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                    {/* Total & Continue Button */}
                    {isConfigComplete && (
                      <div className="mt-8 rounded-xl border bg-muted/50 p-6">
                        <div className="mb-4 flex items-center justify-between text-lg">
                          <span className="font-semibold">{t('total')}</span>
                          <span className="text-2xl font-bold text-primary">
                            {calculateTotal()}
                            ₺
                          </span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinue();
                          }}
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
                      </div>
                    )}

                    {!isConfigComplete && !loading && (
                      <div className="mt-8 rounded-xl border border-dashed p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          {t('please_select_options')}
                        </p>
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
              <div className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-12 opacity-50">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-muted-foreground">
                    {t('coming_soon')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('new_products')}
                  </div>
                </div>
              </div>
              {products.length < 2 && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-12 opacity-50">
                  <div className="text-center">
                    <div className="mb-2 text-sm font-semibold text-muted-foreground">
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
    </div>
  );
};
