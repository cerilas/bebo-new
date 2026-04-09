import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { ForceDarkTheme } from '@/components/ForceDarkTheme';
import { FAQ } from '@/templates/FAQ';
import { Features } from '@/templates/Features';
import { Footer } from '@/templates/Footer';
import { Hero } from '@/templates/Hero';
import { HowItWorks } from '@/templates/HowItWorks';
import { Navbar } from '@/templates/Navbar';
import { Newsletter } from '@/templates/Newsletter';
import { ProcessSteps } from '@/templates/ProcessSteps';
import { Sponsors } from '@/templates/Sponsors';
import { VideoSection } from '@/templates/VideoSection';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const IndexPage = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return (
    <>
      <ForceDarkTheme />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Birebiro',
            'url': 'https://birebiro.com',
            'logo': 'https://birebiro.com/android-chrome-512x512.png',
            'sameAs': [
              'https://twitter.com/birebiro',
              'https://instagram.com/birebiro',
            ],
            'contactPoint': {
              '@type': 'ContactPoint',
              'telephone': '+90-555-123-4567',
              'contactType': 'customer service',
              'areaServed': 'TR',
              'availableLanguage': ['Turkish', 'English'],
            },
          }),
        }}
      />
      <Navbar />
      <Hero />
      <VideoSection />
      <HowItWorks showHeader={false} compact sectionId={null} />
      <Features />
      <FAQ />
      <Sponsors />
      <Newsletter />
      <ProcessSteps />
      <Footer />
    </>
  );
};

export default IndexPage;
