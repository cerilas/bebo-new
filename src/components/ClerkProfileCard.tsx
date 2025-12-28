'use client';

import { OrganizationProfile, UserProfile } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Props = {
  type: 'user' | 'organization';
  path: string;
};

export const ClerkProfileCard = ({ type, path }: Props) => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme) : 'dark';
  const appearance = {
    baseTheme: currentTheme === 'dark' ? dark : undefined,
    elements: {
      card: 'shadow-none border-none',
      rootBox: 'w-full',
      cardBox: 'w-full flex shadow-none border-none',
      navbar: 'dark:border-slate-800',
      headerTitle: 'dark:text-white',
      headerSubtitle: 'dark:text-slate-400',
      profileSectionTitleText: 'dark:text-white',
      profileSectionPrimaryButton: 'dark:text-blue-400 dark:hover:bg-slate-800',
      accordionTriggerButton: 'dark:text-white dark:hover:bg-slate-800',
      breadcrumbsItem: 'dark:text-slate-400',
      breadcrumbsItemCurrent: 'dark:text-white',
      badge: 'dark:bg-slate-800 dark:text-slate-300',
    },
  };

  if (type === 'user') {
    return (
      <UserProfile
        routing="path"
        path={path}
        appearance={appearance}
      />
    );
  }

  return (
    <OrganizationProfile
      routing="path"
      path={path}
      appearance={appearance}
    />
  );
};
