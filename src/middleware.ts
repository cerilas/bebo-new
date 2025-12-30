import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type {
  NextFetchEvent,
  NextRequest,
} from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { AllLocales, AppConfig } from './utils/AppConfig';

const intlMiddleware = createMiddleware({
  locales: AllLocales,
  localePrefix: AppConfig.localePrefix,
  defaultLocale: AppConfig.defaultLocale,
});

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
  '/onboarding(.*)',
  '/:locale/onboarding(.*)',
  '/design(.*)',
  '/:locale/design(.*)',
  '/checkout(.*)',
  '/:locale/checkout(.*)',
  '/purchase-credits(.*)',
  '/:locale/purchase-credits(.*)',
  '/api(.*)',
  '/:locale/api(.*)',
]);

const isClerkRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/:locale/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/sign-up(.*)',
  '/design(.*)',
  '/:locale/design(.*)',
  '/checkout(.*)',
  '/:locale/checkout(.*)',
  '/purchase-credits(.*)',
  '/:locale/purchase-credits(.*)',
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
  '/onboarding(.*)',
  '/:locale/onboarding(.*)',
  '/api(.*)',
  '/:locale/api(.*)',
]);

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (isClerkRoute(request)) {
    return clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        const pathSegments = req.nextUrl.pathname.split('/');
        const localeCandidate = pathSegments[1];
        const locale = AllLocales.includes(localeCandidate as any) ? `/${localeCandidate}` : '';

        // Manually build localized sign-in URL with redirect_url
        const destination = req.nextUrl.pathname + req.nextUrl.search;
        const signInUrl = new URL(`${locale}/sign-in?redirect_url=${encodeURIComponent(destination)}`, req.url);

        const { userId } = await auth();
        if (!userId) {
          const response = NextResponse.redirect(signInUrl);
          response.cookies.set('clerk-redirect-url', destination, {
            path: '/',
            maxAge: 3600, // 1 hour
            sameSite: 'lax',
          });
          return response;
        }
      }

      return intlMiddleware(req);
    })(request, event);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next|monitoring|api/paytr/callback|api/webhooks).*)',
    '/',
    '/(api(?!/paytr/callback|/webhooks)|trpc)(.*)',
  ],
};
