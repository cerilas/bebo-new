import { getTranslations } from 'next-intl/server';

import { CheckoutInterface } from '@/features/checkout/CheckoutInterface';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Checkout',
  });

  return {
    title: t('page_title'),
    description: t('page_description'),
  };
}

export default async function CheckoutPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    generationId?: string;
    imageUrl?: string;
    product?: string;
    size?: string;
    frame?: string;
    orientation?: string;
    imageTransform?: string;
  }>;
}) {
  const { locale } = await props.params;
  const { generationId, imageUrl, product, size, frame, orientation, imageTransform } = await props.searchParams;

  // imageTransform'u parse et
  let parsedImageTransform: { x: number; y: number; scale: number } | undefined;
  if (imageTransform) {
    try {
      parsedImageTransform = JSON.parse(imageTransform);
    } catch {
      // Parse hatasında undefined kalır
    }
  }

  return (
    <CheckoutInterface
      locale={locale}
      generationId={generationId}
      imageUrl={imageUrl}
      productSlug={product}
      sizeSlug={size}
      frameSlug={frame}
      orientation={orientation as 'landscape' | 'portrait' | undefined}
      imageTransform={parsedImageTransform}
    />
  );
}
