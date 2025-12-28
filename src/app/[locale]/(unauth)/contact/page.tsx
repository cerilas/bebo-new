import { useTranslations } from 'next-intl';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import ContactForm from '@/features/contact/ContactForm';
import { ContactInfo } from '@/features/contact/ContactInfo';
import { Footer } from '@/templates/Footer';
import { Navbar, NavbarSpacer } from '@/templates/Navbar';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({
    locale,
    namespace: 'Contact',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default function ContactPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { success?: string };
}) {
  unstable_setRequestLocale(locale);

  const t = useTranslations('Contact');
  const isSuccess = searchParams.success === 'true';

  return (
    <>
      <Navbar />
      <NavbarSpacer />
      <div className="min-h-screen bg-background px-4 py-12 text-foreground transition-colors duration-300 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Başlık */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground dark:text-white">
              {t('page_title')}
            </h1>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground dark:text-gray-400">
              {t('page_subtitle')}
            </p>
          </div>

          {/* Success Mesajı */}
          {isSuccess && (
            <div className="mb-8">
              <div className="mx-auto max-w-2xl rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <svg className="size-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
                      {t('success_title')}
                    </h3>
                    <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                      {t('success_message')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* İçerik */}
          {!isSuccess
            ? (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {/* Sol: İletişim Formu */}
                  <ContactForm />

                  {/* Sağ: İletişim Bilgileri */}
                  <ContactInfo />
                </div>
              )
            : (
                <div className="text-center">
                  <div className="mx-auto max-w-2xl rounded-lg bg-card p-8 shadow-lg dark:bg-slate-900 dark:ring-1 dark:ring-white/10">
                    <h2 className="mb-4 text-2xl font-bold text-foreground dark:text-white">
                      {t('success_title')}
                    </h2>
                    <p className="mb-6 text-muted-foreground dark:text-gray-400">
                      {t('success_message')}
                    </p>
                    <a
                      href="/contact"
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    >
                      {t('send_another_message')}
                    </a>
                  </div>
                </div>
              )}

          {/* Alt Bilgi */}
          <div className="mt-12 text-center">
            <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
              <h3 className="mb-2 text-lg font-medium text-blue-900 dark:text-blue-300">
                {t('response_time_title')}
              </h3>
              <p className="text-blue-700 dark:text-blue-400">
                {t('response_time_description')}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
