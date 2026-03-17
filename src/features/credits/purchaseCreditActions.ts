'use server';

import { Buffer } from 'node:buffer';

import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import {
  chargeAkbankPaymentApi,
  createAkbankPaymentApiAuthHash,
  formatAkbankCardExpireDate,
  formatAkbankDateTime,
  getAkbankPaymentErrorMessage,
  getRandomNumberBase16,
  isAkbankPaymentApproved,
  maskCardNumber,
  sanitizeAkbankIpAddress,
} from '@/features/payments/akbankUtils';
import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import {
  artCreditSettingsSchema,
  orderSchema,
  paymentLogsSchema,
  productFrameSchema,
  productSchema,
  productSizeSchema,
  userSchema,
} from '@/models/Schema';
import { AppConfig } from '@/utils/AppConfig';

import { getUserArtCredits } from '../design/creditsActions';

export type CreditSettings = {
  pricePerCredit: number;
  minPurchase: number;
  maxPurchase: number;
  maxUserCredits: number | null;
  isActive: boolean;
};

type AkbankCreditFormResponse = {
  success: boolean;
  merchantOid?: string;
  redirectPath?: string;
  error?: string;
};

export type CreditPurchaseCustomerPayload = {
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
};

export async function getCreditSettings(): Promise<CreditSettings | null> {
  try {
    const settings = await db
      .select({
        pricePerCredit: artCreditSettingsSchema.pricePerCredit,
        minPurchase: artCreditSettingsSchema.minPurchase,
        maxPurchase: artCreditSettingsSchema.maxPurchase,
        maxUserCredits: artCreditSettingsSchema.maxUserCredits,
        isActive: artCreditSettingsSchema.isActive,
      })
      .from(artCreditSettingsSchema)
      .where(eq(artCreditSettingsSchema.isActive, true))
      .limit(1);

    if (!settings || settings.length === 0) {
      return {
        pricePerCredit: 100,
        minPurchase: 1,
        maxPurchase: 1000,
        maxUserCredits: null,
        isActive: true,
      };
    }

    return settings[0]!;
  } catch (error) {
    console.error('Error fetching credit settings:', error);
    return {
      pricePerCredit: 100,
      minPurchase: 1,
      maxPurchase: 1000,
      maxUserCredits: null,
      isActive: true,
    };
  }
}

export async function calculateCreditPrice(amount: number): Promise<number> {
  const settings = await getCreditSettings();

  if (!settings) {
    return amount * 100;
  }

  return amount * settings.pricePerCredit;
}

