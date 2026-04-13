import '@/styles/global.css';

import { NextIntlClientProvider, useMessages } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

import { ClerkProviderWithLocale } from '@/components/ClerkProviderWithLocale';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata = {
  title: 'Birebiro - Dev Mode',
  description: 'Development Mode',
};

export default function RootLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);
  const messages = useMessages();

  return (
    <html lang={props.params.locale} suppressHydrationWarning>
      <body>
        <ClerkProviderWithLocale locale={props.params.locale}>
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
        </ClerkProviderWithLocale>
      </body>
    </html>
  );
}
