'use server';

import { eq, inArray } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { siteSettingsSchema } from '@/models/Schema';

export type SiteSettings = {
  // İletişim
  contact_email?: string;
  support_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  business_hours_weekdays?: string;
  business_hours_weekend?: string;

  // Şirket
  company_name?: string;
  company_legal_name?: string;
  company_address?: string;
  company_tax_office?: string;
  company_tax_number?: string;

  // Sosyal Medya
  social_instagram?: string;
  social_twitter?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_youtube?: string;
  social_tiktok?: string;

  // Genel
  site_name?: string;
  site_description?: string;
  site_keywords?: string;
  copyright_text?: string;

  // AI
  ai_design_system_prompt?: string;
};

const AI_DESIGN_SYSTEM_PROMPT_KEY = 'ai_design_system_prompt';

/**
 * Tüm public site ayarlarını getir
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await db
      .select({
        key: siteSettingsSchema.key,
        value: siteSettingsSchema.value,
      })
      .from(siteSettingsSchema)
      .where(eq(siteSettingsSchema.isPublic, true));

    const result: SiteSettings = {};
    for (const setting of settings) {
      (result as Record<string, string | undefined>)[setting.key] = setting.value ?? undefined;
    }

    return result;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return {};
  }
}

/**
 * Belirli kategorideki ayarları getir
 */
export async function getSettingsByCategory(category: string): Promise<SiteSettings> {
  try {
    const settings = await db
      .select({
        key: siteSettingsSchema.key,
        value: siteSettingsSchema.value,
      })
      .from(siteSettingsSchema)
      .where(eq(siteSettingsSchema.category, category));

    const result: SiteSettings = {};
    for (const setting of settings) {
      (result as Record<string, string | undefined>)[setting.key] = setting.value ?? undefined;
    }

    return result;
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    return {};
  }
}

/**
 * Belirli anahtarların değerlerini getir
 */
export async function getSettingsByKeys(keys: string[]): Promise<SiteSettings> {
  try {
    const settings = await db
      .select({
        key: siteSettingsSchema.key,
        value: siteSettingsSchema.value,
      })
      .from(siteSettingsSchema)
      .where(inArray(siteSettingsSchema.key, keys));

    const result: SiteSettings = {};
    for (const setting of settings) {
      (result as Record<string, string | undefined>)[setting.key] = setting.value ?? undefined;
    }

    return result;
  } catch (error) {
    console.error('Error fetching settings by keys:', error);
    return {};
  }
}

/**
 * İletişim bilgilerini getir
 */
export async function getContactInfo() {
  return getSettingsByCategory('contact');
}

/**
 * Sosyal medya linklerini getir
 */
export async function getSocialLinks() {
  return getSettingsByCategory('social');
}

/**
 * Şirket bilgilerini getir
 */
export async function getCompanyInfo() {
  return getSettingsByCategory('company');
}

export async function getAiDesignSystemPromptSetting(): Promise<string | null> {
  try {
    const [setting] = await db
      .select({ value: siteSettingsSchema.value })
      .from(siteSettingsSchema)
      .where(eq(siteSettingsSchema.key, AI_DESIGN_SYSTEM_PROMPT_KEY))
      .limit(1);

    return setting?.value ?? null;
  } catch (error) {
    console.error('Error fetching AI design system prompt setting:', error);
    return null;
  }
}

export async function upsertAiDesignSystemPrompt(prompt: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      return {
        success: false,
        error: 'Prompt boş olamaz.',
      };
    }

    const [existing] = await db
      .select({ id: siteSettingsSchema.id })
      .from(siteSettingsSchema)
      .where(eq(siteSettingsSchema.key, AI_DESIGN_SYSTEM_PROMPT_KEY))
      .limit(1);

    if (existing) {
      await db
        .update(siteSettingsSchema)
        .set({
          value: cleanPrompt,
          category: 'ai',
          valueType: 'text',
          label: 'AI Design System Prompt',
          description: 'Sohbet + görsel üretim system prompt metni',
          isPublic: false,
        })
        .where(eq(siteSettingsSchema.id, existing.id));
    } else {
      await db.insert(siteSettingsSchema).values({
        key: AI_DESIGN_SYSTEM_PROMPT_KEY,
        value: cleanPrompt,
        category: 'ai',
        valueType: 'text',
        label: 'AI Design System Prompt',
        description: 'Sohbet + görsel üretim system prompt metni',
        isPublic: false,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error upserting AI design system prompt setting:', error);
    return {
      success: false,
      error: 'AI prompt ayarı güncellenemedi.',
    };
  }
}
