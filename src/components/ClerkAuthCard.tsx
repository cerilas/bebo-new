'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

type Props = {
  type: 'signin' | 'signup';
  path: string;
  forceRedirectUrl?: string;
};

export const ClerkAuthCard = ({ type, path, forceRedirectUrl }: Props) => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme) : 'dark';
  const appearance = {
    baseTheme: currentTheme === 'dark' ? dark : undefined,
    elements: {
      card: 'shadow-none overflow-hidden',
      navbar: 'hidden',
      rootBox: 'mx-auto',
    },
  };

  if (type === 'signin') {
    return (
      <SignIn
        path={path}
        routing="path"
        forceRedirectUrl={forceRedirectUrl}
        fallbackRedirectUrl={forceRedirectUrl || '/dashboard'}
        appearance={appearance}
      />
    );
  }

  return (
    <SignUp
      path={path}
      routing="path"
      forceRedirectUrl={forceRedirectUrl}
      fallbackRedirectUrl={forceRedirectUrl || '/dashboard'}
      appearance={appearance}
    />
  );
};
