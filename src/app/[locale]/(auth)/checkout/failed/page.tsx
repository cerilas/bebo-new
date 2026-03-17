import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'CheckoutFailed',
  });

  return {
    title: t('page_title'),
  };
}

export default async function CheckoutFailedPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ merchant_oid?: string; reason?: string }>;
}) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const t = await getTranslations({
    locale,
    namespace: 'CheckoutFailed',
  });
  const merchantOid = searchParams.merchant_oid;
  const rawReason = searchParams.reason;

  const getReadableReason = (reason?: string) => {
    if (!reason) {
      return null;
    }

    const normalized = reason.toLocaleLowerCase('tr-TR');

    if (normalized.includes('kart numarası') || normalized.includes('card number')) {
      return locale === 'en'
        ? 'Card number is invalid. Please check your card details and try again.'
        : locale === 'fr'
          ? 'Le numéro de carte est invalide. Veuillez vérifier vos informations de carte et réessayer.'
          : 'Kart numarası geçersiz. Lütfen kart bilgilerinizi kontrol ederek tekrar deneyin.';
    }

    return reason;
  };

  const readableReason = getReadableReason(rawReason);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle className="size-12 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
          {t('failed_message')}
        </h1>

        <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
          {t('failed_description')}
        </p>

        {readableReason && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/60 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Ödeme Hata Detayı</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{readableReason}</p>
          </div>
        )}

        {merchantOid && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Sipariş Numarası</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gray-900 dark:text-white">
              {merchantOid}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Link
            href={merchantOid ? `/checkout?merchant_oid=${merchantOid}` : '/checkout'}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-700 hover:to-pink-700"
          >
            {t('try_again')}
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('back_to_home')}
          </Link>
          <a
            href="mailto:destek@birebiro.com"
            className="text-purple-600 hover:underline dark:text-purple-400"
          >
            {t('contact_support')}
          </a>
        </div>
      </div>
    </div>
  );
}
