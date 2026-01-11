'use server';

import { createHmac } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { Env } from '@/libs/Env';
import { SmsService } from '@/libs/SmsService';
import { orderSchema, userSchema } from '@/models/Schema';

type PayTRCreditCallbackPayload = {
  merchant_oid: string;
  status: string;
  total_amount: string;
  hash: string;
  payment_type?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
};

/**
 * PayTR kredi ödeme callback'ini doğrular ve kredileri yükler
 */
export async function validatePayTRCreditCallback(
  payload: PayTRCreditCallbackPayload,
): Promise<{ success: boolean; error?: string; creditsAdded?: number }> {
  try {
    const { merchant_oid, status, total_amount, hash } = payload;

    // Kredi ödeme kontrolü - merchant_oid CRD ile başlıyor
    if (!merchant_oid.startsWith('CRD')) {
      return { success: false, error: 'Not a credit payment' };
    }

    // PayTR Hash doğrulaması
    const merchantKey = Env.PAYTR_MERCHANT_KEY;
    const merchantSalt = Env.PAYTR_MERCHANT_SALT;

    const expectedHash = createHmac('sha256', merchantKey)
      .update(`${merchant_oid}${merchantSalt}${status}${total_amount}`)
      .digest('base64');

    if (hash !== expectedHash) {
      console.error('❌ PayTR Credit Hash Mismatch', {
        merchant_oid,
        status,
        total_amount,
        receivedHash: hash,
        computedHash: expectedHash,
        hashString: `${merchant_oid}***SALT***${status}${total_amount}`,
      });
      return { success: false, error: 'Invalid hash signature' };
    }

    // Ödeme başarılıysa kredileri yükle
    // PayTR'da status: '1' = Başarılı, '0' = Başarısız
    if (status === '1' || status === 'success') { // PayTR'de 1 = başarılı
      // merchant_oid ile order'ı bul ve user ID'yi al (güvenli yöntem)
      const orderRecord = await db
        .select({
          userId: orderSchema.userId,
          paymentStatus: orderSchema.paymentStatus,
          paymentAmount: orderSchema.paymentAmount,
        })
        .from(orderSchema)
        .where(eq(orderSchema.merchantOid, merchant_oid))
        .limit(1);

      if (orderRecord.length === 0) {
        return { success: false, error: 'Order not found for merchant_oid' };
      }

      const order = orderRecord[0]!;
      const { userId } = order;

      // Sipariş zaten işlendiyse tekrar işleme
      if (order.paymentStatus === 'success') {
        return { success: true, error: 'Order already processed' };
      }

      // Kredi miktarını hesapla (paymentAmount kuruş cinsinden, 150 kuruş = 1 kredi)
      const creditAmount = Math.floor(order.paymentAmount / 150);

      // Kullanıcının kredilerini güncelle
      const userRecord = await db
        .select()
        .from(userSchema)
        .where(eq(userSchema.id, userId))
        .limit(1);

      if (userRecord.length === 0) {
        // Kullanıcı kaydı yoksa oluştur
        await db.insert(userSchema).values({
          id: userId,
          artCredits: creditAmount,
        });
      } else {
        // Mevcut kredilere ekle
        const currentCredits = userRecord[0]!.artCredits;
        await db
          .update(userSchema)
          .set({
            artCredits: currentCredits + creditAmount,
            updatedAt: new Date(),
          })
          .where(eq(userSchema.id, userId));
      }

      // Order'ı başarılı olarak güncelle
      await db
        .update(orderSchema)
        .set({
          paymentStatus: 'success',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orderSchema.merchantOid, merchant_oid));

      // Müşteriye SMS gönder
      try {
        // Kullanıcı bilgisini çek (Order'daki telefon dummy olabilir)
        const userDetails = await db
          .select({
            firstName: userSchema.firstName,
            lastName: userSchema.lastName,
            phone: userSchema.phone,
          })
          .from(userSchema)
          .where(eq(userSchema.id, userId))
          .limit(1);

        if (userDetails.length > 0 && userDetails[0]?.phone) {
          const user = userDetails[0];
          const customerName = user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Kullanıcı';
          const smsMessage = `Sayin ${customerName}, hesabiniza ${creditAmount} adet tasarim hakki yuklenmistir. Iyi eglenceler. Birebiro`;

          await SmsService.sendSms(user.phone, smsMessage);
        }
      } catch (smsError) {
        console.error('Failed to send SMS for credit purchase:', smsError);
      }

      return {
        success: true,
        creditsAdded: creditAmount,
      };
    }

    // Ödeme başarısız - order'ı failed olarak güncelle
    await db
      .update(orderSchema)
      .set({
        paymentStatus: 'failed',
        failedReasonCode: payload.failed_reason_code || null,
        failedReasonMsg: payload.failed_reason_msg || null,
        updatedAt: new Date(),
      })
      .where(eq(orderSchema.merchantOid, merchant_oid));

    return {
      success: true, // Callback olarak başarılı (PayTR'a OK döndür)
      error: `Payment failed: ${payload.failed_reason_msg || 'Unknown error'}`,
    };
  } catch (error) {
    console.error('Credit callback validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
