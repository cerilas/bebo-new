'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children, ...props }: any) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now we can show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detection for landing page - usually "/" or "/tr", "/en" etc.
  // We can also check for specific patterns or props if available.
  const isLandingPage = pathname === '/' || pathname === '/tr' || pathname === '/en' || pathname === '/fr';

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      {...props}
      forcedTheme={isLandingPage ? 'dark' : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
