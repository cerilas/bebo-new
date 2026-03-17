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

const isPublicApiRoute = createRouteMatcher([
  '/api/akbank/(.*)', // Akbank callback + test endpoint (no auth needed)
  '/api/files/(.*)', // Uploaded user assets - publicly accessible
  '/api/health', // Railway health check
]);

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

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  return clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    const pathname = req.nextUrl.pathname;
    const isApiPath = pathname.startsWith('/api/')
      || pathname === '/api'
      || AllLocales.some(locale => pathname.startsWith(`/${locale}/api/`) || pathname === `/${locale}/api`);
    const isSignRoute = req.nextUrl.pathname.includes('/sign-in') || req.nextUrl.pathname.includes('/sign-up');
    const isPaymentResultRoute = /\/(?:checkout|purchase-credits)\/(?:success|failed)$/.test(pathname);

    if (isPaymentResultRoute) {
      return intlMiddleware(req);
    }

    // Akbank callback + test endpoint: no auth required
    if (isPublicApiRoute(req)) {
      return NextResponse.next();
    }

    if (process.env.NODE_ENV === 'development' && pathname === '/api/design/upload-image') {
      return NextResponse.next();
    }

    if (isProtectedRoute(req) && !userId) {
      if (isApiPath) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const pathSegments = req.nextUrl.pathname.split('/');
      const localeCandidate = pathSegments[1];
      const locale = AllLocales.includes(localeCandidate as any) ? `/${localeCandidate}` : '';

      const destination = req.nextUrl.pathname + req.nextUrl.search;
      const signInUrl = new URL(`${locale}/sign-in?redirect_url=${encodeURIComponent(destination)}`, req.url);

      const response = NextResponse.redirect(signInUrl);
      response.cookies.set('clerk-redirect-url', destination, {
        path: '/',
        maxAge: 3600,
        sameSite: 'lax',
      });
      return response;
    }

    // Sync cookie if manually visiting sign-in/up routes
    if (isSignRoute) {
      const response = intlMiddleware(req);
      const redirectUrl = req.nextUrl.searchParams.get('redirect_url')
        || req.nextUrl.searchParams.get('return_to')
        || req.nextUrl.searchParams.get('after_sign_in_url');

      if (redirectUrl) {
        response.cookies.set('clerk-redirect-url', redirectUrl, {
          path: '/',
          maxAge: 3600,
          sameSite: 'lax',
        });
      } else {
        // If no redirect param, we might want to clear it to avoid stale redirects from home page
        response.cookies.delete('clerk-redirect-url');
      }
      return response;
    }

    return intlMiddleware(req);
  })(request, event);
}

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next|monitoring|api/paytr/callback|api/akbank/return|api/webhooks).*)',
    '/',
    '/(api(?!/paytr/callback|/akbank/return|/webhooks)|trpc)(.*)',
  ],
};
