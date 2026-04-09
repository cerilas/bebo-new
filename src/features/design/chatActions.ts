'use server';

import { Buffer } from 'node:buffer';

import { currentUser } from '@clerk/nextjs/server';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import { and, desc, eq } from 'drizzle-orm';
import { toFile } from 'openai';

import { getProductIdsFromSlugs } from '@/features/products/productActions';
import { db } from '@/libs/DB';
import { generatedImageSchema, siteSettingsSchema, userSchema } from '@/models/Schema';
import { getBaseUrl } from '@/utils/Helpers';

import { logAiEvent } from './aiLogger';
import { savePublicImageBuffer, toBase64DataUrl } from './assetStorage';
import type { AIModelSelection } from './openaiClient';
import { getAllImageModels, getAllTextModels, getOpenAIClient } from './openaiClient';

const getGoogleAIClient = (): GoogleGenAI => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
  }

  return new GoogleGenAI({ apiKey });
};

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
  textModel?: string;
  imageModel?: string;
  creditDeducted: boolean;
  newCreditBalance?: number;
};

type NativeAssistantDecision = {
  reply_to_user: string;
  user_generation_intent: boolean;
  improved_generation_prompt?: string;
  use_reference_image?: boolean;
};

// JSON Schema to enforce structured output from Gemini text model
const NATIVE_ASSISTANT_DECISION_SCHEMA = {
  type: 'object',
  properties: {
    reply_to_user: { type: 'string', description: 'The friendly reply shown to the user.' },
    user_generation_intent: { type: 'boolean', description: 'Whether the user wants to generate an image.' },
    improved_generation_prompt: { type: 'string', description: 'English image generation prompt. Empty string if not generating.' },
    use_reference_image: { type: 'boolean', description: 'Whether to use the previously uploaded/generated image as reference.' },
  },
  required: ['reply_to_user', 'user_generation_intent', 'improved_generation_prompt', 'use_reference_image'],
  propertyOrdering: ['reply_to_user', 'user_generation_intent', 'improved_generation_prompt', 'use_reference_image'],
};

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
  userImageUrl?: string;
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

If the user has attached an image, it will be provided directly as a vision input — you CAN see it and should analyze its colors, style, composition, subject, textures, patterns, lighting, shadows, mood, and every fine detail to enrich your response and generation prompt.

"User image generation intent" indicates whether the user clicked the image generation button on the interface.

Your ONLY job is to return ONE JSON object in the following exact format, with no extra text:

{
  "reply_to_user": "",
  "user_generation_intent": true,
  "improved_generation_prompt": "",
  "use_reference_image": false
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
- If an image was provided (vision input), analyze its colors, style, mood, subject, composition, textures, patterns, lighting, shadows, and every fine detail, then incorporate those visual details into the prompt.
- If prompt is vague, still produce meaningful creative prompt when generation is intended.

4) use_reference_image
- Set true ONLY when the user explicitly wants to use/modify/transform a previously uploaded or generated image (e.g. "bu fotoyu", "yüklediğim resmi", "önceki görseli", "bunu maymuna çevir", "aynı tarzda", "bu adamı", "şunu değiştir").
- ALSO set true when "User has reference image from chat history: true" AND the user's prompt refers to modifying/using that image.
- Set false when user wants a completely new/fresh image from scratch, or is just chatting.
- Default is false.

Additional strict rules:
- Return ONLY JSON object with exactly these 4 fields.
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
    use_reference_image: Boolean(parsed.use_reference_image),
  };
};

/**
 * Tries each model in order. If one fails, logs the error and tries the next.
 * Throws the last error only if ALL models fail.
 */
