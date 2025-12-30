import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { AuthWelcomeHeader } from '@/components/AuthWelcomeHeader';
import { ClerkAuthCard } from '@/components/ClerkAuthCard';
import { getI18nPath } from '@/utils/Helpers';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const SignInPage = (props: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const redirectUrl = props.searchParams.redirect_url
    || props.searchParams.return_to
    || props.searchParams.after_sign_in_url;
  const forceRedirectUrl
    = typeof redirectUrl === 'string' ? redirectUrl : undefined;

  // Sync cookie with current redirectUrl to avoid stale redirects
  const cookieStore = cookies();
  if (forceRedirectUrl) {
    cookieStore.set('clerk-redirect-url', forceRedirectUrl, {
      path: '/',
      maxAge: 3600,
      sameSite: 'lax',
    });
  } else {
    cookieStore.delete('clerk-redirect-url');
  }

  return (
    <div className="flex flex-col items-center px-4 sm:px-6">
      {/* Welcome Offer Banner */}
      <AuthWelcomeHeader />

      <ClerkAuthCard
        type="signin"
        path={getI18nPath('/sign-in', props.params.locale)}
        forceRedirectUrl={forceRedirectUrl}
      />
    </div>
  );
};

export default SignInPage;
