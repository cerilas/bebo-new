'use client';

import { enUS, trTR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

const clerkLocales: Record<string, typeof trTR> = {
  tr: trTR,
  en: enUS,
};

export function ClerkProviderWithLocale({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const localization = clerkLocales[locale] ?? enUS;
  return <ClerkProvider localization={localization}>{children}</ClerkProvider>;
}
