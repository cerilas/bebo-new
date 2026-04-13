'use client';

import { enUS, frFR, trTR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

const clerkLocales: Record<string, typeof trTR> = {
  tr: trTR,
  en: enUS,
  fr: frFR,
};

export function ClerkProviderWithLocale({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const localization = clerkLocales[locale] ?? trTR;
  return <ClerkProvider localization={localization}>{children}</ClerkProvider>;
}
