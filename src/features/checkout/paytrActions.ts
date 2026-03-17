'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import {
  chargeAkbankPaymentApi,
  formatAkbankCardExpireDate,
  formatAkbankDateTime,
  getAkbankPaymentErrorMessage,
  getRandomNumberBase16,
  isAkbankPaymentApproved,
  maskCardNumber,
} from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { generatedImageSchema, orderSchema, paymentLogsSchema } from '@/models/Schema';

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
  error?: string;
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

    // Amount: kuruş → TL with 2 decimal places (e.g. 14999 → "149.99")
    const amount = (request.paymentAmount / 100).toFixed(2);
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128);
    const normalizedCardNumber = request.cardNumber.replace(/\D/g, '');
    const normalizedCvv = request.cardCvv.replace(/\D/g, '');
    const expireDate = formatAkbankCardExpireDate(request.cardExpiry);
    const requestHeaders = await headers();
    const ipAddress = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
      || requestHeaders.get('x-real-ip')
      || '127.0.0.1';

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

    const paymentRequest = {
      version: '1.00' as const,
      txnCode: '1000' as const,
      randomNumber,
      requestDateTime,
      terminal: {
        merchantSafeId: Env.AKBANK_MERCHANT_SAFE_ID,
        terminalSafeId: Env.AKBANK_TERMINAL_SAFE_ID,
      },
      card: {
        cardNumber: normalizedCardNumber,
        cvv2: normalizedCvv,
        expireDate,
      },
      order: {
        orderId: merchantOid,
      },
      reward: {
        ccbRewardAmount: '0.00',
        pcbRewardAmount: '0.00',
        xcbRewardAmount: '0.00',
      },
      transaction: {
        amount,
        currencyCode: 949 as const,
        motoInd: 0 as const,
        installCount: 1 as const,
      },
      customer: {
        emailAddress: request.customerEmail,
        ipAddress,
      },
    };

    await db.insert(paymentLogsSchema).values({
      merchantOid,
      status: 'OUTGOING_REQUEST',
      totalAmount: amount,
      hash: null,
      paymentType: 'akbank_payment_api',
      failedReasonCode: null,
      failedReasonMsg: null,
      currency: 'TRY',
      paymentAmount: amount,
      rawPayload: JSON.stringify({
        ...paymentRequest,
        card: {
          cardNumber: maskCardNumber(normalizedCardNumber),
          cvv2: '***',
          expireDate,
        },
        cardHolderName: request.cardHolderName,
      }),
      ipAddress,
      userAgent: requestHeaders.get('user-agent') ?? null,
    });

    console.log('AKBANK product payment initiated', {
      merchantOid,
      amount,
      txnCode: paymentRequest.txnCode,
    });

    const paymentResponse = await chargeAkbankPaymentApi(paymentRequest);
    const approved = isAkbankPaymentApproved(paymentResponse);
    const responseAmount = paymentResponse.transaction?.amount;
    const responseAmountKurus = typeof responseAmount === 'number'
      ? Math.round(responseAmount * 100)
      : request.paymentAmount;

    await db.insert(paymentLogsSchema).values({
      merchantOid,
      status: paymentResponse.responseCode ?? null,
      totalAmount: typeof responseAmount === 'number' ? responseAmount.toFixed(2) : amount,
      hash: null,
      paymentType: 'akbank_payment_api',
      failedReasonCode: paymentResponse.responseCode ?? null,
      failedReasonMsg: paymentResponse.responseMessage ?? paymentResponse.hostMessage ?? null,
      currency: 'TRY',
      paymentAmount: typeof responseAmount === 'number' ? responseAmount.toFixed(2) : amount,
      rawPayload: JSON.stringify(paymentResponse),
      ipAddress,
      userAgent: requestHeaders.get('user-agent') ?? null,
    });

    if (!approved) {
      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'failed',
          paymentType: 'akbank_payment_api',
          failedReasonCode: paymentResponse.responseCode ?? null,
          failedReasonMsg: getAkbankPaymentErrorMessage(paymentResponse),
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchantOid));

      return {
        success: false,
        merchantOid,
        redirectPath: failedRedirectPath,
        error: getAkbankPaymentErrorMessage(paymentResponse),
      };
    }

    await db
      .update(orderSchema)
      .set({
        paymentStatus: 'success',
        totalAmount: responseAmountKurus,
        paymentType: 'akbank_payment_api',
        paidAt: new Date(),
        shippingStatus: 'preparing',
        failedReasonCode: null,
        failedReasonMsg: null,
        updatedAt: new Date(),
      })
      .where(eq(orderSchema.merchantOid, merchantOid));

    await db
      .update(generatedImageSchema)
      .set({ isSelected: true })
      .where(eq(generatedImageSchema.generationId, request.generationId));

    return {
      success: true,
      merchantOid,
      redirectPath: successRedirectPath,
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
