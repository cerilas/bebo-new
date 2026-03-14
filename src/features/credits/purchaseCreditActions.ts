'use server';

import { Buffer } from 'node:buffer';

import { auth, currentUser } from '@clerk/nextjs/server';
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
import { artCreditSettingsSchema, orderSchema } from '@/models/Schema';
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
  actionUrl?: string;
  fields?: AkbankPayHostingRequestFields;
  merchantOid?: string;
  error?: string;
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
): Promise<AkbankCreditFormResponse> {
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

    if (!userEmail) {
      const clerkUser = await currentUser();

      const primaryEmailId = clerkUser?.primaryEmailAddressId;
      if (clerkUser?.emailAddresses?.length) {
        const primaryEmail = clerkUser.emailAddresses.find(
          address => address.id === primaryEmailId,
        );
        userEmail = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '';
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

    const appUrl = getBaseUrl();
    const localePath = locale !== AppConfig.defaultLocale ? `/${locale}` : '';

    // okUrl / failUrl: Akbank POSTs the response body here.
    // Keep them clean – avoid result/locale params that are redundant for the POST handler.
    const okUrl = `${appUrl}/api/akbank/return?flow=credit&redirect=${encodeURIComponent(`${localePath}/purchase-credits/success`)}`;
    const failUrl = `${appUrl}/api/akbank/return?flow=credit&redirect=${encodeURIComponent(`${localePath}/purchase-credits/failed`)}`;

    // Amount: kuruş → TL with 2 decimal places
    const amount = (totalAmount / 100).toFixed(2);
    const requestDateTime = formatAkbankDateTime();
    const randomNumber = getRandomNumberBase16(128); // 128-char lowercase hex

    const lang: 'TR' | 'EN' = locale.toUpperCase() === 'EN' ? 'EN' : 'TR';

    const plainFields: Omit<AkbankPayHostingRequestFields, 'hash'> = {
      paymentModel: 'PAY_HOSTING',
      txnCode: '1000', // Satış (sale) – Akbank PAY_HOSTING docs
      merchantSafeId: Env.AKBANK_MERCHANT_SAFE_ID,
      terminalSafeId: Env.AKBANK_TERMINAL_SAFE_ID,
      orderId: merchantOid,
      lang,
      amount,
      ccbRewardAmount: '0.00',
      pcbRewardAmount: '0.00',
      xcbRewardAmount: '0.00',
      currencyCode: '949', // TRY
      installCount: '1',
      okUrl,
      failUrl,
      emailAddress: userEmail,
      // No real phone for credit purchases – use a valid placeholder format
      mobilePhone: '5000000000',
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

    const customerName = userEmail.split('@')[0] || 'Birebiro Kullanıcısı';

    console.log('AKBANK credit payment initiated', {
      merchantOid,
      amount,
      txnCode: plainFields.txnCode,
      creditAmount,
      okUrl,
      failUrl,
    });

    await db.insert(orderSchema).values({
      userId,
      merchantOid,
      paymentAmount: totalAmount,
      totalAmount,
      currency: 'TL',
      paymentStatus: 'pending',
      paytrToken: null,
      customerName,
      customerEmail: userEmail,
      customerPhone: '5000000000',
      customerAddress: 'Online Kredi Satın Alımı',
      orderType: 'credit',
      creditAmount,
      generationId: null,
      imageUrl: null,
      productId: null,
      productSizeId: null,
      productFrameId: null,
      shippingStatus: null,
    });

    return {
      success: true,
      actionUrl: getPayHostingActionUrl(),
      fields,
      merchantOid,
    };
  } catch (error) {
    console.error('Credit purchase error:', error);
    return {
      success: false,
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    };
  }
}
