'use server';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/libs/DB';
import { newsletterSubscribersSchema } from '@/models/Schema';

// Unsubscribe token oluşturmak için utility
function generateUnsubscribeToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function subscribeToNewsletter(email: string) {
  try {
    // IP adresini al
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for')
      || headersList.get('x-real-ip')
      || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // E-posta formatını kontrol et
    const emailRegex = /^[\w.%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/u;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Geçersiz e-posta adresi' };
    }

    // Veritabanına kaydet
    await db.insert(newsletterSubscribersSchema).values({
      email: email.toLowerCase().trim(),
      subscriptionSource: 'website',
      ipAddress,
      userAgent,
      unsubscribeToken: generateUnsubscribeToken(),
    });

    return { success: true };
  } catch (error) {
    console.error('Newsletter subscription error:', error);

    // Unique constraint hatası (zaten abone)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return { success: false, error: 'Bu e-posta adresi zaten kayıtlı' };
    }

    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function unsubscribeFromNewsletter(email: string) {
  try {
    await db
      .update(newsletterSubscribersSchema)
      .set({
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscribersSchema.email, email.toLowerCase().trim()));

    return { success: true };
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function unsubscribeByToken(token: string) {
  try {
    const result = await db
      .update(newsletterSubscribersSchema)
      .set({
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscribersSchema.unsubscribeToken, token))
      .returning({ email: newsletterSubscribersSchema.email });

    if (result.length === 0) {
      return { success: false, error: 'Geçersiz unsubscribe linki' };
    }

    return { success: true, email: result[0]?.email };
  } catch (error) {
    console.error('Newsletter unsubscribe by token error:', error);
    return { success: false, error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
};
