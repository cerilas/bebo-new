import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const Env = createEnv({
  server: {
    CLERK_SECRET_KEY: z.string().min(1),
    DATABASE_URL: z.string().optional(),
    LOGTAIL_SOURCE_TOKEN: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    BILLING_PLAN_ENV: z.enum(['dev', 'test', 'prod']),
    PAYTR_MERCHANT_ID: z.string().min(1).optional(),
    PAYTR_MERCHANT_KEY: z.string().min(1).optional(),
    PAYTR_MERCHANT_SALT: z.string().min(1).optional(),
    AKBANK_MERCHANT_SAFE_ID: z.string().min(1),
    AKBANK_TERMINAL_SAFE_ID: z.string().min(1),
    AKBANK_SECRET_KEY: z.string().min(1),
    AKBANK_ENV: z.enum(['test', 'prod']).default('test'),
    NETGSM_USERNAME: z.string().min(1),
    NETGSM_PASSWORD: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  // You need to destructure all the keys manually
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    BILLING_PLAN_ENV: process.env.BILLING_PLAN_ENV,
    PAYTR_MERCHANT_ID: process.env.PAYTR_MERCHANT_ID,
    PAYTR_MERCHANT_KEY: process.env.PAYTR_MERCHANT_KEY,
    PAYTR_MERCHANT_SALT: process.env.PAYTR_MERCHANT_SALT,
    AKBANK_MERCHANT_SAFE_ID: process.env.AKBANK_MERCHANT_SAFE_ID,
    AKBANK_TERMINAL_SAFE_ID: process.env.AKBANK_TERMINAL_SAFE_ID,
    AKBANK_SECRET_KEY: process.env.AKBANK_SECRET_KEY,
    AKBANK_ENV: process.env.AKBANK_ENV,
    NETGSM_USERNAME: process.env.NETGSM_USERNAME,
    NETGSM_PASSWORD: process.env.NETGSM_PASSWORD,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
});
