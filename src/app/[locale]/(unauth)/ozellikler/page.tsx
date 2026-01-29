import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { ForceDarkTheme } from '@/components/ForceDarkTheme';
import { Features } from '@/templates/Features';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Features',
  });

  return {
    title: `${t('section_subtitle')} - Birebiro`,
    description: t('section_title'),
  };
}

const FeaturesPage = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return (
    <>
      <ForceDarkTheme />
      <Navbar />
      <div className="pt-20">
        <Features />
      </div>
      <Footer />
    </>
  );
};

export default FeaturesPage;
