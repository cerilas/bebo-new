'use client';

import { useLayoutEffect } from 'react';

export const ForceDarkTheme = () => {
  useLayoutEffect(() => {
    // Save original styles
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    // Apply dark theme
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0a0a0f';
    document.body.style.backgroundColor = '#0a0a0f';

    return () => {
      // Cleanup
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  return null;
};
