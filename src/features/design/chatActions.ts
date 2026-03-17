'use server';

import { Buffer } from 'node:buffer';

import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';

import { getProductIdsFromSlugs } from '@/features/products/productActions';
import { db } from '@/libs/DB';
import { generatedImageSchema, siteSettingsSchema } from '@/models/Schema';
import { getBaseUrl } from '@/utils/Helpers';

import { savePublicImageBuffer, toBase64DataUrl } from './assetStorage';
import { getOpenAIClient, getOpenAIImageModel, getOpenAITextModel } from './openaiClient';

export type ChatRequest = {
  userId: string;
  chatSessionId: string;
  creditUsed: number;
  imagePrompt: boolean;
  imagePromptUrl: string;
  textPrompt: string;
  aiModel: string;
  resolution: string;
  quality: string;
  style: string;
  orientation: string;
  productSlug: string;
  sizeSlug: string;
  frameSlug: string;
  productId: number | null;
  sizeId: number | null;
  frameId: number | null;
};

export type ChatResponse = {
  reply_to_user: string;
  image_generation: boolean;
  generation_id: string;
};

type NativeAssistantDecision = {
  reply_to_user: string;
  user_generation_intent: boolean;
  improved_generation_prompt?: string;
};

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

const DEFAULT_AI_DESIGN_SYSTEM_PROMPT = `You are the AI visual design assistant of birebiro.com.

Your personality:
You speak like a friendly and expert interior designer & art consultant.
You talk only about art, interior design, decoration, colors, styles, compositions, creativity, and visual storytelling.
You NEVER talk about unrelated topics.

Default conversation language is Turkish, unless the user writes in another language.

You are given runtime values in plain text format:

User Prompt: ...
User image generation intent: true/false

If the user has attached an image, it will be provided directly as a vision input — you CAN see it and should analyze its colors, style, composition, and subject to enrich your response and generation prompt.

"User image generation intent" indicates whether the user clicked the image generation button on the interface.

Your ONLY job is to return ONE JSON object in the following exact format, with no extra text:

{
  "reply_to_user": "",
  "user_generation_intent": true,
  "improved_generation_prompt": ""
}

Rules for fields:

1) reply_to_user
- Always talk like an interior designer / art consultant.
- Always in Turkish, unless the user clearly uses another language.
- When image generation intent is true, reply with a short enthusiastic confirmation that generation is starting.
- When image generation intent is false, stay in inspiration mode: give decoration, color, style, composition suggestions and continue friendly conversation.
- IMPORTANT: If user is just greeting / small talk (e.g. "nasılsın"), respond naturally and warmly in design-assistant tone. Do NOT mention generation mode unless user explicitly asks to generate an image.

2) user_generation_intent
- If incoming intent is true, you MUST set true.
- If incoming intent is false, keep false.
- If user asks for image while false, tell them they must activate generate button and keep false.

3) improved_generation_prompt
- This is a polished, detailed ENGLISH image prompt.
- If user_generation_intent is true, this field MUST be non-empty.
- If user_generation_intent is false, this field MUST be empty string.
- Use User Prompt as base.
- If an image was provided (vision input), analyze its colors, style, mood, subject, and composition, then incorporate those visual details into the prompt.
- If prompt is vague, still produce meaningful creative prompt when generation is intended.

Additional strict rules:
- Return ONLY JSON object with exactly these 3 fields.
- No markdown, no backticks, no extra keys.
- Stay on art/interior/design scope only.
- Use recent conversation history and previous generation context to resolve follow-up edits (e.g. “yazının rengini kırmızı yap”).
- Keep response compact (single-line JSON preferred).`;

const GENERATION_MODE_REQUIRED_MESSAGE = 'Görsel oluşturma modunda değilsiniz. Sağ üstteki “Görsel Oluştur” butonuna tıklamalısınız. Şu anda ilham modundayım.';
/**
 * Maps physical frame dimensions (e.g. "30x40") + orientation to the closest
 * OpenAI gpt-image-1 supported size string.
 *
 * Supported sizes: 1024x1024 | 1536x1024 | 1024x1536
 *
 * Returns both the API size string and a human-readable ratio label for prompt injection.
 */
