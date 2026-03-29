import { and, asc, eq } from 'drizzle-orm';
import OpenAI from 'openai';

import { db } from '@/libs/DB';
import { aiModelSchema } from '@/models/Schema';

let client: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  client = new OpenAI({ apiKey });
  return client;
};

// --- Hardcoded fallbacks (used when DB is unavailable or empty) ---
const FALLBACK_TEXT_MODEL = 'gemini-2.5-flash';
const FALLBACK_IMAGE_MODEL = 'gemini-2.5-flash-image';
const FALLBACK_PROVIDER = 'Google';

/**
 * Fetches ALL active models from the `ai_model` DB table for a given type,
 * sorted by sort_order ASC. Returns the hardcoded fallback if DB is empty/unreachable.
 */
const fetchAllModels = async (modelType: 'chat' | 'image'): Promise<AIModelSelection[]> => {
  const fallbackModel = modelType === 'chat' ? FALLBACK_TEXT_MODEL : FALLBACK_IMAGE_MODEL;
  const fallbackProvider = FALLBACK_PROVIDER;

  try {
    const results = await db
      .select({
        provider: aiModelSchema.provider,
        modelIdentifier: aiModelSchema.modelIdentifier,
        name: aiModelSchema.name,
        sortOrder: aiModelSchema.sortOrder,
      })
      .from(aiModelSchema)
      .where(
        and(
          eq(aiModelSchema.isActive, true),
          eq(aiModelSchema.type, modelType),
        ),
      )
      .orderBy(asc(aiModelSchema.sortOrder));

    if (results.length > 0) {
      console.log(`🤖 [AI Model] ${modelType} candidates: ${results.map((r: { modelIdentifier: string }) => r.modelIdentifier).join(', ')}`);
      return results.map((r: { provider: string | null; modelIdentifier: string }) => ({ provider: r.provider || fallbackProvider, modelIdentifier: r.modelIdentifier }));
    }

    console.warn(`⚠️ [AI Model] No active ${modelType} models in DB, using fallback: ${fallbackProvider}/${fallbackModel}`);
    return [{ provider: fallbackProvider, modelIdentifier: fallbackModel }];
  } catch (error) {
    console.error(`❌ [AI Model] Failed to fetch ${modelType} models from DB:`, error);
    return [{ provider: fallbackProvider, modelIdentifier: fallbackModel }];
  }
};

const fetchPreferredModel = async (modelType: 'chat' | 'image'): Promise<AIModelSelection> => {
  const all = await fetchAllModels(modelType);
  return all[0]!;
};

/**
 * Get the preferred chat/text model from the ai_model DB table.
 * Filters by type='chat', sorted by sort_order ASC.
 */
export type AIModelSelection = {
  provider: string;
  modelIdentifier: string;
};

export const getPreferredTextModel = async (): Promise<AIModelSelection> => {
  return fetchPreferredModel('chat');
};

/**
 * Get the preferred image model from the ai_model DB table.
 * Filters by type='image', sorted by sort_order ASC.
 */
export const getPreferredImageModel = async (): Promise<AIModelSelection> => {
  return fetchPreferredModel('image');
};

/**
 * Get ALL active text models sorted by sort_order ASC (for fallback chaining).
 */
export const getAllTextModels = async (): Promise<AIModelSelection[]> => {
  return fetchAllModels('chat');
};

/**
 * Get ALL active image models sorted by sort_order ASC (for fallback chaining).
 */
export const getAllImageModels = async (): Promise<AIModelSelection[]> => {
  return fetchAllModels('image');
};
