'use server';

import { createHmac } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { SmsService } from '@/libs/SmsService';
import { generatedImageSchema, orderSchema, userSchema } from '@/models/Schema';
import { getBaseUrl } from '@/utils/Helpers';

export type PayTRTokenRequest = {
  generationId: string;
  imageUrl: string; // Görselin URL'i
  productId: number;
  productSizeId: number;
  productFrameId: number;
  paymentAmount: number; // Kuruş cinsinden (örn: 3456 = 34.56 TL)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string; // İl
  cityCode?: string; // Geliver İl Kodu
  customerDistrict?: string; // İlçe
  districtId?: number; // Geliver İlçe ID
  isCorporateInvoice?: boolean; // Kurumsal fatura flag
  companyName?: string; // Ünvan
  taxNumber?: string; // Vergi kimlik no
  taxOffice?: string; // Vergi dairesi
  companyAddress?: string; // Şirket adresi
  orientation?: 'landscape' | 'portrait'; // Yatay veya dikey baskı yönü
  userBasket: string; // Base64 encoded JSON
  userIp: string;
};

export type PayTRTokenResponse = {
  success: boolean;
  token?: string;
  merchantOid?: string;
  error?: string;
};

/**
 * PayTR iframe token alır ve sipariş oluşturur
 */
export async function getPayTRToken(
  request: PayTRTokenRequest,
): Promise<PayTRTokenResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Benzersiz sipariş numarası oluştur
    const merchantOid = `BRB${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // PayTR API bilgileri
    const merchantId = Env.PAYTR_MERCHANT_ID;
    const merchantKey = Env.PAYTR_MERCHANT_KEY;
    const merchantSalt = Env.PAYTR_MERCHANT_SALT;

    // App URL'ler - Production'da Railway'den gelecek
    const appUrl = getBaseUrl();

    console.log('App URL for PayTR:', appUrl);

    const merchantOkUrl = `${appUrl}/checkout/success?merchant_oid=${merchantOid}`;
    const merchantFailUrl = `${appUrl}/checkout/failed?merchant_oid=${merchantOid}`;

    const noInstallment = 0;
    const maxInstallment = 0;
    const currency = 'TL';
    const testMode = 0;

    // Hash oluştur - PayTR dokümanına göre
    // merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode
    const hashStr = `${merchantId}${request.userIp}${merchantOid}${request.customerEmail}${request.paymentAmount}${request.userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
    const paytrToken = createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    console.log('PayTR Token Debug:', {
      merchantId,
      merchantOid,
      paymentAmount: request.paymentAmount,
      hashStr: `${hashStr.substring(0, 50)}...`, // İlk 50 karakter
    });

    // PayTR API'ye gönderilecek veriler
    const postData = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: request.userIp,
      merchant_oid: merchantOid,
      email: request.customerEmail,
      payment_amount: request.paymentAmount.toString(),
      paytr_token: paytrToken,
      user_basket: request.userBasket,
      debug_on: '1',
      no_installment: noInstallment.toString(),
      max_installment: maxInstallment.toString(),
      user_name: request.customerName,
      user_address: request.customerAddress,
      user_phone: request.customerPhone,
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: '30',
      currency,
      test_mode: testMode.toString(),
      lang: 'tr',
      // iframe içinde redirect etmesi için
      iframe_redirect: '1',
    });

    // 1. Önce Siparişi 'pending' olarak oluştur
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
      paytrToken: null, // Token henüz yok
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerPhone: request.customerPhone,
      customerAddress: request.customerAddress,
      customerCity: request.customerCity,
      cityCode: request.cityCode,
      customerDistrict: request.customerDistrict,
      districtId: request.districtId,
      isCorporateInvoice: request.isCorporateInvoice || false,
      companyName: request.companyName,
      taxNumber: request.taxNumber,
      taxOffice: request.taxOffice,
      companyAddress: request.companyAddress,
      orientation: request.orientation || 'landscape',
    });

    // PayTR'a token isteği gönder
    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData.toString(),
    });

    const result = await response.json();

    console.log('PayTR Response:', result);

    if (result.status === 'success' && result.token) {
      // 2. Token alındı, siparişi güncelle
      await db
        .update(orderSchema)
        .set({
          paytrToken: result.token,
        })
        .where(eq(orderSchema.merchantOid, merchantOid));

      return {
        success: true,
        token: result.token,
        merchantOid,
      };
    }

    // Başarısız olursa siparişi güncelle (Opsiyonel: Failed olarak işaretle)
    await db
      .update(orderSchema)
      .set({
        paymentStatus: 'failed',
        failedReasonMsg: result.reason || 'Token alınamadı',
      })
      .where(eq(orderSchema.merchantOid, merchantOid));

    return {
      success: false,
      error: result.reason || 'Token alınamadı',
    };
  } catch (error) {
    console.error('PayTR token error:', error);
    return {
      success: false,
      error: 'Ödeme işlemi başlatılamadı',
    };
  }
}

