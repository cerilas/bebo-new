import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { aboutContentSchema } from '@/models/Schema';

const FILES_PREFIX = '/api/files/';

type AboutContentRecord = typeof aboutContentSchema.$inferSelect;

function normalizeAboutImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  let normalizedPath = imageUrl.trim();

  try {
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      const parsedUrl = new URL(normalizedPath);
      normalizedPath = parsedUrl.pathname;
    }
  } catch {
    return imageUrl;
  }

  if (!normalizedPath.startsWith(FILES_PREFIX)) {
    return imageUrl;
  }

  const relativePath = normalizedPath.slice(FILES_PREFIX.length);
  const segments = relativePath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return normalizedPath;
  }

  const hasScopePrefix = segments[0] === 'uploads' || segments[0] === 'ai';

  if (hasScopePrefix) {
    return normalizedPath;
  }

  return `${FILES_PREFIX}uploads/${relativePath}`;
}

function normalizeAboutContentImages<T extends {
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
}>(content: T | null): T | null {
  if (!content) {
    return null;
  }

  return {
    ...content,
    image1: normalizeAboutImageUrl(content.image1),
    image2: normalizeAboutImageUrl(content.image2),
    image3: normalizeAboutImageUrl(content.image3),
  };
}

// Get about content by language
export async function getAboutContent(language: string = 'tr') {
  console.log(`🔍 [About] Fetching content for language: "${language}"`);
  try {
    const result = await db
      .select()
      .from(aboutContentSchema)
      .where(eq(aboutContentSchema.language, language))
      .limit(1);

    console.log(`📊 [About] Query result count: ${result.length}`);
    if (result[0]) {
      console.log(`✅ [About] Found content with title1: "${result[0].title1}"`);
    } else {
      console.log(`⚠️ [About] No content found for language "${language}"`);
    }

    return normalizeAboutContentImages(result[0] || null);
  } catch (error) {
    console.error('❌ [About] Error fetching about content:', error);
    return null;
  }
}

// Get all active about content for all languages
export async function getAllAboutContent() {
  try {
    const results = await db
      .select()
      .from(aboutContentSchema);

    return results.map((content: AboutContentRecord) => normalizeAboutContentImages(content));
  } catch (error) {
    console.error('Error fetching all about content:', error);
    return [];
  }
}

// Create or update about content
export async function upsertAboutContent(data: {
  language: string;
  image1?: string;
  title1: string;
  body1: string;
  image2?: string;
  title2: string;
  body2: string;
  image3?: string;
  title3: string;
  body3: string;
  mission: string;
  vision: string;
}) {
  try {
    // Try to update first
    const updateResult = await db
      .update(aboutContentSchema)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(aboutContentSchema.language, data.language))
      .returning();

    if (updateResult.length > 0) {
      return updateResult[0];
    }

    // If no rows were updated, create new
    const insertResult = await db
      .insert(aboutContentSchema)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return insertResult[0];
  } catch (error) {
    console.error('Error upserting about content:', error);
    throw error;
  }
}
