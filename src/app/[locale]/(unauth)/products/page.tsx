import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { StepProgressBar } from '@/components/StepProgressBar';
import { getProductsWithDetails } from '@/features/products/productActions';
import { ProductSelection } from '@/features/products/ProductSelection';
import { Footer } from '@/templates/Footer';
import { Navbar, NavbarSpacer } from '@/templates/Navbar';

// Force dynamic rendering to prevent build-time database queries
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Products',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const ProductsPage = async (props: {
  params: { locale: string };
  searchParams: { imageUrl?: string };
}) => {
  unstable_setRequestLocale(props.params.locale);

  const products = await getProductsWithDetails(props.params.locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            'itemListElement': products.map((product: any, index: number) => ({
              '@type': 'ListItem',
              'position': index + 1,
              'item': {
                '@type': 'Product',
                'name': product.name,
                'description': product.description,
                'image': product.imageSquareUrl,
                'url': `https://birebiro.com/${props.params.locale}/products#${product.slug}`,
              },
            })),
          }),
        }}
      />
      <Navbar />
      <NavbarSpacer />
      <StepProgressBar currentStep={1} />
      <ProductSelection
        products={products}
        locale={props.params.locale}
        imageUrl={props.searchParams.imageUrl}
      />
      <Footer />
    </>
  );
};

export default ProductsPage;
