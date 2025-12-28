'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/libs/DB';
import { orderSchema, userSchema } from '@/models/Schema';

// Geçici kredi işlemi kayıt sistemi - merchant_oid bazlı güvenlik
const processedTransactions = new Set<string>();

/**
 * PayTR'den gelen merchant_oid ile güvenli kredi yükleme
 * Order tablosundan gerçek kredi miktarını alır ve yükler
 */
export async function processSuccessfulCreditPurchase(
  merchantOid: string,
): Promise<{
    success: boolean;
    message: string;
    creditsAdded?: number;
  }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        message: 'Kullanıcı girişi bulunamadı',
      };
    }

    // Güvenlik kontrolü: merchant_oid daha önce işlendiyse reddet
    if (processedTransactions.has(merchantOid)) {
      return {
        success: false,
        message: 'Bu kredi satın alma işlemi daha önce tamamlanmış',
      };
    }

    // Merchant_oid format kontrolü (PayTR formatı: CRD ile başlamalı)
    if (!merchantOid || !merchantOid.startsWith('CRD')) {
      return {
        success: false,
        message: 'Geçersiz işlem numarası',
      };
    }

    // Order'ı bul ve gerçek kredi miktarını al
    const orderRecord = await db
      .select({
        userId: orderSchema.userId,
        paymentAmount: orderSchema.paymentAmount,
        paymentStatus: orderSchema.paymentStatus,
        creditAmount: orderSchema.creditAmount, // Fetch stored credit amount
      })
      .from(orderSchema)
      .where(eq(orderSchema.merchantOid, merchantOid))
      .limit(1);

    if (orderRecord.length === 0) {
      return {
        success: false,
        message: 'Sipariş bulunamadı',
      };
    }

    const order = orderRecord[0]!;

    // Kullanıcı ID'si kontrol et
    if (order.userId !== userId) {
      return {
        success: false,
        message: 'Bu sipariş size ait değil',
      };
    }

    // Use stored credit amount or fallback to calculation (though stored is preferred)
    const creditAmount = order.creditAmount || Math.floor(order.paymentAmount / 150);

    // Sipariş zaten başarılıysa, sadece başarı mesajı dön (Race condition handling)
    if (order.paymentStatus === 'success') {
      return {
        success: true,
        message: 'Ödemeniz başarıyla alındı',
        creditsAdded: creditAmount,
      };
    }

    // ... continue with processing only if NOT success ...

    // Kullanıcının mevcut kredilerini getir
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
        orderType: 'credit', // Ensure type is set
        creditAmount, // Ensure amount is set if it wasn't
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orderSchema.merchantOid, merchantOid));

    // İşlemi tamamlandı olarak kaydet
    processedTransactions.add(merchantOid);

    // Cache'i temizle
    revalidatePath('/design');
    revalidatePath('/purchase-credits');

    return {
      success: true,
      message: `${creditAmount} Tasarım hakkı başarıyla hesabınıza eklendi`,
      creditsAdded: creditAmount,
    };
  } catch (error) {
    console.error('Credit processing error:', error);
    return {
      success: false,
      message: 'Kredi yükleme sırasında bir hata oluştu',
    };
  }
}
