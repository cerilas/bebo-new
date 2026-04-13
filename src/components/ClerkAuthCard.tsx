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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render Clerk until theme is resolved to avoid dark/light flash
  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const appearance = {
    baseTheme: resolvedTheme === 'dark' ? dark : undefined,
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
