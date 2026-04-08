import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { getProductDetailPage } from '@/features/products/productDetailActions';
import { ProductDetailView } from '@/features/products/ProductDetailView';
import { Footer } from '@/templates/Footer';
import { Navbar, NavbarSpacer } from '@/templates/Navbar';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: { locale: string; slug: string } }) {
  const product = await getProductDetailPage(props.params.slug, props.params.locale);
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'ProductDetail',
  });

  if (!product) {
    return { title: 'Product Not Found' };
  }

  return {
    title: t('meta_title', { productName: product.name }),
    description: t('meta_description', { productName: product.name }),
  };
}

const ProductDetailPage = async (props: {
  params: { locale: string; slug: string };
}) => {
  unstable_setRequestLocale(props.params.locale);

  const product = await getProductDetailPage(props.params.slug, props.params.locale);

  if (!product) {
    notFound();
  }

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': product.name,
            'description': product.shortDescription || product.description,
            'image': product.galleryImages[0],
            'url': `https://birebiro.com/${props.params.locale}/products/${product.slug}`,
          }),
        }}
      />
      <Navbar />
      <NavbarSpacer />
      <ProductDetailView
        product={product}
        locale={props.params.locale}
      />
      <Footer />
    </>
  );
};

export default ProductDetailPage;