const resolveGenerationSize = (
  dimensions: string | null,
  orientation: 'landscape' | 'portrait' | undefined,
): {
  apiSize: '1024x1024' | '1536x1024' | '1024x1536';
  ratioLabel: string; // e.g. "4:3" or "3:4"
  physicalLabel: string; // e.g. "40x30cm landscape" or "30x40cm portrait"
} => {
  // Fallback: 4:3 landscape OR 3:4 portrait — never expose parse failure to user
  const fallback = orientation === 'portrait'
    ? { apiSize: '1024x1536' as const, ratioLabel: '3:4', physicalLabel: 'portrait frame' }
    : { apiSize: '1536x1024' as const, ratioLabel: '4:3', physicalLabel: 'landscape frame' };

  if (!dimensions) {
    return fallback;
  }

  // Parse "30x40" → [30, 40]. Accept formats: "30x40", "30X40", "30 x 40", "30cm x 40cm"
  const cleaned = dimensions.toLowerCase().replace(/cm/g, '').replace(/\s/g, '');
  const parts = cleaned.split('x').map(Number);
  if (parts.length !== 2 || parts.some(n => !Number.isFinite(n) || n <= 0)) {
    return fallback;
  }

  const [a, b] = parts as [number, number];
  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);

  // Apply orientation: portrait → smaller wide side, larger tall side
  const frameW = orientation === 'landscape' ? larger : smaller;
  const frameH = orientation === 'landscape' ? smaller : larger;

  const ratio = frameW / frameH;

  let apiSize: '1024x1024' | '1536x1024' | '1024x1536';
  if (ratio > 1.05) {
    apiSize = '1536x1024'; // landscape
  } else if (ratio < 0.95) {
    apiSize = '1024x1536'; // portrait
  } else {
    apiSize = '1024x1024'; // square
  }

  // Reduce to simplest ratio string (e.g. 30:40 → 3:4)
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const divisor = gcd(frameW, frameH);
  const ratioLabel = `${frameW / divisor}:${frameH / divisor}`;
  const orientLabel = orientation ?? (ratio > 1.05 ? 'landscape' : ratio < 0.95 ? 'portrait' : 'square');
  const physicalLabel = `${frameW}x${frameH}cm ${orientLabel}`;

  return { apiSize, ratioLabel, physicalLabel };
};
const looksLikeImageGenerationRequest = (text: string): boolean => {
  const normalized = text.toLocaleLowerCase('tr-TR');
  const generationKeywords = [
    'görsel',
    'gorsel',
    'resim',
    'image',
    'oluştur',
    'olustur',
    'üret',
    'uret',
    'çiz',
    'ciz',
    'generate',
    'create',
  ];
  return generationKeywords.some(keyword => normalized.includes(keyword));
};

const getAiDesignSystemPrompt = async (): Promise<string> => {
  try {
    const [setting] = await db
      .select({ value: siteSettingsSchema.value })
      .from(siteSettingsSchema)
      .where(eq(siteSettingsSchema.key, 'ai_design_system_prompt'))
      .limit(1);

    const value = setting?.value?.trim();
    if (value && value.length > 0) {
      return value;
    }

    await db
      .insert(siteSettingsSchema)
      .values({
        key: 'ai_design_system_prompt',
        value: DEFAULT_AI_DESIGN_SYSTEM_PROMPT,
        category: 'ai',
        valueType: 'text',
        label: 'AI Design System Prompt',
        description: 'Sohbet + görsel üretim system prompt metni',
        isPublic: false,
      })
      .onConflictDoNothing({ target: siteSettingsSchema.key });

    return DEFAULT_AI_DESIGN_SYSTEM_PROMPT;
  } catch (error) {
    console.error('Failed to load AI design system prompt from DB:', error);
    return DEFAULT_AI_DESIGN_SYSTEM_PROMPT;
  }
};

const stripCodeFence = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
};

const parseDecision = (value: string): NativeAssistantDecision => {
  const normalized = stripCodeFence(value);
  const parsed = JSON.parse(normalized) as Partial<NativeAssistantDecision>;

  const reply = typeof parsed.reply_to_user === 'string'
    ? parsed.reply_to_user
    : 'Talebini aldım.';

  return {
    reply_to_user: reply,
    user_generation_intent: Boolean(parsed.user_generation_intent),
    improved_generation_prompt: typeof parsed.improved_generation_prompt === 'string' ? parsed.improved_generation_prompt : undefined,
  };
};

