'use client';

import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

type PurchaseCreditsFailureProps = {
  reason?: string;
};

export function PurchaseCreditsFailure({ reason }: PurchaseCreditsFailureProps) {
  const t = useTranslations('PurchaseCredits');
  const router = useRouter();

  const getReadableReason = (value?: string) => {
    if (!value) {
      return null;
    }

    const normalized = value.toLocaleLowerCase('tr-TR');

    if (normalized.includes('kart numarası') || normalized.includes('card number')) {
      return 'Kart numarası geçersiz. Lütfen kart bilgilerinizi kontrol ederek tekrar deneyin.';
    }

    return value;
  };

  const readableReason = getReadableReason(reason);

  return (
    <>
      <Navbar />

      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="size-16 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('failed_title')}
          </h1>

          {/* Message */}
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            {t('failed_message')}
          </p>

          {readableReason && (
            <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/60 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Ödeme Hata Detayı</p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{readableReason}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push('/purchase-credits')}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
            >
              <ArrowLeft className="size-5" />
              {t('try_again')}
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Home className="size-5" />
              {t('go_dashboard')}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
