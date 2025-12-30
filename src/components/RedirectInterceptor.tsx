'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const RedirectInterceptor = ({ url }: { url: string }) => {
  const router = useRouter();

  useEffect(() => {
    if (url) {
      // Clear the cookie manually on the client side
      document.cookie = 'clerk-redirect-url=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

      // Perform the redirection
      router.replace(url);
    }
  }, [url, router]);

  return null;
};