const buildGenerationId = (): string => {
  return `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

const toGeneratedImageResponse = (row: {
  id: number;
  userId: string;
  chatSessionId: string;
  generationId: string;
  productId: number | null;
  productSizeId: number | null;
  productFrameId: number | null;
  textPrompt: string;
  improvedPrompt: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  uploadedImageUrl: string | null;
  userGenerationIntent: string | null;
  isGenerateMode: boolean;
  creditUsed: number;
  isSelected: boolean;
  updatedAt: Date;
  createdAt: Date;
}): GeneratedImageResponse => {
  return {
    id: row.id,
    user_id: row.userId,
    chat_session_id: row.chatSessionId,
    generation_id: row.generationId,
    product_id: row.productId ?? 0,
    product_size_id: row.productSizeId ?? 0,
    product_frame_id: row.productFrameId ?? 0,
    text_prompt: row.textPrompt,
    improved_prompt: row.improvedPrompt ?? '',
    image_url: row.imageUrl,
    thumbnail_url: row.thumbnailUrl ?? undefined,
    uploaded_image_url: row.uploadedImageUrl ?? '',
    user_generation_intent: row.userGenerationIntent ?? '',
    is_generate_mode: row.isGenerateMode,
    credit_used: row.creditUsed,
    is_selected: row.isSelected,
    updated_at: row.updatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  };
};

const downloadBuffer = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export async function sendChatMessage(params: {
  textPrompt: string;
  imagePromptUrl?: string;
  isGenerateMode: boolean;
  chatSessionId: string;
  chatHistory?: ChatHistoryItem[];
  productSlug?: string;
  sizeSlug?: string;
  frameSlug?: string;
  orientationSlug?: 'landscape' | 'portrait';
}) {
  try {
    // Get authenticated user
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: 'Kullanıcı oturumu bulunamadı. Lütfen giriş yapın.',
      };
    }

    // Get product, size, and frame IDs from slugs (+ physical dimensions for aspect ratio)
    const { productId, sizeId, frameId, sizeDimensions } = await getProductIdsFromSlugs({
      productSlug: params.productSlug,
      sizeSlug: params.sizeSlug,
      frameSlug: params.frameSlug,
    });

    // Prepare request body
    const requestBody: ChatRequest = {
      userId: user.id,
      chatSessionId: params.chatSessionId,
      creditUsed: 1, // Her görsel üretimi 1 kredi
      imagePrompt: !!params.imagePromptUrl,
      imagePromptUrl: params.imagePromptUrl || '',
      textPrompt: params.textPrompt,
      aiModel: 'gpt1',
      resolution: '1024x1024',
      quality: 'low',
      style: '',
      orientation: params.orientationSlug || 'landscape',
      productSlug: params.productSlug || '',
      sizeSlug: params.sizeSlug || '',
      frameSlug: params.frameSlug || '',
      productId,
      sizeId,
      frameId,
    };

    const openai = getOpenAIClient();
    const systemPrompt = await getAiDesignSystemPrompt();

    const [latestGeneration] = await db
      .select({
        improvedPrompt: generatedImageSchema.improvedPrompt,
        textPrompt: generatedImageSchema.textPrompt,
        imageUrl: generatedImageSchema.imageUrl,
        uploadedImageUrl: generatedImageSchema.uploadedImageUrl,
      })
      .from(generatedImageSchema)
      .where(
        and(
          eq(generatedImageSchema.userId, user.id),
          eq(generatedImageSchema.chatSessionId, requestBody.chatSessionId),
        ),
      )
      .orderBy(desc(generatedImageSchema.createdAt))
      .limit(1);

    const baseUrl = getBaseUrl();
    // Convert local file to base64 so OpenAI can read it regardless of environment
    const imageBase64 = requestBody.imagePromptUrl
      ? await toBase64DataUrl(requestBody.imagePromptUrl)
      : null;
    // Fallback: if not a local file, use the absolute URL
    const fullImageUrl = imageBase64
      ?? (requestBody.imagePromptUrl
        ? (requestBody.imagePromptUrl.startsWith('http')
            ? requestBody.imagePromptUrl
            : `${baseUrl}${requestBody.imagePromptUrl}`)
        : null);

    const historyText = (params.chatHistory ?? [])
      .slice(-10)
      .map(item => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
      .join('\n');

    const previousGenerationContext = latestGeneration
      ? `Last generated user prompt: ${latestGeneration.textPrompt}
Last generated improved prompt: ${latestGeneration.improvedPrompt || ''}
Last generated image URL: ${latestGeneration.imageUrl}
Last uploaded reference image URL: ${latestGeneration.uploadedImageUrl || ''}`
      : 'No previous generation context.';

    const textContent = `User Prompt: ${requestBody.textPrompt}
User image generation intent: ${params.isGenerateMode}
Product slug: ${requestBody.productSlug}
Size slug: ${requestBody.sizeSlug}
Frame slug: ${requestBody.frameSlug}
Frame orientation: ${params.orientationSlug || 'landscape'}
Frame physical dimensions: ${sizeDimensions || 'unknown'}cm

Recent chat history:
${historyText || 'No chat history.'}

Previous generation context:
${previousGenerationContext}`;

    const userMessageContent = fullImageUrl
      ? [
          { type: 'text' as const, text: textContent },
          { type: 'image_url' as const, image_url: { url: fullImageUrl, detail: 'low' as const } },
        ]
      : textContent;

    const completion = await openai.chat.completions.create({
      model: getOpenAITextModel(),
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessageContent,
        },
      ],
    });

    const rawDecision = completion.choices[0]?.message?.content;
    if (!rawDecision) {
      throw new Error('OpenAI chat response is empty');
    }

    const decision = parseDecision(rawDecision);
    const isGenerationModeActive = params.isGenerateMode;
    const userAskedForImageGeneration = looksLikeImageGenerationRequest(requestBody.textPrompt);
    const canGenerateImage = isGenerationModeActive && decision.user_generation_intent;

    const replyToUser = !isGenerationModeActive && userAskedForImageGeneration
      ? GENERATION_MODE_REQUIRED_MESSAGE
      : decision.reply_to_user;

    let data: ChatResponse = {
      reply_to_user: replyToUser,
      image_generation: false,
      generation_id: '',
    };

    if (canGenerateImage) {
      const generationId = buildGenerationId();
      const refinedPrompt = decision.improved_generation_prompt?.trim() || requestBody.textPrompt;

      // Resolve the correct aspect ratio from the selected frame size + orientation
      const { apiSize, ratioLabel, physicalLabel } = resolveGenerationSize(
        sizeDimensions,
        params.orientationSlug,
      );

      // Prepend frame ratio constraint so the model composes correctly for the print dimensions
      const ratioConstraint = `IMPORTANT: This artwork will be printed on a ${physicalLabel} frame. Compose the image to fill a strict ${ratioLabel} aspect ratio. Do NOT add letterboxing, borders, or padding. Fill every pixel.`;
      const promptWithRatio = `${ratioConstraint}\n\n${refinedPrompt}`;
      const promptWithReference = requestBody.imagePromptUrl
        ? `${promptWithRatio}\n\nReference image URL (composition/style reference): ${requestBody.imagePromptUrl}`
        : promptWithRatio;

      const imageResult = await openai.images.generate({
        model: getOpenAIImageModel(),
        prompt: promptWithReference,
        size: apiSize,
        quality: 'low',
      });

      const first = imageResult.data?.[0];
      let imageBuffer: Buffer | null = null;

      if (first?.b64_json) {
        imageBuffer = Buffer.from(first.b64_json, 'base64');
      } else if (first?.url) {
        imageBuffer = await downloadBuffer(first.url);
      }

      if (!imageBuffer) {
        throw new Error('OpenAI image response did not contain image data');
      }

      const saved = await savePublicImageBuffer({
        scope: 'ai',
        filePrefix: `gen-${generationId}`,
        extension: 'png',
        buffer: imageBuffer,
      });

      await db.insert(generatedImageSchema).values({
        userId: user.id,
        chatSessionId: requestBody.chatSessionId,
        generationId,
        productId: requestBody.productId,
        productSizeId: requestBody.sizeId,
        productFrameId: requestBody.frameId,
        textPrompt: requestBody.textPrompt,
        improvedPrompt: refinedPrompt,
        imageUrl: saved.url,
        thumbnailUrl: saved.url,
        uploadedImageUrl: requestBody.imagePromptUrl || null,
        userGenerationIntent: String(decision.user_generation_intent),
        isGenerateMode: true,
        creditUsed: requestBody.creditUsed,
        isSelected: false,
      });

      data = {
        reply_to_user: replyToUser,
        image_generation: true,
        generation_id: generationId,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bir hata oluştu',
    };
  }
}

export type GeneratedImageResponse = {
  id: number;
  user_id: string;
  chat_session_id: string;
  generation_id: string;
  product_id: number;
  product_size_id: number;
  product_frame_id: number;
  text_prompt: string;
  improved_prompt: string;
  image_url: string;
  thumbnail_url?: string; // Optional thumbnail URL for performance
  uploaded_image_url: string;
  user_generation_intent: string;
  is_generate_mode: boolean;
  credit_used: number;
  is_selected: boolean;
  updated_at: string;
  created_at: string;
};

export async function getGeneratedImage(generationId: string) {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: 'Kullanıcı oturumu bulunamadı.',
      };
    }

    const [row] = await db
      .select()
      .from(generatedImageSchema)
      .where(
        and(
          eq(generatedImageSchema.userId, user.id),
          eq(generatedImageSchema.generationId, generationId),
        ),
      )
      .limit(1);

    const data = row ? toGeneratedImageResponse(row) : null;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Get generated image error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Görsel alınamadı',
    };
  }
}

export async function getUserGeneratedImages() {
  try {
    // Get authenticated user
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: 'Kullanıcı oturumu bulunamadı.',
      };
    }

    const rows = await db
      .select()
      .from(generatedImageSchema)
      .where(eq(generatedImageSchema.userId, user.id))
      .orderBy(desc(generatedImageSchema.createdAt));

    const data: GeneratedImageResponse[] = rows.map((row: typeof rows[number]) => toGeneratedImageResponse(row));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Get user images error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Görseller alınamadı',
    };
  }
}
