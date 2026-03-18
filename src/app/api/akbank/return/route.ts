import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { renderFinalOrderProductImage } from '@/features/orders/finalProductRender';
import {
  chargeAkbank3dModelPaymentApi,
  formatAkbankDateTime,
  getAkbankPaymentErrorMessage,
  getRandomNumberBase16,
  isAkbankPaymentApproved,
  mapAkbankErrorToUserMessage,
  verifyResponseHash,
} from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { generatedImageSchema, orderSchema, paymentLogsSchema, productFrameSchema, userSchema } from '@/models/Schema';
import { getBaseUrl } from '@/utils/Helpers';
import { parseMockupConfig, validateMockupType } from '@/utils/mockupUtils';

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

const toInteger = (value?: string, fallback = 0): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Builds the final redirect URL.
 * - `trustedPath` is the path we computed from our own logic (locale-aware).
 * - `merchantOid` is appended as a query param so the success/failure page can
 *   display order details.
 */
const toRedirectUrl = (
  _request: NextRequest,
  trustedPath: string,
  merchantOid?: string,
): URL => {
  // Use getBaseUrl() so Railway's internal proxy (localhost:8080) doesn't leak
  // into the redirect. getBaseUrl() reads RAILWAY_PUBLIC_DOMAIN at runtime.
  const url = new URL(trustedPath, getBaseUrl());
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
    paymentType: 'akbank_3d_pay',
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

  // --- 3D hash & approval check ---
  const hashValid = verifyResponseHash(payload, Env.AKBANK_SECRET_KEY);
  const is3dApproved = payload.responseCode === 'VPS-0000' && payload.mdStatus === '1';
  const secureFieldsPresent = Boolean(
    payload.secureId
    && payload.secureData
    && payload.secureMd
    && payload.secureEcomInd,
  );
  const threeDSuccess = hashValid && is3dApproved && secureFieldsPresent;

  console.log('AKBANK return callback', {
    merchantOid,
    responseCode: payload.responseCode,
    responseMessage: payload.responseMessage,
    hashValid,
    is3dApproved,
    secureFieldsPresent,
    threeDSuccess,
    orderType: order.orderType,
  });

  if (threeDSuccess) {
    // Idempotent: duplicate callbacks must not trigger a second provision call.
    if (order.paymentStatus === 'success') {
      return { success: true, merchantOid, orderType: order.orderType };
    }

    try {
      const provisionRequest = {
        version: '1.00' as const,
        txnCode: '1000' as const,
        requestDateTime: formatAkbankDateTime(),
        randomNumber: getRandomNumberBase16(128),
        terminal: {
          merchantSafeId: payload.merchantSafeId ?? Env.AKBANK_MERCHANT_SAFE_ID,
          terminalSafeId: payload.terminalSafeId ?? Env.AKBANK_TERMINAL_SAFE_ID,
        },
        order: {
          orderId: merchantOid,
        },
        transaction: {
          amount: payload.amount ?? '0.00',
          currencyCode: 949 as const,
          motoInd: 0 as const,
          installCount: Math.max(1, toInteger(payload.installCount, 1)),
        },
        secureTransaction: {
          secureId: payload.secureId!,
          secureEcomInd: payload.secureEcomInd!,
          secureData: payload.secureData!,
          secureMd: payload.secureMd!,
        },
      };

      console.log('AKBANK 3D Provision Request', {
        merchantOid,
        payload: JSON.stringify(provisionRequest),
        params: {
          secureId: payload.secureId?.slice(0, 20),
          secureData: payload.secureData?.slice(0, 20),
          secureMd: payload.secureMd?.slice(0, 20),
          secureEcomInd: payload.secureEcomInd,
          amount: payload.amount,
          installCount: payload.installCount,
        },
      });

      const provisionResponse = await chargeAkbank3dModelPaymentApi(provisionRequest);
      const provisionApproved = isAkbankPaymentApproved(provisionResponse);

      await db.insert(paymentLogsSchema).values({
        merchantOid,
        status: provisionResponse.responseCode ?? null,
        totalAmount: payload.amount ?? null,
        hash: null,
        paymentType: 'akbank_3d_provision',
        failedReasonCode: provisionApproved ? null : provisionResponse.responseCode ?? null,
        failedReasonMsg: provisionApproved ? null : getAkbankPaymentErrorMessage(provisionResponse),
        currency: payload.currencyCode ?? '949',
        paymentAmount: payload.amount ?? null,
        rawPayload: JSON.stringify({
          request: provisionRequest,
          response: provisionResponse,
        }),
        ipAddress:
          request.headers.get('x-forwarded-for')
          ?? request.headers.get('x-real-ip')
          ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      });

      if (!provisionApproved) {
        const userFriendlyError = mapAkbankErrorToUserMessage(provisionResponse.hostMessage);
        await db
          .update(orderSchema)
          .set({
            paymentStatus: 'failed',
            failedReasonCode: provisionResponse.responseCode ?? 'PROVISION_FAILED',
            failedReasonMsg: userFriendlyError,
            updatedAt: new Date(),
          })
          .where(eq(orderSchema.merchantOid, merchantOid));

        return { success: false, merchantOid, orderType: order.orderType };
      }

      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'success',
          totalAmount: toKurus(payload.amount) ?? order.totalAmount,
          paymentType: 'akbank_3d_pay',
          paidAt: new Date(),
          shippingStatus: order.orderType === 'credit' ? null : 'preparing',
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchantOid));

      if (order.orderType !== 'credit' && order.imageUrl) {
        try {
          console.log('Final render: starting', {
            merchantOid,
            imageUrl: order.imageUrl,
            generationId: order.generationId,
            productFrameId: order.productFrameId,
            orientation: order.orientation,
            imageTransform: order.imageTransform,
          });

          const [frame] = await db
            .select({
              mockupTemplate: productFrameSchema.mockupTemplate,
              mockupTemplateVertical: productFrameSchema.mockupTemplateVertical,
              mockupConfig: productFrameSchema.mockupConfig,
              mockupConfigVertical: productFrameSchema.mockupConfigVertical,
            })
            .from(productFrameSchema)
            .where(eq(productFrameSchema.id, order.productFrameId))
            .limit(1);

          console.log('Final render: frame data', {
            merchantOid,
            frameFound: !!frame,
            mockupTemplate: frame?.mockupTemplate ? 'SET' : 'NULL',
            mockupTemplateVertical: frame?.mockupTemplateVertical ? 'SET' : 'NULL',
            mockupConfig: frame?.mockupConfig ? 'SET' : 'NULL',
            mockupConfigVertical: frame?.mockupConfigVertical ? 'SET' : 'NULL',
          });

          const isPortrait = order.orientation === 'portrait';
          const chosenTemplate = isPortrait
            ? (frame?.mockupTemplateVertical || frame?.mockupTemplate || null)
            : (frame?.mockupTemplate || frame?.mockupTemplateVertical || null);

          const chosenConfigRaw = isPortrait
            ? (frame?.mockupConfigVertical || frame?.mockupConfig || null)
            : (frame?.mockupConfig || frame?.mockupConfigVertical || null);

          const mockupConfig = parseMockupConfig(chosenConfigRaw);
          const mockupType = validateMockupType(mockupConfig.type || 'frame');

          console.log('Final render: resolved config', {
            merchantOid,
            isPortrait,
            chosenTemplate: chosenTemplate ? chosenTemplate.substring(0, 80) : 'NULL',
            mockupType,
            mockupConfig,
          });

          const parsedTransform = order.imageTransform
            ? JSON.parse(order.imageTransform) as { x?: number; y?: number; scale?: number }
            : null;

          const finalProductImageUrl = await renderFinalOrderProductImage({
            imageUrl: order.imageUrl,
            generationId: order.generationId,
            mockupTemplate: chosenTemplate,
            mockupType,
            mockupConfig,
            imageTransform: parsedTransform
              ? {
                  x: parsedTransform.x ?? 0,
                  y: parsedTransform.y ?? 0,
                  scale: parsedTransform.scale ?? 1,
                }
              : null,
          });

          console.log('Final render: SUCCESS', {
            merchantOid,
            finalProductImageUrl,
          });

          await db
            .update(orderSchema)
            .set({
              finalProductImageUrl,
              updatedAt: new Date(),
            })
            .where(eq(orderSchema.merchantOid, merchantOid));
        } catch (renderError) {
          console.error('Final product image render FAILED:', {
            merchantOid,
            imageUrl: order.imageUrl,
            generationId: order.generationId,
            productFrameId: order.productFrameId,
            orientation: order.orientation,
            error: renderError instanceof Error ? renderError.message : String(renderError),
            stack: renderError instanceof Error ? renderError.stack : undefined,
          });
        }
      }

      if (order.orderType === 'credit' && order.creditAmount) {
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
        await db
          .update(generatedImageSchema)
          .set({ isSelected: true })
          .where(eq(generatedImageSchema.generationId, order.generationId));
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Akbank provizyon çağrısı başarısız';

      const userFriendlyError = 'Ödeme işleminde teknik bir hata oluştu. Lütfen daha sonra tekrar deneyin.';

      console.error('AKBANK 3D model provision error', {
        merchantOid,
        error,
      });

      await db.insert(paymentLogsSchema).values({
        merchantOid,
        status: 'PROVISION_ERROR',
        totalAmount: payload.amount ?? null,
        hash: null,
        paymentType: 'akbank_3d_provision',
        failedReasonCode: 'PROVISION_ERROR',
        failedReasonMsg: errorMessage,
        currency: payload.currencyCode ?? '949',
        paymentAmount: payload.amount ?? null,
        rawPayload: JSON.stringify({
          requestPayload: payload,
          error: errorMessage,
        }),
        ipAddress:
          request.headers.get('x-forwarded-for')
          ?? request.headers.get('x-real-ip')
          ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      });

      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'failed',
          failedReasonCode: 'PROVISION_ERROR',
          failedReasonMsg: userFriendlyError,
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchantOid));

      return { success: false, merchantOid, orderType: order.orderType };
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
  const failRedirectParam = request.nextUrl.searchParams.get('fail_redirect');
  const flow = request.nextUrl.searchParams.get('flow') ?? 'product';

  const defaultSuccessPath
    = redirectParam
    ?? (flow === 'credit' ? '/purchase-credits/success' : '/checkout/success');
  const defaultFailurePath = flow === 'credit'
    ? '/purchase-credits/failed'
    : '/checkout/failed';

  const resolvedFailurePath = failRedirectParam ?? defaultFailurePath;

  const redirectUrl = result.success
    ? toRedirectUrl(request, defaultSuccessPath, result.merchantOid)
    : toRedirectUrl(request, resolvedFailurePath, result.merchantOid);

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