/**
 * PayTR callback doğrulama ve sipariş güncelleme
 */
export async function validatePayTRCallback(payload: {
  merchant_oid: string;
  status: string;
  total_amount: string;
  hash: string;
  payment_type?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const merchantKey = Env.PAYTR_MERCHANT_KEY;
    const merchantSalt = Env.PAYTR_MERCHANT_SALT;

    // Hash doğrula
    const hashStr = `${payload.merchant_oid}${merchantSalt}${payload.status}${payload.total_amount}`;
    const computedHash = createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    if (computedHash !== payload.hash) {
      console.error('PayTR hash mismatch');
      return { success: false, error: 'Invalid hash' };
    }

    // Siparişi bul
    const order = await db
      .select()
      .from(orderSchema)
      .where(eq(orderSchema.merchantOid, payload.merchant_oid))
      .limit(1);

    if (!order || order.length === 0) {
      return { success: false, error: 'Order not found' };
    }

    const existingOrder = order[0]!;

    console.log('PayTR Callback - Order Details:', {
      merchantOid: payload.merchant_oid,
      orderType: existingOrder.orderType,
      creditAmount: existingOrder.creditAmount,
      userId: existingOrder.userId,
      status: payload.status,
    });

    // Sipariş zaten onaylandıysa veya iptal edildiyse tekrar işlem yapma
    if (
      existingOrder.paymentStatus === 'success'
      || existingOrder.paymentStatus === 'failed'
    ) {
      return { success: true }; // Tekrar bildirim gelmiş, OK dön
    }

    // Siparişi güncelle
    // PayTR'da status: '1' = Başarılı, '0' = Başarısız. Bazen 'success' dönebilir.
    if (payload.status === '1' || payload.status === 'success') {
      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'success',
          totalAmount: Number.parseInt(payload.total_amount, 10),
          paymentType: payload.payment_type,
          paidAt: new Date(),
          shippingStatus: existingOrder.orderType === 'credit' ? null : 'preparing',
        })
        .where(eq(orderSchema.merchantOid, payload.merchant_oid));

      // Eğer kredi satın alımıysa, kullanıcının kredi bakiyesini artır
      if (existingOrder.orderType === 'credit' && existingOrder.creditAmount) {
        // Önce mevcut krediyi al
        const [currentUser] = await db
          .select({ artCredits: userSchema.artCredits })
          .from(userSchema)
          .where(eq(userSchema.id, existingOrder.userId))
          .limit(1);

        if (!currentUser) {
          console.error(`❌ User not found: ${existingOrder.userId}`);
          throw new Error('User not found');
        }

        // Yeni kredi miktarını hesapla
        const newCreditAmount = currentUser.artCredits + existingOrder.creditAmount;

        console.log(`💰 Adding ${existingOrder.creditAmount} credits to user ${existingOrder.userId}`);

        console.log(`� Current: ${currentUser.artCredits} → New: ${newCreditAmount}`);

        // Kredileri güncelle - SQL expression yerine direkt değer kullan
        await db
          .update(userSchema)
          .set({
            artCredits: newCreditAmount,
          })
          .where(eq(userSchema.id, existingOrder.userId));

        console.log(`✅ Successfully updated credits for user ${existingOrder.userId}`);
      } else {
        console.log('⚠️ NOT A CREDIT ORDER or creditAmount is null:', {
          orderType: existingOrder.orderType,
          creditAmount: existingOrder.creditAmount,
        });

        // Ürün siparişiyse, görselin is_selected alanını true yap
        if (existingOrder.generationId) {
          await db
            .update(generatedImageSchema)
            .set({ isSelected: true })
            .where(eq(generatedImageSchema.generationId, existingOrder.generationId));

          console.log(`✅ Marked image as selected: ${existingOrder.generationId}`);
        }
      }

      // Send SMS notification
      try {
        const smsMessage = `Sayin ${existingOrder.customerName}, siparisiniz alinmistir. Siparis numaraniz: ${existingOrder.merchantOid}. Tesekkur ederiz. Birebiro`;
        await SmsService.sendSms(existingOrder.customerPhone, smsMessage);
      } catch (smsError) {
        console.error('Failed to send SMS for order:', smsError);
      }

      // TODO: Admin'e bildirim gönder
    } else {
      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'failed',
          failedReasonCode: payload.failed_reason_code,
          failedReasonMsg: payload.failed_reason_msg,
        })
        .where(eq(orderSchema.merchantOid, payload.merchant_oid));
    }

    return { success: true };
  } catch (error) {
    console.error('PayTR callback validation error:', error);
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Sipariş durumunu getir
 */
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

    // Kullanıcı kendi siparişini görüntülüyor mu kontrol et
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
