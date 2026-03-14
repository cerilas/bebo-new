import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyResponseHash } from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { generatedImageSchema, orderSchema, paymentLogsSchema, userSchema } from '@/models/Schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a FormData object to a plain Record<string, string>. */
const toPayload = (formData: FormData): Record<string, string> => {
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      payload[key] = value;
    }
  });
  return payload;
};

/**
 * Converts Akbank amount string (e.g. "149.99") to integer kuruş (14999).
 * Returns undefined for invalid strings.
 */
const toKurus = (amount?: string): number | undefined => {
  if (!amount) {
    return undefined;
  }
  const n = Number.parseFloat(amount.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
};

/**
 * Builds the final redirect URL.
 * - `trustedPath` is the path we computed from our own logic (locale-aware).
 * - `merchantOid` is appended as a query param so the success/failure page can
 *   display order details.
 */
const toRedirectUrl = (
  request: NextRequest,
  trustedPath: string,
  merchantOid?: string,
): URL => {
  const url = new URL(trustedPath, request.nextUrl.origin);
  if (merchantOid) {
    url.searchParams.set('merchant_oid', merchantOid);
  }
  return url;
};

// ---------------------------------------------------------------------------
// Core order finalisation logic
// ---------------------------------------------------------------------------

async function finalizeOrder(
  payload: Record<string, string>,
  request: NextRequest,
): Promise<{ success: boolean; merchantOid?: string; orderType?: string }> {
  const merchantOid = payload.orderId;

  // Always log every callback for debugging / audit trail
  await db.insert(paymentLogsSchema).values({
    merchantOid: merchantOid ?? null,
    status: payload.responseCode ?? null,
    totalAmount: payload.amount ?? null,
    hash: payload.hash ?? null,
    paymentType: payload.txnCode ?? null,
    failedReasonCode: payload.responseCode ?? null,
    failedReasonMsg: payload.responseMessage ?? null,
    currency: payload.currencyCode ?? null,
    paymentAmount: payload.amount ?? null,
    rawPayload: JSON.stringify(payload),
    ipAddress:
      request.headers.get('x-forwarded-for')
      ?? request.headers.get('x-real-ip')
      ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  });

  if (!merchantOid) {
    console.error('AKBANK return: missing orderId in payload');
    return { success: false };
  }

  const [order] = await db
    .select()
    .from(orderSchema)
    .where(eq(orderSchema.merchantOid, merchantOid))
    .limit(1);

  if (!order) {
    console.error('AKBANK return: order not found', { merchantOid });
    return { success: false, merchantOid };
  }

  // --- Hash & approval check ---
  const hashValid = verifyResponseHash(payload, Env.AKBANK_SECRET_KEY);
  const isApproved = payload.responseCode === 'VPS-0000';
  const success = hashValid && isApproved;

  console.log('AKBANK return callback', {
    merchantOid,
    responseCode: payload.responseCode,
    responseMessage: payload.responseMessage,
    hashValid,
    isApproved,
    success,
    orderType: order.orderType,
  });

  if (success) {
    // Idempotent: skip if already marked success (e.g. duplicate callback)
    if (order.paymentStatus !== 'success') {
      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'success',
          totalAmount: toKurus(payload.amount) ?? order.totalAmount,
          paymentType: 'akbank_payhosting',
          paidAt: new Date(),
          shippingStatus: order.orderType === 'credit' ? null : 'preparing',
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchantOid));

      if (order.orderType === 'credit' && order.creditAmount) {
        // Credit purchase: add credits to the user's balance
        const [currentUser] = await db
          .select({ artCredits: userSchema.artCredits })
          .from(userSchema)
          .where(eq(userSchema.id, order.userId))
          .limit(1);

        if (currentUser) {
          await db
            .update(userSchema)
            .set({ artCredits: currentUser.artCredits + order.creditAmount })
            .where(eq(userSchema.id, order.userId));
        } else {
          await db.insert(userSchema).values({
            id: order.userId,
            artCredits: order.creditAmount,
          });
        }
      } else if (order.generationId) {
        // Product purchase: mark the generated image as selected
        await db
          .update(generatedImageSchema)
          .set({ isSelected: true })
          .where(eq(generatedImageSchema.generationId, order.generationId));
      }
    }

    return { success: true, merchantOid, orderType: order.orderType };
  }

  // Payment rejected or hash invalid
  if (order.paymentStatus !== 'success') {
    await db
      .update(orderSchema)
      .set({
        paymentStatus: 'failed',
        failedReasonCode: payload.responseCode ?? null,
        failedReasonMsg: payload.responseMessage ?? 'Payment rejected',
        updatedAt: new Date(),
      })
      .where(eq(orderSchema.merchantOid, merchantOid));
  }

  return { success: false, merchantOid, orderType: order.orderType };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST handler – Akbank POSTs the payment result here (okUrl / failUrl).
 *
 * The `redirect` query param in the URL was set by our server action and tells
 * us which page to send the user to AFTER processing (locale-aware path).
 * We trust it because it was part of the hashed request; a tampered URL would
 * fail hash verification.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload = toPayload(formData);

  const result = await finalizeOrder(payload, request);

  // The `redirect` param is the locale-aware path set by our action
  // (e.g. "/en/checkout/success" or "/purchase-credits/failed").
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const flow = request.nextUrl.searchParams.get('flow') ?? 'product';

  const defaultSuccessPath
    = redirectParam
    ?? (flow === 'credit' ? '/purchase-credits/success' : '/checkout/success');
  const defaultFailurePath = flow === 'credit'
    ? '/purchase-credits/failed'
    : '/checkout/failed';

  const redirectUrl = result.success
    ? toRedirectUrl(request, defaultSuccessPath, result.merchantOid)
    : toRedirectUrl(request, defaultFailurePath, result.merchantOid);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

/**
 * GET handler – fallback for direct browser navigation / bookmark.
 * Akbank never GETs this route; this is only for edge cases.
 */
export async function GET(request: NextRequest) {
  const merchantOid = request.nextUrl.searchParams.get('merchant_oid') ?? undefined;
  const flow = request.nextUrl.searchParams.get('flow') ?? 'product';
  const redirectParam = request.nextUrl.searchParams.get('redirect');

  // Without a POST body we cannot determine the real outcome,
  // so if we have a redirect param we use it; otherwise fall back to success page.
  const targetPath
    = redirectParam
    ?? (flow === 'credit' ? '/purchase-credits/success' : '/checkout/success');

  const redirectUrl = toRedirectUrl(request, targetPath, merchantOid);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
