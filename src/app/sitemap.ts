import type { MetadataRoute } from 'next';

import { AllLocales } from '@/utils/AppConfig';
import { getBaseUrl } from '@/utils/Helpers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // 1. Static Pages - Ordered by priority for Google Sitelinks
  const staticPages = [
    '',
    '/products',
    '/sign-up',
    '/nasil-calisir',
    '/ozellikler',
    '/contact',
    '/sign-in',
    '/about',
    '/pricing',
    '/legal',
  ];

  const staticEntries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of AllLocales) {
      const url = `${baseUrl}/${locale}${page}`;

      // Assign granular priorities based on page
      let priority = 0.5;
      if (page === '') {
        priority = 1.0;
      } else if (page === '/products') {
        priority = 0.95;
      } else if (page === '/sign-up') {
        priority = 0.9;
      } else if (page === '/nasil-calisir') {
        priority = 0.85;
      } else if (page === '/ozellikler') {
        priority = 0.8;
      } else if (page === '/contact') {
        priority = 0.75;
      }

      staticEntries.push({
        url,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority,
      });
    }
  }

  return staticEntries;
}
