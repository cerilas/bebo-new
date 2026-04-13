import '@/styles/global.css';

import { enUS, trTR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata = {
  title: 'Birebiro - Dev Mode',
  description: 'Development Mode',
};

const clerkLocales: Record<string, typeof trTR> = {
  tr: trTR,
  en: enUS,
};

export default function RootLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);
  const messages = useMessages();
  const clerkLocalization = clerkLocales[props.params.locale] ?? enUS;

  return (
    <html lang={props.params.locale} suppressHydrationWarning>
      <body>
        <ClerkProvider localization={clerkLocalization}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider locale={props.params.locale} messages={messages}>
              {props.children}
            </NextIntlClientProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
