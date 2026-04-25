'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export const RedirectInterceptor = ({ url }: { url: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (url) {
      // Clear the cookie manually on the client side
      document.cookie = 'clerk-redirect-url=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

      const searchParamsString = searchParams.toString();
      const currentUrl = pathname + (searchParamsString ? `?${searchParamsString}` : '');

      // Only redirect if the destination is different from the current URL
      if (currentUrl !== url) {
        // Use window.location to force a hard reload and bypass Next.js client router cache
        window.location.href = url;
      }
    }
  }, [url, pathname, searchParams]);

  return null;
};
