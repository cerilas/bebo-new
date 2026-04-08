import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
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
  '/api/debug/(.*)', // Debug/diagnostic endpoints (self-protected by key)
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

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // API routes: skip intl middleware completely
  if (pathname.startsWith('/api/') || pathname === '/api') {
    return NextResponse.next();
  }

  // Development mode: run intl middleware but skip Clerk auth enforcement
  // clerkMiddleware still wraps this so auth() context is available in server components
  if (process.env.NODE_ENV === 'development') {
    return intlMiddleware(req);
  }

  const { userId } = await auth();
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

  // Authenticated API requests: skip intlMiddleware (locale routing breaks API routes)
  if (isApiPath && userId) {
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
      response.cookies.delete('clerk-redirect-url');
    }
    return response;
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next|monitoring|api/paytr/callback|api/akbank/return|api/webhooks).*)',
    '/',
    '/(api(?!/paytr/callback|/akbank/return|/webhooks)|trpc)(.*)',
  ],
};
