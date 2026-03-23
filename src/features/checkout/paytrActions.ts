'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

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

export async function processAkbankProductPayment(
  request: ProductAkbankRequest,
): Promise<AkbankPaymentActionResponse> {
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

    await db.insert(orderSchema).values({
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
    });

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
    console.error('AKBANK product payment error:', error);
    return { success: false, error: 'Ödeme işlemi başlatılamadı' };
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
