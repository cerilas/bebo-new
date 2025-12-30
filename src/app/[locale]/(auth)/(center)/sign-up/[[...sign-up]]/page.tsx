import { getTranslations } from 'next-intl/server';

import { AuthWelcomeHeader } from '@/components/AuthWelcomeHeader';
import { ClerkAuthCard } from '@/components/ClerkAuthCard';
import { getI18nPath } from '@/utils/Helpers';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'SignUp',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const SignUpPage = (props: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const redirectUrl = props.searchParams.redirect_url
    || props.searchParams.return_to
    || props.searchParams.after_sign_in_url;
  const forceRedirectUrl
    = typeof redirectUrl === 'string' ? redirectUrl : undefined;

  return (
    <div className="flex flex-col items-center px-4 py-10 sm:px-6">
      <AuthWelcomeHeader />

      <ClerkAuthCard
        type="signup"
        path={getI18nPath('/sign-up', props.params.locale)}
        forceRedirectUrl={forceRedirectUrl}
      />
    </div>
  );
};

export default SignUpPage;
