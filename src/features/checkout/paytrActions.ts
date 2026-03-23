'use server';

import { Buffer as NodeBuffer } from 'node:buffer';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { savePublicImageBuffer } from '@/features/design/assetStorage';
import {
  type Akbank3dPayRequestFields,
  createAkbank3dPayRequestFields,
  formatAkbankCardExpireDate,
  formatAkbankDateTime,
  getRandomNumberBase16,
  getSecurePayActionUrl,
  maskCardNumber,
} from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { orderSchema, paymentLogsSchema } from '@/models/Schema';
import { getBaseUrl } from '@/utils/Helpers';

export type ProductAkbankRequest = {
  generationId: string;
  imageUrl: string;
  productId: number;
  productSizeId: number;
  productFrameId: number;
  /** Payment amount in kuruş (integer, e.g. 14999 for 149.99 TL) */
  paymentAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  cityCode?: string;
  customerDistrict?: string;
  districtId?: number;
  isCorporateInvoice?: boolean;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  companyAddress?: string;
  paymentType?: 'card';
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  orientation?: 'landscape' | 'portrait';
  imageTransform?: { x: number; y: number; scale: number };
  previewImageBase64?: string; // Base64 encoded mockup preview screenshot from client
  locale?: string;
};

export type AkbankPaymentActionResponse = {
  success: boolean;
  merchantOid?: string;
  redirectPath?: string;
  akbankActionUrl?: string;
  akbankFields?: Akbank3dPayRequestFields;
  error?: string;
};

const DEFAULT_IMAGE_TRANSFORM = {
  x: 0,
  y: 0,
  scale: 1,
};

const normalizeLocale = (locale?: string): 'tr' | 'en' | 'fr' => {
  if (locale === 'en' || locale === 'fr') {
    return locale;
  }
  return 'tr';
};

const localizedText = (locale: 'tr' | 'en' | 'fr', tr: string, en: string, fr: string): string => {
  if (locale === 'en') {
    return en;
  }
  if (locale === 'fr') {
    return fr;
  }
  return tr;
};

const mapPaymentInitErrorToUserMessage = (error: unknown, locale: 'tr' | 'en' | 'fr', debugCode: string): string => {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('akbank_merchant_safe_id')
    || lowerMessage.includes('akbank_terminal_safe_id')
    || lowerMessage.includes('akbank_secret_key')
    || lowerMessage.includes('akbank_env')) {
    return localizedText(
      locale,
      `Ödeme altyapısı yapılandırması eksik veya hatalı. Lütfen destek ekibiyle paylaşın. (Kod: ${debugCode})`,
      `Payment infrastructure configuration is missing or invalid. Please share this with support. (Code: ${debugCode})`,
      `La configuration de paiement est manquante ou invalide. Veuillez partager ceci avec le support. (Code : ${debugCode})`,
    );
  }

  if (lowerMessage.includes('database')
    || lowerMessage.includes('connect')
    || lowerMessage.includes('timeout')
    || lowerMessage.includes('econnrefused')
    || lowerMessage.includes('enotfound')) {
    return localizedText(
      locale,
      `Veritabanına bağlanılamadığı için ödeme başlatılamadı. Lütfen kısa süre sonra tekrar deneyin. (Kod: ${debugCode})`,
      `Payment could not be started because the database connection failed. Please try again shortly. (Code: ${debugCode})`,
      `Le paiement n'a pas pu démarrer en raison d'un problème de connexion à la base de données. Veuillez réessayer sous peu. (Code : ${debugCode})`,
    );
  }

  if (lowerMessage.includes('duplicate key') || lowerMessage.includes('merchant_oid')) {
    return localizedText(
      locale,
      `Sipariş numarası oluşturulurken çakışma oluştu. Lütfen tekrar deneyin. (Kod: ${debugCode})`,
      `A conflict occurred while creating the order number. Please try again. (Code: ${debugCode})`,
      `Un conflit est survenu lors de la création du numéro de commande. Veuillez réessayer. (Code : ${debugCode})`,
    );
  }

  return localizedText(
    locale,
    `Ödeme işlemi başlatılamadı. Teknik detay: ${message}. (Kod: ${debugCode})`,
    `Payment could not be started. Technical detail: ${message}. (Code: ${debugCode})`,
    `Le paiement n'a pas pu être démarré. Détail technique : ${message}. (Code : ${debugCode})`,
  );
};

const isMissingPreviewImageUrlColumnError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  return (
    code === '42703'
    && message.includes('preview_image_url')
  ) || (
    message.includes('column "preview_image_url"')
    && message.includes('does not exist')
  );
};

