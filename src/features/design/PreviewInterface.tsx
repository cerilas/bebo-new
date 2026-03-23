'use client';

import { ArrowLeft, Check, Frame as FrameIcon, Image as ImageIcon, Move, Package, RotateCcw, Ruler, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { type ImageTransform, MockupEditor } from '@/components/MockupEditor';
import { MockupPreview } from '@/components/MockupPreview';
import { ProtectedImage } from '@/components/ProtectedImage';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/libs/i18nNavigation';
import { cn } from '@/utils/Helpers';
import { parseMockupConfig } from '@/utils/mockupUtils';

import { type GeneratedImageResponse, getGeneratedImage, getUserGeneratedImages } from './chatActions';
import { getProductPricing, type ProductPriceData } from './productPriceActions';

type PreviewInterfaceProps = {
  locale: string;
  generationId?: string;
  imageUrl?: string;
  productSlug: string;
  sizeSlug: string;
  frameSlug: string;
  orientation?: 'landscape' | 'portrait';
};

export function PreviewInterface({
  generationId,
  imageUrl,
  productSlug,
  sizeSlug,
  frameSlug,
  orientation: initialOrientation,
}: PreviewInterfaceProps) {
  const t = useTranslations('Design');
  const tProducts = useTranslations('Products');
  const router = useRouter();
  const [imageData, setImageData] = useState<GeneratedImageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [priceData, setPriceData] = useState<ProductPriceData | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  // Orientation is locked to what the user selected on the product selection page
  const orientation: 'landscape' | 'portrait' = initialOrientation === 'portrait' ? 'portrait' : 'landscape';
  const [isEditing, setIsEditing] = useState(false);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [isLayoutAdjusted, setIsLayoutAdjusted] = useState(false);

  // Mockup varsa flip özelliğini aktif et
  const hasMockup = Boolean(priceData?.mockupTemplate);

  // Aktif mockup template ve config (orientation'a göre)
  const activeMockupTemplate = orientation === 'portrait' && priceData?.mockupTemplateVertical
    ? priceData.mockupTemplateVertical
    : priceData?.mockupTemplate;
  const activeMockupConfig = orientation === 'portrait' && priceData?.mockupConfigVertical
    ? priceData.mockupConfigVertical
    : priceData?.mockupConfig ?? null;

  useEffect(() => {
    async function loadImageData() {
      setIsLoading(true);
      try {
        // If we have a direct imageUrl (user uploaded image), create mock data
        if (imageUrl) {
          const mockImageData: GeneratedImageResponse = {
            id: Date.now(),
            user_id: '',
            chat_session_id: '',
            generation_id: `user-upload-${Date.now()}`,
            product_id: 0,
            product_size_id: 0,
            product_frame_id: 0,
            text_prompt: 'Kullanıcı tarafından yüklenen görsel',
            improved_prompt: '',
            image_url: imageUrl,
            uploaded_image_url: imageUrl,
            user_generation_intent: '',
            is_generate_mode: false,
            credit_used: 0,
            is_selected: false,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          setImageData(mockImageData);
          setIsLoading(false);
          return;
        }

        // If we have generationId, load from database
        if (generationId) {
          // Try getUserGeneratedImages first to get all user's images
          const userImagesResult = await getUserGeneratedImages();

          if (userImagesResult.success && userImagesResult.data) {
            // Find the image with matching generation_id
            const matchedImage = userImagesResult.data.find(
              img => img.generation_id === generationId,
            );

            if (matchedImage) {
              setImageData(matchedImage);
              setIsLoading(false);
              return;
            }
          }

          // Fallback: try getGeneratedImage API
          const result = await getGeneratedImage(generationId);

          if (result.success && result.data) {
            const data = Array.isArray(result.data) ? result.data[0] : result.data;
            setImageData(data!);
          }
        }
      } catch (error) {
        console.error('Failed to load image:', error);
      }
      setIsLoading(false);
    }

    loadImageData();
  }, [generationId, imageUrl]);

  // Load pricing data from database
  useEffect(() => {
    async function loadPricingData() {
      setIsPriceLoading(true);
      try {
        const result = await getProductPricing(productSlug, sizeSlug, frameSlug);

        if (result.success && result.data) {
          setPriceData(result.data);
        } else {
          console.error('Failed to load pricing:', result.error);
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
      }
      setIsPriceLoading(false);
    }

    loadPricingData();
  }, [productSlug, sizeSlug, frameSlug]);

  const totalPrice = priceData?.totalPrice || 0;
  const formattedPrice = (totalPrice / 100).toFixed(2);

  const handleContinueToCheckout = () => {
    // Checkout sayfasına yönlendir
    const params = new URLSearchParams({
      product: productSlug,
      size: sizeSlug,
      frame: frameSlug,
    });

    if (generationId) {
      params.set('generationId', generationId);
    }

    if (imageUrl) {
      params.set('imageUrl', imageUrl);
    }

    if (orientation !== 'landscape') {
      params.set('orientation', orientation);
    }

    // Image transform bilgisini ekle (crop/position)
    if (imageTransform.x !== 0 || imageTransform.y !== 0 || imageTransform.scale !== 1) {
      params.set('imageTransform', JSON.stringify(imageTransform));
    }

    router.push(`/checkout?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto size-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('wait_for_generation')}</p>
        </div>
      </div>
    );
  }

  if (!imageData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Görsel bulunamadı</h1>
          <p className="mt-2 text-gray-600">Lütfen tekrar deneyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-24">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 bg-primary/5 text-primary transition-all hover:bg-primary/10 hover:text-primary-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 size-4" />
          {t('back_to_design')}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Side - Image Preview with Flip Animation */}
        <div className="space-y-6">
          {/* Editor Mode - No Flip */}
          {isEditing && hasMockup && activeMockupTemplate
            ? (
                <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Move className="size-4 text-purple-500" />
                    Görseli Konumlandır
                    {orientation === 'portrait' ? ' (Dikey)' : ' (Yatay)'}
                  </div>
                  <MockupEditor
                    imageUrl={imageData.image_url}
                    mockupTemplate={activeMockupTemplate}
                    mockupType={parseMockupConfig(activeMockupConfig).type || 'frame'}
                    mockupConfig={parseMockupConfig(activeMockupConfig)}
                    orientation={orientation}
                    onSave={(transform) => {
                      setImageTransform(transform);
                      setIsEditing(false);
                      setIsLayoutAdjusted(true);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              )
            : (
                /* Flip Card Container */
                <div className="relative" style={{ perspective: '1000px' }}>
                  <div
                    className={`relative transition-transform duration-700 ${isFlipped ? '' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front - Original Image */}
                    <div style={{ backfaceVisibility: 'hidden' }}>
                      <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <Sparkles className="size-4 text-purple-500" />
                            Orijinal Görsel
                          </span>
                          {hasMockup && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsFlipped(true)}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl"
                              >
                                <Move className="size-4" />
                                Yerleşimi Ayarla
                              </button>
                            </div>
                          )}
                        </div>

                        <ProtectedImage
                          src={imageData.image_url}
                          alt={imageData.text_prompt}
                          width={800}
                          height={800}
                          className="w-full rounded-xl"
                          unoptimized
                        />
                      </div>
                    </div>

                    {/* Back - Mockup Preview */}
                    {hasMockup && activeMockupTemplate && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                        }}
                      >
                        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                              <ImageIcon className="size-4 text-purple-500" />
                              Ürün Önizlemesi
                              {orientation === 'portrait' ? ' (Dikey)' : ' (Yatay)'}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Edit Position Button */}
                              <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 transition-all hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                              >
                                <Move className="size-3" />
                                Konumlandır
                              </button>
                              {/* Reset Transform Button */}
                              {(imageTransform.x !== 0 || imageTransform.y !== 0 || imageTransform.scale !== 1) && (
                                <button
                                  type="button"
                                  onClick={() => setImageTransform({ x: 0, y: 0, scale: 1 })}
                                  className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 transition-all hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
                                >
                                  <RotateCcw className="size-3" />
                                  Sıfırla
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsFlipped(false)}
                                className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              >
                                <RotateCcw className="size-3" />
                                Orijinale Dön
                              </button>
                            </div>
                          </div>

                          {/* Preview Only */}
                          <MockupPreview
                            imageUrl={imageData.image_url}
                            mockupTemplate={activeMockupTemplate}
                            mockupType={parseMockupConfig(activeMockupConfig).type || 'frame'}
                            mockupConfig={parseMockupConfig(activeMockupConfig)}
                            imageTransform={imageTransform}
                            className="w-full rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

          {/* User's Prompt */}
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-gray-700 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 size-6 shrink-0 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('your_feelings')}
                </h3>
                <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                  "
                  {imageData.text_prompt}
                  "
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Product Details & Pricing */}
        <div className="space-y-6">
          {/* Product Summary Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              {t('preview_title')}
            </h2>

            {/* Product Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <Package className="size-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ürün</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {priceData?.productName || tProducts(`product_${productSlug.replace(/-/g, '_')}`)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <Ruler className="size-6 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Boyut</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {priceData?.sizeName || tProducts(`size_${sizeSlug}`)}
                    {priceData?.sizeDimensions && (
                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        (
                        {priceData.sizeDimensions}
                        )
                      </span>
                    )}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {isPriceLoading ? '...' : `₺${((priceData?.sizePrice || 0) / 100).toFixed(2)}`}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <FrameIcon className="size-6 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Çerçeve</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {priceData?.frameName || tProducts(`frame_${frameSlug.replace('-', '_')}`)}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {isPriceLoading
                    ? '...'
                    : (priceData?.framePrice === 0
                        ? tProducts('free')
                        : `₺${((priceData?.framePrice || 0) / 100).toFixed(2)}`
                      )}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200 dark:border-gray-700" />

            {/* Total Price */}
            <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 p-6 dark:from-purple-900/30 dark:to-pink-900/30">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {tProducts('total')}
              </span>
              <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                ₺
                {formattedPrice}
              </span>
            </div>

            {/* Continue Button */}
            <div className="group relative mt-6">
              <button
                type="button"
                onClick={handleContinueToCheckout}
                disabled={hasMockup && !isLayoutAdjusted}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all',
                  hasMockup && !isLayoutAdjusted
                    ? 'cursor-not-allowed bg-gray-400 opacity-60'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl',
                )}
              >
                <Check className="size-6" />
                {t('continue_to_checkout')}
              </button>
              {hasMockup && !isLayoutAdjusted && (
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                  Önce yerleşimi ayarlayın
                  <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-gray-800 dark:bg-gray-700" />
                </div>
              )}
            </div>

            {/* Info Text */}
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('preview_info')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
