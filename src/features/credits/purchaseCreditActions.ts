'use server';

import { Buffer } from 'node:buffer';

import { auth, currentUser } from '@clerk/nextjs/server';
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
import { getBaseUrl } from '@/utils/Helpers';

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
  akbankActionUrl?: string;
  akbankFields?: Akbank3dPayRequestFields;
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

    const amountTl = (totalAmount / 100).toFixed(2);
    amountForLog = amountTl;
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128);

    const billingEmail = customerPayload?.customerEmail || userEmail;
    const customerName = customerPayload?.customerName || userEmail.split('@')[0] || 'Birebiro Kullanıcısı';
    const normalizedCardNumber = customerPayload?.cardNumber.replace(/\D/g, '') || '';
    const normalizedCvv = customerPayload?.cardCvv.replace(/\D/g, '') || '';
    const expireDate = formatAkbankCardExpireDate(customerPayload?.cardExpiry || '');
    const requestHeaders = await headers();
    ipAddressForLog = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    || requestHeaders.get('x-real-ip')
    || null;
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

    const callbackBaseUrl = `${getBaseUrl()}/api/akbank/return`;
    const okUrl = `${callbackBaseUrl}?flow=credit&redirect=${encodeURIComponent(successRedirectPath)}&fail_redirect=${encodeURIComponent(failedRedirectPath)}`;
    const failUrl = `${callbackBaseUrl}?flow=credit&redirect=${encodeURIComponent(successRedirectPath)}&fail_redirect=${encodeURIComponent(failedRedirectPath)}`;

    const akbankFields = createAkbank3dPayRequestFields({
      paymentModel: '3D',
      txnCode: '3000',
      merchantSafeId: process.env.AKBANK_MERCHANT_SAFE_ID || '',
      terminalSafeId: process.env.AKBANK_TERMINAL_SAFE_ID || '',
      orderId: merchantOid,
      lang: locale === 'tr' ? 'TR' : 'EN',
      amount: amountTl,
      ccbRewardAmount: '0.00',
      pcbRewardAmount: '0.00',
      xcbRewardAmount: '0.00',
      currencyCode: '949',
      installCount: '1',
      okUrl,
      failUrl,
      emailAddress: billingEmail,
      mobilePhone: '',
      homePhone: '',
      workPhone: '',
      subMerchantId: '',
      b2bIdentityNumber: '',
      creditCard: normalizedCardNumber,
      expiredDate: expireDate,
      cvv: normalizedCvv,
      cardHolderName: customerPayload?.cardHolderName || '',
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
      ipAddress: ipAddressForLog,
      userAgent: userAgentForLog,
    });

    return {
      success: true,
      merchantOid,
      akbankActionUrl: getSecurePayActionUrl(),
      akbankFields,
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
        paymentType: 'akbank_3d_pay',
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
          paymentType: 'akbank_3d_pay',
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
