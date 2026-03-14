import { StepProgressBar } from '@/components/StepProgressBar';
import { ChatInterface } from '@/features/design/ChatInterface';
import { Footer } from '@/templates/Footer';
import { Navbar, NavbarSpacer } from '@/templates/Navbar';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function DesignPage(props: {
  params: { locale: string };
  searchParams: { product?: string; size?: string; frame?: string; orientation?: string; imageUrl?: string };
}) {
  return (
    <>
      <Navbar />
      <NavbarSpacer />
      <StepProgressBar currentStep={2} />
      <ChatInterface
        locale={props.params.locale}
        productSlug={props.searchParams.product}
        sizeSlug={props.searchParams.size}
        frameSlug={props.searchParams.frame}
        orientationSlug={props.searchParams.orientation as 'landscape' | 'portrait' | undefined}
        initialImageUrl={props.searchParams.imageUrl}
      />
      <Footer />
    </>
  );
}
