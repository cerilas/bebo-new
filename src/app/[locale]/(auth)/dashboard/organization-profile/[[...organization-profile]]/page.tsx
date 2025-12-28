import { useTranslations } from 'next-intl';

import { ClerkProfileCard } from '@/components/ClerkProfileCard';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { getI18nPath } from '@/utils/Helpers';

const OrganizationProfilePage = (props: { params: { locale: string } }) => {
  const t = useTranslations('OrganizationProfile');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <ClerkProfileCard
        type="organization"
        path={getI18nPath(
          '/dashboard/organization-profile',
          props.params.locale,
        )}
      />
    </>
  );
};

export default OrganizationProfilePage;
