import { getTranslations } from 'next-intl/server';

import { SignUpWrapper } from '@/components/SignUpWrapper';
import { getI18nPath } from '@/utils/Helpers';

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
  const redirectUrl = props.searchParams.redirect_url;
  const forceRedirectUrl
    = typeof redirectUrl === 'string' ? redirectUrl : undefined;

  return (
    <SignUpWrapper
      path={getI18nPath('/sign-up', props.params.locale)}
      forceRedirectUrl={forceRedirectUrl}
      locale={props.params.locale}
    />
  );
};

export default SignUpPage;
