import { useTranslations } from 'next-intl';

import { ClerkProfileCard } from '@/components/ClerkProfileCard';
import { ArtCreditsCard } from '@/features/credits/ArtCreditsCard';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { getI18nPath } from '@/utils/Helpers';

const UserProfilePage = (props: { params: { locale: string } }) => {
  const t = useTranslations('UserProfile');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <ArtCreditsCard />

      <ClerkProfileCard
        type="user"
        path={getI18nPath('/dashboard/user-profile', props.params.locale)}
      />
    </>
  );
};

export default UserProfilePage;
