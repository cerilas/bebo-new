'use server';

import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { artCreditSettingsSchema, orderSchema } from '@/models/Schema';
import { AppConfig } from '@/utils/AppConfig';
import { getBaseUrl } from '@/utils/Helpers';

import { getUserArtCredits } from '../design/creditsActions';

export type CreditSettings = {
  pricePerCredit: number; // Kuruş cinsinden
  minPurchase: number;
  maxPurchase: number;
  maxUserCredits: number | null;
  isActive: boolean;
};

type PayTRCreditTokenResponse = {
  success: boolean;
  token?: string;
  merchantOid?: string;
  error?: string;
};

/**
 * Art Credit ayarlarını veritabanından çeker
 * @returns Credit ayarları veya null
 */
export async function getCreditSettings(): Promise<CreditSettings | null> {
  try {
    // En son aktif ayarları al
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
      // Eğer ayar yoksa default değerleri döndür
      return {
        pricePerCredit: 100, // 1 TL
        minPurchase: 1,
        maxPurchase: 1000,
        maxUserCredits: null,
        isActive: true,
      };
    }

    return settings[0]!;
  } catch (error) {
    console.error('Error fetching credit settings:', error);
    // Hata durumunda default değerleri döndür
    return {
      pricePerCredit: 100,
      minPurchase: 1,
      maxPurchase: 1000,
      maxUserCredits: null,
      isActive: true,
    };
  }
}

/**
 * Kredi fiyatını hesaplar
 * @param amount - Satın alınacak kredi miktarı
 * @returns Toplam tutar (kuruş cinsinden)
 */
export async function calculateCreditPrice(amount: number): Promise<number> {
  const settings = await getCreditSettings();

  if (!settings) {
    return amount * 100; // Default: 1 TL per credit
  }

  return amount * settings.pricePerCredit;
}

/**
 * Kredi satın alımı için PayTR token oluşturur ve sipariş kaydeder
 * @param userId - Kullanıcı ID (Clerk'ten gelecek)
 * @param userEmail - Kullanıcı email adresi
 * @param creditAmount - Satın alınacak kredi miktarı
 * @param userIp - Kullanıcının IP adresi
 * @returns PayTR token ve merchant_oid
 */
export async function createCreditPurchase(
  userId: string,
  userEmail: string,
  creditAmount: number,
  userIp: string,
  locale: string = 'tr', // Default to 'tr' if not provided
): Promise<PayTRCreditTokenResponse> {
  try {
    if (!userId) {
      return { success: false, error: 'Kullanıcı girişi yapılmamış' };
    }

    if (!userEmail) {
      return { success: false, error: 'Email adresi gerekli' };
    }

    // Kredi ayarlarını kontrol et
    const settings = await getCreditSettings();
    if (!settings || !settings.isActive) {
      return { success: false, error: 'Kredi satışı şu an aktif değil' };
    }

    // Min/Max kontrolü
    if (creditAmount < settings.minPurchase || creditAmount > settings.maxPurchase) {
      return {
        success: false,
        error: `Kredi miktarı ${settings.minPurchase} ile ${settings.maxPurchase} arasında olmalıdır`,
      };
    }

    // Maksimum kredi limiti kontrolü
    if (settings.maxUserCredits !== null && settings.maxUserCredits > 0) {
      const currentCredits = await getUserArtCredits();
      const nextTotal = currentCredits + creditAmount;

      if (nextTotal > settings.maxUserCredits) {
        // Eğer kullanıcı zaten limit üzerindeyse ve yeni kredi almaya çalışıyorsa hata ver
        // User is allowed to use their existing credits, but not buy new ones if they are over limit
        return {
          success: false,
          error: `Maksimum kredi limitine (${settings.maxUserCredits}) ulaştınız. Mevcut krediniz: ${currentCredits}`,
        };
      }
    }

    // Toplam tutarı hesapla (kuruş cinsinden)
    const totalAmount = creditAmount * settings.pricePerCredit;

    // Benzersiz sipariş numarası oluştur - alfanumerik format (PayTR requirement)
    // Format: CRD{timestamp}{random}{userIdHash} - özel karakter yok
    const userIdHash = Buffer.from(userId).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 8);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const merchantOid = `CRD${Date.now()}${randomPart}${userIdHash}`;

    console.log('🆔 Generated merchant_oid:', merchantOid);

    // PayTR API bilgileri
    const merchantId = Env.PAYTR_MERCHANT_ID;
    const merchantKey = Env.PAYTR_MERCHANT_KEY;
    const merchantSalt = Env.PAYTR_MERCHANT_SALT;

    // App URL
    const appUrl = getBaseUrl();

    // Construct URL based on locale prefix strategy
    let localePath = '';
    if (locale !== AppConfig.defaultLocale) {
      localePath = `/${locale}`;
    }

    // Update URLs to include locale only if needed
    const merchantOkUrl = `${appUrl}${localePath}/purchase-credits/success?merchant_oid=${merchantOid}`;
    const merchantFailUrl = `${appUrl}${localePath}/purchase-credits/failed?merchant_oid=${merchantOid}`;

    // User basket (sepet içeriği) - PayTR formatında
    const userBasket = Buffer.from(JSON.stringify([
      [`${creditAmount} Tasarım hakkı`, totalAmount.toString(), 1],
    ])).toString('base64');

    const noInstallment = 0;
    const maxInstallment = 0;
    const currency = 'TL';
    const testMode = 0;

    // Kullanıcı bilgileri
    const customerEmail = userEmail; // Clerk'ten gelen gerçek email
    const customerName = userEmail.split('@')[0] || 'Birebiro Kullanıcısı'; // Email'den isim oluştur
    const customerPhone = '5555555555'; // Kredi için telefon gerekmez
    const customerAddress = 'Online Kredi Satın Alımı'; // Kredi için adres gerekmez

    // Hash oluştur
    const hashStr = `${merchantId}${userIp}${merchantOid}${customerEmail}${totalAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
    const paytrToken = createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    // PayTR API'ye gönderilecek veriler
    const postData = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: customerEmail,
      payment_amount: totalAmount.toString(),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: '1',
      no_installment: noInstallment.toString(),
      max_installment: maxInstallment.toString(),
      user_name: customerName,
      user_address: customerAddress,
      user_phone: customerPhone,
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: '30',
      currency,
      test_mode: testMode.toString(),
      lang: 'tr',
      iframe_redirect: '1', // Ensure iframe breaks out on success/fail
    });

    console.log('PayTR Credit Purchase Request:', {
      merchantOid,
      creditAmount,
      totalAmount,
      userIp,
    });

    // PayTR API'ye istek gönder
    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString(),
    });

    const result = await response.json() as { status: string; token?: string; reason?: string };

    console.log('PayTR Response:', result);

    if (result.status === 'success' && result.token) {
      // Siparişi veritabanına kaydet
      await db.insert(orderSchema).values({
        userId,
        merchantOid,
        paymentAmount: totalAmount,
        totalAmount,
        currency: 'TL',
        paymentStatus: 'pending',
        paytrToken: result.token,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        orderType: 'credit', // Kredi siparişi
        creditAmount, // Kredi miktarını kaydet
        // Fiziksel ürün alanlarını null bırak
        generationId: null,
        productId: null,
        productSizeId: null,
        productFrameId: null,
        shippingStatus: null,
      });

      return {
        success: true,
        token: result.token,
        merchantOid,
      };
    }

    return {
      success: false,
      error: result.reason || 'PayTR token alınamadı',
    };
  } catch (error) {
    console.error('Credit purchase error:', error);
    return {
      success: false,
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    };
  }
}
