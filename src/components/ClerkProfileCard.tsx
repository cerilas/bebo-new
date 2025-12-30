'use client';

import { OrganizationProfile, useOrganization, UserProfile } from '@clerk/nextjs';
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
  const { organization, isLoaded: isOrgLoaded } = useOrganization();

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

  // Show loading state while checking organization
  if (!isOrgLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // Show message if user has no organization
  if (!organization) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg className="size-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Henüz bir organizasyonunuz yok
        </h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Organizasyon ayarlarını görmek için önce bir organizasyon oluşturmanız gerekmektedir.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Sol menüden veya ana panelden yeni bir organizasyon oluşturabilirsiniz.
        </p>
      </div>
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
