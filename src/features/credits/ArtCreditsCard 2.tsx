'use client';

import { ShoppingCart, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getUserArtCredits } from '@/features/design/creditsActions';
import { useRouter } from '@/libs/i18nNavigation';

export function ArtCreditsCard() {
  const t = useTranslations('Design');
  const router = useRouter();
  const [artCredits, setArtCredits] = useState<number | null>(null);

  useEffect(() => {
    async function loadCredits() {
      try {
        const credits = await getUserArtCredits();
        setArtCredits(credits);
      } catch (error) {
        console.error('Failed to load credits:', error);
      }
    }

    loadCredits();
  }, []);

  if (artCredits === null) {
    return null; // Don't show anything while loading to avoid flickering
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Sparkles className="size-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('art_credits')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('art_credits_description', { count: artCredits })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {artCredits}
            </span>
            <button
              type="button"
              onClick={() => router.push('/purchase-credits')}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
            >
              <ShoppingCart className="size-4" />
              {t('buy_credits')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