export async function createCreditPurchase(
  creditAmount: number,
  locale: string = 'tr',
  customerPayload?: CreditPurchaseCustomerPayload,
): Promise<AkbankCreditFormResponse> {
  let merchantOidForLog: string | null = null;
  let ipAddressForLog: string | null = null;
  let userAgentForLog: string | null = null;
  let amountForLog: string | null = null;

  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return { success: false, error: 'Kullanıcı girişi yapılmamış' };
    }

    const claims = (sessionClaims || {}) as Record<string, unknown>;
    let userEmail
      = (typeof claims.email === 'string' && claims.email)
      || (typeof claims.email_address === 'string' && claims.email_address)
      || '';
    let userPhone = '';

    // 1. Try DB user profile for email + phone
    const [dbUser] = await db
      .select({ email: userSchema.email, phone: userSchema.phone })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (!userEmail && dbUser?.email) {
      userEmail = dbUser.email;
    }
    if (dbUser?.phone) {
      userPhone = dbUser.phone;
    }

    // 2. If still missing email or phone, fall back to Clerk profile
    if (!userEmail || !userPhone) {
      const clerkUser = await currentUser();

      if (!userEmail) {
        const primaryEmailId = clerkUser?.primaryEmailAddressId;
        if (clerkUser?.emailAddresses?.length) {
          const primaryEmail = clerkUser.emailAddresses.find(a => a.id === primaryEmailId);
          userEmail = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '';
        }
      }

      if (!userPhone && clerkUser?.phoneNumbers?.length) {
        const primaryPhone = clerkUser.phoneNumbers.find(p => p.id === clerkUser.primaryPhoneNumberId)
          ?? clerkUser.phoneNumbers[0];
        if (primaryPhone?.phoneNumber) {
          userPhone = primaryPhone.phoneNumber;
        }
      }
    }

    if (!userEmail) {
      return { success: false, error: 'Email adresi gerekli' };
    }

    const settings = await getCreditSettings();
    if (!settings || !settings.isActive) {
      return { success: false, error: 'Kredi satışı şu an aktif değil' };
    }

    if (creditAmount < settings.minPurchase || creditAmount > settings.maxPurchase) {
      return {
        success: false,
        error: `Kredi miktarı ${settings.minPurchase} ile ${settings.maxPurchase} arasında olmalıdır`,
      };
    }

    if (settings.maxUserCredits !== null && settings.maxUserCredits > 0) {
      const currentCredits = await getUserArtCredits();
      const nextTotal = currentCredits + creditAmount;

      if (nextTotal > settings.maxUserCredits) {
        return {
          success: false,
          error: `Maksimum kredi limitine (${settings.maxUserCredits}) ulaştınız. Mevcut krediniz: ${currentCredits}`,
        };
      }
    }

    const totalAmount = creditAmount * settings.pricePerCredit;
    const userIdHash = Buffer.from(userId)
      .toString('base64')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 8);
    const randomPart = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const merchantOid = `CRD${Date.now()}${randomPart}${userIdHash}`;
    merchantOidForLog = merchantOid;

    const localePath = locale !== AppConfig.defaultLocale ? `/${locale}` : '';
    const successRedirectPath = `${localePath}/purchase-credits/success`;
    const failedRedirectPath = `${localePath}/purchase-credits/failed`;

    // Amount: Akbank Payment API expects integer amount (kuruş)
    const amount = totalAmount;
    const amountTl = (amount / 100).toFixed(2);
    amountForLog = amountTl;
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128);

    const billingEmail = customerPayload?.customerEmail || userEmail;
    const customerName = customerPayload?.customerName || userEmail.split('@')[0] || 'Birebiro Kullanıcısı';
    const normalizedCardNumber = customerPayload?.cardNumber.replace(/\D/g, '') || '';
    const normalizedCvv = customerPayload?.cardCvv.replace(/\D/g, '') || '';
    const expireDate = formatAkbankCardExpireDate(customerPayload?.cardExpiry || '');
    const requestHeaders = await headers();
    const ipAddress = sanitizeAkbankIpAddress(
      requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
      || requestHeaders.get('x-real-ip'),
    );
    ipAddressForLog = ipAddress;
    userAgentForLog = requestHeaders.get('user-agent') ?? null;

    const [[fallbackProduct], [fallbackSize], [fallbackFrame]] = await Promise.all([
      db.select({ id: productSchema.id }).from(productSchema).limit(1),
      db.select({ id: productSizeSchema.id }).from(productSizeSchema).limit(1),
      db.select({ id: productFrameSchema.id }).from(productFrameSchema).limit(1),
    ]);

    if (!fallbackProduct || !fallbackSize || !fallbackFrame) {
      return {
        success: false,
        error: 'Kredi siparişi için gerekli ürün referansları bulunamadı',
      };
    }

    const creditGenerationId = `credit-${merchantOid}`;

    await db.insert(orderSchema).values({
      userId,
      merchantOid,
      paymentAmount: totalAmount,
      totalAmount,
      currency: 'TL',
      paymentStatus: 'pending',
      paytrToken: null,
      customerName,
      customerEmail: billingEmail,
      customerPhone: (customerPayload?.customerPhone || userPhone || 'N/A').slice(0, 20),
      customerAddress: customerPayload?.customerAddress || 'Online Kredi Satın Alımı',
      customerCity: customerPayload?.customerCity,
      cityCode: customerPayload?.cityCode,
      customerDistrict: customerPayload?.customerDistrict,
      districtId: customerPayload?.districtId,
      isCorporateInvoice: customerPayload?.isCorporateInvoice ?? false,
      companyName: customerPayload?.isCorporateInvoice ? customerPayload.companyName : null,
      taxNumber: customerPayload?.isCorporateInvoice ? customerPayload.taxNumber : null,
      taxOffice: customerPayload?.isCorporateInvoice ? customerPayload.taxOffice : null,
      companyAddress: customerPayload?.isCorporateInvoice ? customerPayload.companyAddress : null,
      paymentType: customerPayload?.paymentType ?? 'card',
      orderType: 'credit',
      creditAmount,
      generationId: creditGenerationId,
      imageUrl: null,
      productId: fallbackProduct.id,
      productSizeId: fallbackSize.id,
      productFrameId: fallbackFrame.id,
      shippingStatus: 'pending',
    });

    const paymentRequest = {
      version: '1.00' as const,
      txnCode: '1000' as const,
      requestDateTime,
      randomNumber,
      terminal: {
        merchantSafeId: Env.AKBANK_MERCHANT_SAFE_ID,
        terminalSafeId: Env.AKBANK_TERMINAL_SAFE_ID,
      },
      card: {
        cardNumber: normalizedCardNumber,
        cvv2: normalizedCvv,
        expireDate,
      },
      reward: {
        ccbRewardAmount: 0,
        pcbRewardAmount: 0,
        xcbRewardAmount: 0,
      },
      transaction: {
        amount,
        currencyCode: 949 as const,
        motoInd: 0 as const,
        installCount: 1 as const,
      },
      customer: {
        emailAddress: billingEmail,
        ipAddress,
      },
    };

    const requestHash = createAkbankPaymentApiAuthHash(paymentRequest);

    await db.insert(paymentLogsSchema).values({
      merchantOid,
      status: 'OUTGOING_REQUEST',
      totalAmount: amount,
      hash: requestHash,
      paymentType: 'akbank_payment_api',
      failedReasonCode: null,
      failedReasonMsg: null,
      currency: 'TRY',
      paymentAmount: amountTl,
      rawPayload: JSON.stringify({
        ...paymentRequest,
        card: {
          cardNumber: maskCardNumber(normalizedCardNumber),
          cvv2: '***',
          expireDate,
        },
        cardHolderName: customerPayload?.cardHolderName || null,
      }),
      ipAddress,
      userAgent: userAgentForLog,
    });

    const paymentResponse = await chargeAkbankPaymentApi(paymentRequest);
    const approved = isAkbankPaymentApproved(paymentResponse);
    const responseAmount = paymentResponse.transaction?.amount;
    const responseAmountKurus = typeof responseAmount === 'number'
      ? Math.round(responseAmount * 100)
      : totalAmount;

    await db.insert(paymentLogsSchema).values({
      merchantOid,
      status: paymentResponse.responseCode ?? null,
      totalAmount: typeof responseAmount === 'number'
        ? (responseAmount / 100).toFixed(2)
        : amountTl,
      hash: null,
      paymentType: 'akbank_payment_api',
      failedReasonCode: paymentResponse.responseCode ?? null,
      failedReasonMsg: paymentResponse.responseMessage ?? paymentResponse.hostMessage ?? null,
      currency: 'TRY',
      paymentAmount: typeof responseAmount === 'number'
        ? (responseAmount / 100).toFixed(2)
        : amountTl,
      rawPayload: JSON.stringify(paymentResponse),
      ipAddress,
      userAgent: userAgentForLog,
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
        shippingStatus: 'delivered',
        failedReasonCode: null,
        failedReasonMsg: null,
        updatedAt: new Date(),
      })
      .where(eq(orderSchema.merchantOid, merchantOid));

    const [currentDbUser] = await db
      .select({ artCredits: userSchema.artCredits })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (currentDbUser) {
      await db
        .update(userSchema)
        .set({ artCredits: currentDbUser.artCredits + creditAmount })
        .where(eq(userSchema.id, userId));
    } else {
      await db.insert(userSchema).values({
        id: userId,
        artCredits: creditAmount,
      });
    }

    return {
      success: true,
      merchantOid,
      redirectPath: successRedirectPath,
    };
  } catch (error) {
    console.error('Credit purchase error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Bir hata oluştu. Lütfen tekrar deneyin.';

    if (merchantOidForLog) {
      await db.insert(paymentLogsSchema).values({
        merchantOid: merchantOidForLog,
        status: 'REQUEST_ERROR',
        totalAmount: amountForLog,
        hash: null,
        paymentType: 'akbank_payment_api',
        failedReasonCode: 'REQUEST_ERROR',
        failedReasonMsg: errorMessage,
        currency: 'TRY',
        paymentAmount: amountForLog,
        rawPayload: JSON.stringify({
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage,
          errorStack: error instanceof Error ? error.stack ?? null : null,
        }),
        ipAddress: ipAddressForLog,
        userAgent: userAgentForLog,
      });

      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'failed',
          paymentType: 'akbank_payment_api',
          failedReasonCode: 'REQUEST_ERROR',
          failedReasonMsg: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchantOidForLog));
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
