import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type {
  NextFetchEvent,
  NextRequest,
} from 'next/server';
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
        // If the user is unauthenticated, redirect to sign-in with return_to
        return (await auth()).redirectToSignIn({
          returnBackUrl: req.url,
        });
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
