import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { ForceDarkTheme } from '@/components/ForceDarkTheme';
import { Footer } from '@/templates/Footer';
import { HowItWorks } from '@/templates/HowItWorks';
import { Navbar } from '@/templates/Navbar';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'HowItWorks',
  });

  return {
    title: `${t('section_title')} - Birebiro`,
    description: t('section_subtitle'),
  };
}

const HowItWorksPage = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return (
    <>
      <ForceDarkTheme />
      <Navbar />
      <div className="pt-20">
        <HowItWorks />
      </div>
      <Footer />
    </>
  );
};

export default HowItWorksPage;
