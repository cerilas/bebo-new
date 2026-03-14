import * as Sentry from '@sentry/nextjs';

export async function register() {
  const enableSpotlight = process.env.SENTRY_SPOTLIGHT === 'true';

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Node.js Sentry configuration
    Sentry.init({
      // Sentry DSN
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Keep Spotlight opt-in to avoid local stream noise on :8969
      spotlight: enableSpotlight,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge Sentry configuration
    Sentry.init({
      // Sentry DSN
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Keep Spotlight opt-in to avoid local stream noise on :8969
      spotlight: enableSpotlight,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });
  }
}
