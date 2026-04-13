'use client';

import { enUS, frFR, trTR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';

// Patch missing keys in trTR (upstream @clerk/localizations is incomplete)
const trTRPatched = {
  ...trTR,
  signIn: {
    ...trTR.signIn,
    start: {
      ...trTR.signIn?.start,
      titleCombined: '{{applicationName}} ile devam et',
    },
  },
};

const clerkLocales: Record<string, typeof trTR> = {
  tr: trTRPatched,
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
  const localization = clerkLocales[locale] ?? trTRPatched;
  return <ClerkProvider localization={localization}>{children}</ClerkProvider>;
}
