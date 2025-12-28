import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { getAboutContent } from '@/features/about/aboutActions';
import { Footer } from '@/templates/Footer';
import { Navbar, NavbarSpacer } from '@/templates/Navbar';

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: AboutPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'About',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function AboutPage(props: AboutPageProps) {
  const { locale } = await props.params;

  unstable_setRequestLocale(locale);

  // Get dynamic content from database
  let aboutContent = null;
  try {
    aboutContent = await getAboutContent(locale);
    console.log('✅ About content loaded:', aboutContent?.title1);
  } catch (error) {
    console.error('❌ Error loading about content:', error);
  }

  return <AboutContent aboutContent={aboutContent} />;
}

type AboutContentProps = {
  aboutContent: any;
};

function AboutContent({ aboutContent }: AboutContentProps) {
  const t = useTranslations('About');

  return (
    <>
      <Navbar />
      <NavbarSpacer />
      <div className="bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-20 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
              {t('page_title')}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t('page_subtitle')}
            </p>
          </div>
        </div>

        {/* Section 1: Image Left, Text Right */}
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Image */}
            <div className="order-1">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 shadow-2xl">
                <div className="relative aspect-[4/3]">
                  {aboutContent?.image1
                    ? (
                        <Image
                          src={aboutContent.image1}
                          alt={aboutContent?.title1 || 'Section 1'}
                          fill
                          className="object-cover"
                        />
                      )
                    : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 backdrop-blur">
                          <div className="text-center text-white">
                            <svg className="mx-auto size-24 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-4 text-sm opacity-75">Görsel Alanı 1</p>
                          </div>
                        </div>
                      )}
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-2">
              <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                {aboutContent?.title1 || t('section1_title')}
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  {aboutContent?.body1 || t('section1_paragraph1')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Image Right, Text Left */}
        <div className="bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="grid items-center gap-12 md:grid-cols-2">
              {/* Text */}
              <div className="order-2 md:order-1">
                <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                  {aboutContent?.title2 || t('section2_title')}
                </h2>
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                  <p>
                    {aboutContent?.body2 || t('section2_paragraph1')}
                  </p>
                </div>
              </div>

              {/* Image */}
              <div className="order-1 md:order-2">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 shadow-2xl">
                  <div className="relative aspect-[4/3]">
                    {aboutContent?.image2
                      ? (
                          <Image
                            src={aboutContent.image2}
                            alt={aboutContent?.title2 || 'Section 2'}
                            fill
                            className="object-cover"
                          />
                        )
                      : (
                          <div className="flex size-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-8 backdrop-blur">
                            <div className="text-center text-white">
                              <svg className="mx-auto size-24 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mt-4 text-sm opacity-75">Görsel Alanı 2</p>
                            </div>
                          </div>
                        )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Image Left, Text Right */}
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Image */}
            <div className="order-1">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 shadow-2xl">
                <div className="relative aspect-[4/3]">
                  {aboutContent?.image3
                    ? (
                        <Image
                          src={aboutContent.image3}
                          alt={aboutContent?.title3 || 'Section 3'}
                          fill
                          className="object-cover"
                        />
                      )
                    : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 backdrop-blur">
                          <div className="text-center text-white">
                            <svg className="mx-auto size-24 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-4 text-sm opacity-75">Görsel Alanı 3</p>
                          </div>
                        </div>
                      )}
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-2">
              <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                {aboutContent?.title3 || t('section3_title')}
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  {aboutContent?.body3 || t('section3_paragraph1')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission and Vision Cards */}
        <div className="bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Mission Card */}
              <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                <div className="mb-6">
                  <div className="inline-flex rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                    <svg className="size-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {t('mission_title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {aboutContent?.mission || t('mission_text')}
                </p>
              </div>

              {/* Vision Card */}
              <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                <div className="mb-6">
                  <div className="inline-flex rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                    <svg className="size-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {t('vision_title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {aboutContent?.vision || t('vision_text')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
