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
      const { userId } = await auth();

      if (!userId && isProtectedRoute(req)) {
        const pathSegments = req.nextUrl.pathname.split('/');
        const localeCandidate = pathSegments[1];
        const locale = AllLocales.includes(localeCandidate as any) ? `/${localeCandidate}` : '';

        const signInUrl = new URL(`${locale}/sign-in`, req.url);
        signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search);

        return NextResponse.redirect(signInUrl);
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
