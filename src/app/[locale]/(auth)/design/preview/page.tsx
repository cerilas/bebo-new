import { StepProgressBar } from '@/components/StepProgressBar';
import { PreviewInterface } from '@/features/design/PreviewInterface';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function PreviewPage(props: {
  params: { locale: string };
  searchParams: {
    generationId?: string;
    imageUrl?: string;
    product?: string;
    size?: string;
    frame?: string;
    orientation?: string;
  };
}) {
  const {
    generationId,
    imageUrl,
    product,
    size,
    frame,
    orientation,
  } = props.searchParams;

  // Check if we have either generationId OR imageUrl, and required product params
  if ((!generationId && !imageUrl) || !product || !size || !frame) {
    // Redirect to products if missing params
    return (
      <>
        <Navbar />
        <StepProgressBar currentStep={3} />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Geçersiz önizleme</h1>
            <p className="mt-2 text-gray-600">Lütfen ürün seçimi yapın</p>

          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <StepProgressBar currentStep={3} />
      <PreviewInterface
        locale={props.params.locale}
        generationId={generationId}
        imageUrl={imageUrl}
        productSlug={product}
        sizeSlug={size}
        frameSlug={frame}
        orientation={orientation as 'landscape' | 'portrait' | undefined}
      />
      <Footer />
    </>
  );
}