export async function processAkbankProductPayment(
  request: ProductAkbankRequest,
): Promise<AkbankPaymentActionResponse> {
  const locale = normalizeLocale(request.locale);

  const missingConfig = [
    'AKBANK_MERCHANT_SAFE_ID',
    'AKBANK_TERMINAL_SAFE_ID',
    'AKBANK_SECRET_KEY',
  ].filter(name => !process.env[name]?.trim());

  if (missingConfig.length > 0) {
    return {
      success: false,
      error: localizedText(
        locale,
        `Ödeme başlatılamadı: sistem ayarları eksik (${missingConfig.join(', ')}).`,
        `Payment could not start: missing system configuration (${missingConfig.join(', ')}).`,
        `Le paiement n'a pas pu démarrer : configuration système manquante (${missingConfig.join(', ')}).`,
      ),
    };
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Build a unique order ID: BRB + timestamp + 4 random digits
    const merchantOid = `BRB${Date.now()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const localePrefix = request.locale && request.locale !== 'tr' ? `/${request.locale}` : '';
    const successRedirectPath = `${localePrefix}/checkout/success`;
    const failedRedirectPath = `${localePrefix}/checkout/failed`;

    const amountTl = (request.paymentAmount / 100).toFixed(2);
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128);
    const normalizedCardNumber = request.cardNumber.replace(/\D/g, '');
    const normalizedCvv = request.cardCvv.replace(/\D/g, '');
    const expireDate = formatAkbankCardExpireDate(request.cardExpiry);
    const requestHeaders = await headers();
    const imageTransform = request.imageTransform ?? DEFAULT_IMAGE_TRANSFORM;

    // Save preview image from base64 if provided
    let previewImageUrl: string | null = null;
    if (request.previewImageBase64) {
      try {
        // Remove data:image/png;base64, prefix if present
        const base64Data = request.previewImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = NodeBuffer.from(base64Data, 'base64');
        const previewAsset = await savePublicImageBuffer({
          scope: 'uploads',
          filePrefix: 'preview',
          extension: 'png',
          buffer,
        });
        previewImageUrl = previewAsset.url;
        console.log('[Akbank] Preview image saved:', previewImageUrl);
      } catch (err) {
        console.warn('[Akbank] Failed to save preview image:', err instanceof Error ? err.message : err);
      }
    }

    const orderValues = {
      userId,
      generationId: request.generationId,
      imageUrl: request.imageUrl,
      productId: request.productId,
      productSizeId: request.productSizeId,
      productFrameId: request.productFrameId,
      merchantOid,
      paymentAmount: request.paymentAmount,
      currency: 'TL',
      paymentStatus: 'pending',
      paytrToken: null,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerPhone: request.customerPhone,
      customerAddress: request.customerAddress,
      customerCity: request.customerCity,
      cityCode: request.cityCode,
      customerDistrict: request.customerDistrict,
      districtId: request.districtId,
      isCorporateInvoice: request.isCorporateInvoice ?? false,
      companyName: request.companyName,
      taxNumber: request.taxNumber,
      taxOffice: request.taxOffice,
      companyAddress: request.companyAddress,
      paymentType: request.paymentType ?? 'card',
      orientation: request.orientation ?? 'landscape',
      imageTransform: JSON.stringify(imageTransform),
      previewImageUrl,
    };

    try {
      await db.insert(orderSchema).values(orderValues);
    } catch (insertError) {
      if (!isMissingPreviewImageUrlColumnError(insertError)) {
        throw insertError;
      }

      console.warn('[Akbank] order.preview_image_url column missing, retrying insert without previewImageUrl');
      const { previewImageUrl: _preview, ...legacyOrderValues } = orderValues;
      await db.insert(orderSchema).values(legacyOrderValues);
    }

    const callbackBaseUrl = `${getBaseUrl()}/api/akbank/return`;
    const okUrl = `${callbackBaseUrl}?flow=product&redirect=${encodeURIComponent(successRedirectPath)}&fail_redirect=${encodeURIComponent(failedRedirectPath)}`;
    const failUrl = `${callbackBaseUrl}?flow=product&redirect=${encodeURIComponent(successRedirectPath)}&fail_redirect=${encodeURIComponent(failedRedirectPath)}`;

    const akbankFields = createAkbank3dPayRequestFields({
      paymentModel: '3D',
      txnCode: '3000',
      merchantSafeId: process.env.AKBANK_MERCHANT_SAFE_ID || '',
      terminalSafeId: process.env.AKBANK_TERMINAL_SAFE_ID || '',
      orderId: merchantOid,
      lang: request.locale === 'tr' ? 'TR' : 'EN',
      amount: amountTl,
      ccbRewardAmount: '0.00',
      pcbRewardAmount: '0.00',
      xcbRewardAmount: '0.00',
      currencyCode: '949',
      installCount: '1',
      okUrl,
      failUrl,
      emailAddress: request.customerEmail,
      mobilePhone: '',
      homePhone: '',
      workPhone: '',
      subMerchantId: '',
      b2bIdentityNumber: '',
      creditCard: normalizedCardNumber,
      expiredDate: expireDate,
      cvv: normalizedCvv,
      cardHolderName: request.cardHolderName,
      randomNumber,
      requestDateTime,
    });

    await db.insert(paymentLogsSchema).values({
      merchantOid,
      status: 'OUTGOING_REQUEST',
      totalAmount: amountTl,
      hash: akbankFields.hash,
      paymentType: 'akbank_3d_pay',
      failedReasonCode: null,
      failedReasonMsg: null,
      currency: 'TRY',
      paymentAmount: amountTl,
      rawPayload: JSON.stringify({
        ...akbankFields,
        creditCard: maskCardNumber(normalizedCardNumber),
        cvv: '***',
      }),
      ipAddress: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
        || requestHeaders.get('x-real-ip')
        || null,
      userAgent: requestHeaders.get('user-agent') ?? null,
    });

    console.log('AKBANK 3D pay product payment initiated', {
      merchantOid,
      amount: amountTl,
      txnCode: akbankFields.txnCode,
    });

    return {
      success: true,
      merchantOid,
      akbankActionUrl: getSecurePayActionUrl(),
      akbankFields,
    };
  } catch (error) {
    const debugCode = `PAYINIT-${Date.now().toString(36).toUpperCase()}`;
    console.error('AKBANK product payment error:', {
      debugCode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: mapPaymentInitErrorToUserMessage(error, locale, debugCode),
    };
  }
}

export async function getOrderStatus(merchantOid: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const order = await db
      .select()
      .from(orderSchema)
      .where(eq(orderSchema.merchantOid, merchantOid))
      .limit(1);

    if (!order || order.length === 0) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = order[0]!;

    if (orderData.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    return {
      success: true,
      data: orderData,
    };
  } catch (error) {
    console.error('Get order status error:', error);
    return { success: false, error: 'Failed to get order status' };
  }
}
