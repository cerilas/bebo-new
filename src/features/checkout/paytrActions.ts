'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import {
  type AkbankPayHostingRequestFields,
  buildPayHostingHashInput,
  formatAkbankDateTime,
  getPayHostingActionUrl,
  getRandomNumberBase16,
  hashToString,
} from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { orderSchema } from '@/models/Schema';
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
  orientation?: 'landscape' | 'portrait';
  imageTransform?: { x: number; y: number; scale: number };
  locale?: string;
};

export type AkbankFormResponse = {
  success: boolean;
  actionUrl?: string;
  fields?: AkbankPayHostingRequestFields;
  merchantOid?: string;
  error?: string;
};

export async function getAkbankPayHostingForm(
  request: ProductAkbankRequest,
): Promise<AkbankFormResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Build a unique order ID: BRB + timestamp + 4 random digits
    const merchantOid = `BRB${Date.now()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const appUrl = getBaseUrl();
    const localePrefix = request.locale && request.locale !== 'tr' ? `/${request.locale}` : '';

    // okUrl / failUrl: Akbank will POST the response body here.
    // We use a single handler endpoint; the `flow` param lets the handler pick
    // the right redirect after processing.
    const okUrl = `${appUrl}/api/akbank/return?flow=product&redirect=${encodeURIComponent(`${localePrefix}/checkout/success`)}`;
    const failUrl = `${appUrl}/api/akbank/return?flow=product&redirect=${encodeURIComponent(`${localePrefix}/checkout/failed`)}`;

    // Amount: kuruş → TL with 2 decimal places (e.g. 14999 → "149.99")
    const amount = (request.paymentAmount / 100).toFixed(2);
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128); // 128-char lowercase hex

    const lang: 'TR' | 'EN'
      = (request.locale ?? 'tr').toUpperCase() === 'EN' ? 'EN' : 'TR';

    const plainFields: Omit<AkbankPayHostingRequestFields, 'hash'> = {
      paymentModel: 'PAY_HOSTING',
      txnCode: '1000',
      merchantSafeId: Env.AKBANK_MERCHANT_SAFE_ID,
      terminalSafeId: Env.AKBANK_TERMINAL_SAFE_ID,
      orderId: merchantOid,
      lang,
      amount,
      ccbRewardAmount: '0.00',
      pcbRewardAmount: '0.00',
      xcbRewardAmount: '0.00',
      currencyCode: '949',
      installCount: '1',
      okUrl,
      failUrl,
      emailAddress: request.customerEmail,
      mobilePhone: '', // empty avoids VPS-3001 pattern validation
      homePhone: '',
      workPhone: '',
      randomNumber,
      requestDateTime,
      b2bIdentityNumber: '',
      merchantData: '',
      merchantBranchNo: '',
      mobileEci: '',
      walletProgramData: '',
      mobileAssignedId: '',
      mobileDeviceType: '',
    };

    const hash = hashToString(
      buildPayHostingHashInput(plainFields),
      Env.AKBANK_SECRET_KEY,
    );

    const fields: AkbankPayHostingRequestFields = { ...plainFields, hash };

    // Persist the pending order before redirecting to Akbank
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
      imageTransform: request.imageTransform
        ? JSON.stringify(request.imageTransform)
        : null,
    });

    console.log('AKBANK product payment initiated', {
      merchantOid,
      amount,
      txnCode: plainFields.txnCode,
      okUrl,
      failUrl,
    });

    return {
      success: true,
      actionUrl: getPayHostingActionUrl(),
      fields,
      merchantOid,
    };
  } catch (error) {
    console.error('AKBANK payment form creation error:', error);
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
