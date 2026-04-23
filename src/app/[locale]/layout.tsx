import '@/styles/global.css';

import Script from 'next/script';
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
      <head>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P6JS3JDN');`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P6JS3JDN"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
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