const tryWithFallback = async <T>(
  models: AIModelSelection[],
  fn: (model: AIModelSelection) => Promise<T>,
  label: string,
): Promise<{ result: T; usedModel: AIModelSelection }> => {
  let lastError: Error = new Error(`No ${label} models available`);
  for (const model of models) {
    try {
      console.log(`🔄 [${label}] Trying model: ${model.provider}/${model.modelIdentifier}`);
      const result = await fn(model);
      return { result, usedModel: model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️ [${label}] Model ${model.modelIdentifier} failed: ${lastError.message}`);
      // Log model fallback
      await logAiEvent({
        eventType: label === 'ImageModel' ? 'image_model_call' : 'text_model_call',
        status: 'fallback',
        textModel: label === 'TextModel' ? model.modelIdentifier : null,
        imageModel: label === 'ImageModel' ? model.modelIdentifier : null,
        modelProvider: model.provider,
        errorMessage: lastError.message,
        errorStack: lastError.stack,
        metadata: { fallbackLabel: label },
      });
    }
  }
  throw lastError;
};

const downloadBuffer = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } };

const callGoogleGeminiTextModel = async (
  modelIdentifier: string,
  systemPrompt: string,
  userMessageContent: string | ContentPart[],
): Promise<string> => {
  const ai = getGoogleAIClient();

  let geminiContents: string | any[];

  if (typeof userMessageContent === 'string') {
    geminiContents = userMessageContent;
  } else {
    const parts = await Promise.all(
      userMessageContent.map(async (item) => {
        if (item.type === 'text') {
          return { text: item.text };
        }
        try {
          const url = item.image_url.url;
          // data: URLs (base64 inline) — extract directly without fetch
          if (url.startsWith('data:')) {
            const mimeMatch = url.match(/^data:([^;]+);base64,/);
            const mime = mimeMatch?.[1] ?? 'image/png';
            const base64 = url.replace(/^data:[^;]+;base64,/, '');
            return { inlineData: { mimeType: mime, data: base64 } };
          }
          const buf = await downloadBuffer(url);
          const ext = url.split('.').pop()?.toLowerCase() ?? 'png';
          const mimeMap: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
          const mime = mimeMap[ext] ?? 'image/png';
          return { inlineData: { mimeType: mime, data: buf.toString('base64') } };
        } catch (err) {
          console.warn(`[Gemini] Image indir hatası (${item.image_url.url}):`, err);
          return { text: `[Görsel yüklenemedi: ${item.image_url.url}]` };
        }
      }),
    );
    // Pass parts directly (Part[] format) as shown in Gemini API docs
    geminiContents = parts;
  }

  const response = await ai.models.generateContent({
    model: modelIdentifier,
    contents: geminiContents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseJsonSchema: NATIVE_ASSISTANT_DECISION_SCHEMA,
      temperature: 0.7,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error('Gemini text model did not return valid content');
  }

  return content;
};

const callGoogleGeminiImageModel = async (
  modelIdentifier: string,
  prompt: string,
  referenceBuffer?: Buffer | null,
): Promise<Buffer> => {
  const ai = getGoogleAIClient();

  // Build parts array: text prompt first, then optional reference image (inline data)
  const parts: any[] = [{ text: prompt }];

  if (referenceBuffer) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: referenceBuffer.toString('base64'),
      },
    });
  }

  const response = await ai.models.generateContent({
    model: modelIdentifier,
    contents: parts,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part: any) => part.inlineData,
  );

  if (!imagePart?.inlineData?.data) {
    const textPart = response.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.text,
    );
    throw new Error(`Gemini image model did not return valid image data${textPart?.text ? `: ${textPart.text}` : ''}`);
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
};

const createChatCompletion = async (
  openai: ReturnType<typeof getOpenAIClient>,
  modelSelection: AIModelSelection,
  systemPrompt: string,
  userMessageContent: string | ContentPart[],
): Promise<string> => {
  const isGeminiProvider = modelSelection.provider !== 'OpenAI';
  if (isGeminiProvider) {
    return callGoogleGeminiTextModel(modelSelection.modelIdentifier, systemPrompt, userMessageContent);
  }

  const completion = await openai.chat.completions.create({
    model: modelSelection.modelIdentifier,
    temperature: 0.7,
    max_completion_tokens: 8192,
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

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('OpenAI chat response is empty');
  }

  return raw;
};

const generateImageWithModel = async (
  openai: ReturnType<typeof getOpenAIClient>,
  modelSelection: AIModelSelection,
  promptWithRatio: string,
  apiSize: '1024x1024' | '1536x1024' | '1024x1536',
  fullImageUrl: string | null,
  referenceBuffer: Buffer | null,
): Promise<Buffer> => {
  const isGeminiImageProvider = modelSelection.provider !== 'OpenAI';
  if (isGeminiImageProvider) {
    return callGoogleGeminiImageModel(modelSelection.modelIdentifier, promptWithRatio, referenceBuffer);
  }

  let imageResult;
  if (fullImageUrl && referenceBuffer) {
    const imageFile = await toFile(referenceBuffer, 'reference.png', { type: 'image/png' });
    imageResult = await openai.images.edit({
      model: modelSelection.modelIdentifier,
      image: imageFile,
      prompt: promptWithRatio,
      size: apiSize,
    });
  } else {
    imageResult = await openai.images.generate({
      model: modelSelection.modelIdentifier,
      prompt: promptWithRatio,
      size: apiSize,
      quality: 'high',
    });
  }

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

  return imageBuffer;
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
  orientation?: string | null;
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
    orientation: row.orientation ?? null,
    credit_used: row.creditUsed,
    is_selected: row.isSelected,
    updated_at: row.updatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  };
};

export async function sendChatMessage(params: {
  textPrompt: string;
  imagePromptUrl?: string;
  lastUploadedImageUrl?: string;
  isGenerateMode: boolean;
  chatSessionId: string;
  chatHistory?: ChatHistoryItem[];
  productSlug?: string;
  sizeSlug?: string;
  frameSlug?: string;
  orientationSlug?: 'landscape' | 'portrait';
}) {
  let wasImageGenAttempt = false;
  const startTime = Date.now();
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

    const recentGenerations = await db
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
      .limit(2);
    const latestGeneration = recentGenerations[0] ?? null;

    const baseUrl = getBaseUrl();

    // Determine the effective image URL: current upload > last uploaded in chat history
    const effectiveImageUrl = requestBody.imagePromptUrl || params.lastUploadedImageUrl || '';

    // Convert local file to base64 so OpenAI can read it regardless of environment
    const imageBase64 = effectiveImageUrl
      ? await toBase64DataUrl(effectiveImageUrl)
      : null;
    // Fallback: if not a local file, use the absolute URL
    const fullImageUrl = imageBase64
      ?? (effectiveImageUrl
        ? (effectiveImageUrl.startsWith('http')
            ? effectiveImageUrl
            : `${baseUrl}${effectiveImageUrl}`)
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
User has reference image from chat history: ${!!params.lastUploadedImageUrl && !requestBody.imagePromptUrl}
Product slug: ${requestBody.productSlug}
Size slug: ${requestBody.sizeSlug}
Frame slug: ${requestBody.frameSlug}
Frame orientation: ${params.orientationSlug || 'landscape'}
Frame physical dimensions: ${sizeDimensions || 'unknown'}cm

Recent chat history:
${historyText || 'No chat history.'}

Previous generation context:
${previousGenerationContext}`;

    // Build multi-image content: all images at high detail for maximum visual analysis.
    // 1) User-uploaded images from chat history (oldest → newest, deduped)
    // 2) Last 2 generated images (oldest → newest)
    // 3) Current user upload (highest priority — always last)
    const visionParts: ContentPart[] = [{ type: 'text', text: textContent }];

    // Collect unique user-uploaded image URLs from chat history (exclude current upload)
    const historyImageUrls = (params.chatHistory ?? [])
      .slice(-12)
      .filter(m => m.role === 'user' && m.userImageUrl && m.userImageUrl !== effectiveImageUrl)
      .map(m => m.userImageUrl as string)
      .filter((url, idx, arr) => arr.indexOf(url) === idx); // dedupe

    for (const imgUrl of historyImageUrls) {
      const resolvedUrl = imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`;
      visionParts.push({ type: 'image_url', image_url: { url: resolvedUrl, detail: 'high' } });
    }

    // Generated images from DB (oldest first)
    for (const gen of [...recentGenerations].reverse()) {
      const genUrl = gen.imageUrl.startsWith('http') ? gen.imageUrl : `${baseUrl}${gen.imageUrl}`;
      visionParts.push({ type: 'image_url', image_url: { url: genUrl, detail: 'high' } });
    }

    // Current user upload — last so it's treated as primary subject
    if (fullImageUrl) {
      visionParts.push({ type: 'image_url', image_url: { url: fullImageUrl, detail: 'high' } });
    }
    const userMessageContent: string | ContentPart[] = visionParts.length > 1 ? visionParts : textContent;

    // Resolve ALL active text models from DB (sorted by sort_order, for fallback chaining)
    const textModels = await getAllTextModels();

    const { result: rawDecision, usedModel: usedTextModel } = await tryWithFallback(
      textModels,
      model => createChatCompletion(openai, model, systemPrompt, userMessageContent),
      'TextModel',
    );
    const textModel = usedTextModel.modelIdentifier;
    const decision = parseDecision(rawDecision);

    // Log text model call
    await logAiEvent({
      userId: user.id,
      chatSessionId: params.chatSessionId,
      eventType: 'text_model_call',
      status: 'success',
      textModel,
      modelProvider: usedTextModel.provider,
      userPrompt: requestBody.textPrompt,
      isGenerateMode: params.isGenerateMode,
      productSlug: params.productSlug,
      sizeSlug: params.sizeSlug,
      frameSlug: params.frameSlug,
      orientation: params.orientationSlug,
      uploadedImageUrl: requestBody.imagePromptUrl || null,
      aiRawResponse: rawDecision,
      aiParsedReply: decision.reply_to_user,
      userGenerationIntent: decision.user_generation_intent,
      improvedPrompt: decision.improved_generation_prompt || null,
      durationMs: Date.now() - startTime,
    });

    const isGenerationModeActive = params.isGenerateMode;
    const userAskedForImageGeneration = looksLikeImageGenerationRequest(requestBody.textPrompt);
    // Double safety: NEVER generate or deduct credits if isGenerateMode is false
    const canGenerateImage = isGenerationModeActive === true && decision.user_generation_intent === true;

    const replyToUser = !isGenerationModeActive && userAskedForImageGeneration
      ? GENERATION_MODE_REQUIRED_MESSAGE
      : decision.reply_to_user;

    let data: ChatResponse = {
      reply_to_user: replyToUser,
      image_generation: false,
      generation_id: '',
      textModel,
      creditDeducted: false,
    };

    if (canGenerateImage) {
      const generationId = buildGenerationId();
      const refinedPrompt = decision.improved_generation_prompt?.trim() || requestBody.textPrompt;

      // Resolve ALL active image models (for fallback chaining)
      const imageModels = await getAllImageModels();

      // Resolve the correct aspect ratio from the selected frame size + orientation
      const { apiSize, ratioLabel, physicalLabel } = resolveGenerationSize(
        sizeDimensions,
        params.orientationSlug,
      );

      // Prepend frame ratio constraint so the model composes correctly for the print dimensions
      const ratioConstraint = `IMPORTANT: This artwork will be printed on a ${physicalLabel} frame. Compose the image to fill a strict ${ratioLabel} aspect ratio. Do NOT add letterboxing, borders, or padding. Fill every pixel.`;
      const promptWithRatio = `${ratioConstraint}\n\n${refinedPrompt}`;

      // Build image generation request.
      // Only use reference image when AI decides user wants to modify/transform an existing image
      const shouldUseReference = decision.use_reference_image === true;
      let referenceBuffer: Buffer | null = null;

      if (shouldUseReference) {
        if (fullImageUrl) {
          // User uploaded an image (current or from chat history) — use it as reference
          if (imageBase64) {
            referenceBuffer = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
          } else if (effectiveImageUrl) {
            const downloadUrl = effectiveImageUrl.startsWith('http')
              ? effectiveImageUrl
              : `${baseUrl}${effectiveImageUrl}`;
            referenceBuffer = await downloadBuffer(downloadUrl);
          }
        } else if (latestGeneration?.imageUrl) {
          // No user upload: use the last generated image as reference for the image model
          const genUrl = latestGeneration.imageUrl.startsWith('http')
            ? latestGeneration.imageUrl
            : `${baseUrl}${latestGeneration.imageUrl}`;
          try {
            referenceBuffer = await downloadBuffer(genUrl);
          } catch (err) {
            console.warn('[Image Model] Önceki görsel referans olarak kullanılamadı:', err);
          }
        }
      }

      // Capture referenceBuffer in closure for tryWithFallback
      const capturedReferenceBuffer = referenceBuffer;
      const capturedApiSize = apiSize;
      const capturedRefUrl = shouldUseReference ? fullImageUrl : null;

      wasImageGenAttempt = true;
      const { result: imageBuffer, usedModel: usedImageModel } = await tryWithFallback(
        imageModels,
        model => generateImageWithModel(openai, model, promptWithRatio, capturedApiSize, capturedRefUrl, capturedReferenceBuffer),
        'ImageModel',
      );
      const imageModel = usedImageModel.modelIdentifier;

      if (!imageBuffer) {
        await logAiEvent({
          userId: user.id,
          chatSessionId: params.chatSessionId,
          eventType: 'image_generation',
          status: 'error',
          imageModel,
          modelProvider: usedImageModel.provider,
          userPrompt: requestBody.textPrompt,
          improvedPrompt: refinedPrompt,
          isGenerateMode: true,
          apiSize: capturedApiSize,
          errorMessage: 'Image generation did not return valid image data',
          durationMs: Date.now() - startTime,
        });
        throw new Error('Image generation did not return valid image data');
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
        orientation: requestBody.orientation || null,
        creditUsed: requestBody.creditUsed,
        isSelected: false,
      });

      // Deduct credit ONLY after image is successfully generated and saved
      let creditDeducted = false;
      let newCreditBalance: number | undefined;
      try {
        const [currentUser] = await db
          .select({ artCredits: userSchema.artCredits })
          .from(userSchema)
          .where(eq(userSchema.id, user.id))
          .limit(1);

        if (currentUser && currentUser.artCredits > 0) {
          const newCredits = currentUser.artCredits - 1;
          await db
            .update(userSchema)
            .set({ artCredits: newCredits })
            .where(eq(userSchema.id, user.id));
          creditDeducted = true;
          newCreditBalance = newCredits;
          console.log(`💰 [Credits] Deducted 1 credit for user ${user.id}. New balance: ${newCredits}`);
        }
      } catch (creditError) {
        console.error('Failed to deduct credit after successful generation:', creditError);
        await logAiEvent({
          userId: user.id,
          chatSessionId: params.chatSessionId,
          eventType: 'credit_deduction',
          status: 'error',
          errorMessage: creditError instanceof Error ? creditError.message : 'Credit deduction failed',
          errorStack: creditError instanceof Error ? creditError.stack : undefined,
          durationMs: Date.now() - startTime,
        });
      }

      data = {
        reply_to_user: replyToUser,
        image_generation: true,
        generation_id: generationId,
        textModel,
        imageModel,
        creditDeducted,
        newCreditBalance,
      };

      // Log successful image generation
      await logAiEvent({
        userId: user.id,
        chatSessionId: params.chatSessionId,
        eventType: 'image_generation',
        status: 'success',
        textModel,
        imageModel,
        modelProvider: usedImageModel.provider,
        userPrompt: requestBody.textPrompt,
        improvedPrompt: refinedPrompt,
        uploadedImageUrl: requestBody.imagePromptUrl || null,
        generationId,
        isGenerateMode: true,
        productSlug: params.productSlug,
        sizeSlug: params.sizeSlug,
        frameSlug: params.frameSlug,
        orientation: params.orientationSlug,
        apiSize: capturedApiSize,
        aiParsedReply: replyToUser,
        userGenerationIntent: true,
        creditUsed: requestBody.creditUsed,
        creditDeducted,
        creditBalanceAfter: newCreditBalance ?? null,
        generatedImageUrl: saved.url,
        durationMs: Date.now() - startTime,
      });
    }

    // Log successful chat completion
    if (!data.image_generation) {
      await logAiEvent({
        userId: user.id,
        chatSessionId: params.chatSessionId,
        eventType: 'chat',
        status: 'success',
        textModel,
        modelProvider: usedTextModel.provider,
        userPrompt: requestBody.textPrompt,
        isGenerateMode: params.isGenerateMode,
        productSlug: params.productSlug,
        sizeSlug: params.sizeSlug,
        frameSlug: params.frameSlug,
        orientation: params.orientationSlug,
        uploadedImageUrl: requestBody.imagePromptUrl || null,
        aiParsedReply: replyToUser,
        userGenerationIntent: decision.user_generation_intent,
        durationMs: Date.now() - startTime,
      });
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Chat API error:', error);

    // Log error — capture everything available
    await logAiEvent({
      userId: undefined,
      chatSessionId: params.chatSessionId,
      eventType: 'error',
      status: 'error',
      userPrompt: params.textPrompt,
      isGenerateMode: params.isGenerateMode,
      productSlug: params.productSlug,
      sizeSlug: params.sizeSlug,
      frameSlug: params.frameSlug,
      orientation: params.orientationSlug,
      uploadedImageUrl: params.imagePromptUrl || null,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - startTime,
      metadata: { wasImageGenAttempt },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bir hata oluştu',
      wasImageGenAttempt,
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
  orientation?: string | null;
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
