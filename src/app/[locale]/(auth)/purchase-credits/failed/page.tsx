import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PurchaseCreditsFailure } from '@/features/credits/PurchaseCreditsFailure';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PurchaseCredits');

  return {
    title: t('failed_title'),
  };
}

export default async function PurchaseCreditsFailedPage(props: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const searchParams = await props.searchParams;

  return <PurchaseCreditsFailure reason={searchParams.reason} />;
}
