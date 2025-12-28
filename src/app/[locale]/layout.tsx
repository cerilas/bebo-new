import '@/styles/global.css';

import { enUS, frFR, trTR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

import { CookieConsent } from '@/components/CookieConsent';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { LoadingProvider } from '@/components/LoadingProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AllLocales, AppConfig } from '@/utils/AppConfig';
import { getBaseUrl } from '@/utils/Helpers';

const anton = localFont({
  src: '../fonts/Anton-Regular.ttf',
  variable: '--font-anton',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: 'Birebiro - Hayalindeki Tasarım',
    template: '%s | Birebiro',
  },
  description: 'Yapay zeka destekli özel tasarım ürünleri platformu. Hayal gücünüzle tasarlayın, biz sizin için üretelim.',
  manifest: '/site.webmanifest',
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/favicon.svg',
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      url: '/favicon.svg',
    },
  ],
  openGraph: {
    title: 'Birebiro - Hayalindeki Tasarım',
    description: 'Yapay zeka destekli özel tasarım ürünleri platformu.',
    url: getBaseUrl(),
    siteName: 'Birebiro',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Birebiro - Hayalindeki Tasarım',
    description: 'Yapay zeka destekli özel tasarım ürünleri platformu.',
  },
  alternates: {
    canonical: './',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      'index': true,
      'follow': true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export function generateStaticParams() {
  return AllLocales.map(locale => ({ locale }));
}

export default function RootLayout(props: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(props.params.locale);

  // Using internationalization in Client Components
  const messages = useMessages();

  // Clerk localization
  let clerkLocale = enUS;
  let signInUrl = '/sign-in';
  let signUpUrl = '/sign-up';
  let dashboardUrl = '/dashboard';
  let afterSignOutUrl = '/';

  if (props.params.locale === 'fr') {
    clerkLocale = frFR;
  }

  if (props.params.locale === 'tr') {
    clerkLocale = trTR;
  }

  if (props.params.locale !== AppConfig.defaultLocale) {
    signInUrl = `/${props.params.locale}${signInUrl}`;
    signUpUrl = `/${props.params.locale}${signUpUrl}`;
    dashboardUrl = `/${props.params.locale}${dashboardUrl}`;
    afterSignOutUrl = `/${props.params.locale}${afterSignOutUrl}`;
  }

  // The `suppressHydrationWarning` in <html> is used to prevent hydration errors caused by `next-themes`.
  // Solution provided by the package itself: https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app

  // The `suppressHydrationWarning` attribute in <body> is used to prevent hydration errors caused by Sentry Overlay,
  // which dynamically adds a `style` attribute to the body tag.
  return (
    <html lang={props.params.locale} suppressHydrationWarning className="overflow-x-hidden">
      <body className={`overflow-x-hidden bg-background text-foreground antialiased ${anton.variable}`} suppressHydrationWarning>
        {/* PRO: Dark mode support for Shadcn UI */}
        <ClerkProvider
          localization={clerkLocale}
          signInUrl={signInUrl}
          signUpUrl={signUpUrl}
          signInFallbackRedirectUrl={dashboardUrl}
          signUpFallbackRedirectUrl={dashboardUrl}
          afterSignOutUrl={afterSignOutUrl}
        >
          <NextIntlClientProvider
            locale={props.params.locale}
            messages={messages}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <LoadingProvider>
                {props.children}
                <CookieConsent />
                <GoogleAnalytics />
              </LoadingProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
