'use server';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/libs/DB';
import { contactSubmissionsSchema } from '@/models/Schema';

export type ContactFormData = {
  fullName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

export async function submitContactForm(formData: FormData) {
  try {
    // Extract form data
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    // Validate required fields
    if (!fullName || !email || !message) {
      return {
        success: false,
        error: 'Lütfen gerekli alanları doldurun.',
      };
    }

    // Get user's IP and User Agent for security
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : '0.0.0.0';

    // Insert into database
    await db
      .insert(contactSubmissionsSchema)
      .values({
        fullName,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        ipAddress,
        userAgent,
        isRead: false,
        isReplied: false,
      });

    // Success - form submitted
    return {
      success: true,
    };
  } catch (error) {
    console.error('❌ Error submitting contact form:', error);

    return {
      success: false,
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    };
  }
}

// Get all contact submissions (for admin panel)
export async function getAllContactSubmissions() {
  try {
    const results = await db
      .select()
      .from(contactSubmissionsSchema)
      .orderBy(contactSubmissionsSchema.createdAt);

    return results;
  } catch (error) {
    console.error('❌ Error fetching contact submissions:', error);
    return [];
  }
}

// Mark contact submission as read
export async function markAsRead(id: number) {
  try {
    await db
      .update(contactSubmissionsSchema)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(contactSubmissionsSchema.id, id));

    return { success: true };
  } catch (error) {
    console.error('❌ Error marking as read:', error);
    return { success: false, error: 'Okundu olarak işaretlenemedi.' };
  }
}

// Mark contact submission as replied
export async function markAsReplied(id: number) {
  try {
    await db
      .update(contactSubmissionsSchema)
      .set({
        isReplied: true,
        updatedAt: new Date(),
      })
      .where(eq(contactSubmissionsSchema.id, id));

    return { success: true };
  } catch (error) {
    console.error('❌ Error marking as replied:', error);
    return { success: false, error: 'Yanıtlandı olarak işaretlenemedi.' };
  }
}
