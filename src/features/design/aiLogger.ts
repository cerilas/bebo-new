'use server';

import { db } from '@/libs/DB';
import { aiLogSchema } from '@/models/Schema';

export type AiLogEntry = {
  userId?: string | null;
  chatSessionId?: string | null;
  eventType: 'chat' | 'image_generation' | 'text_model_call' | 'image_model_call' | 'credit_deduction' | 'error';
  status: 'success' | 'error' | 'fallback';
  textModel?: string | null;
  imageModel?: string | null;
  modelProvider?: string | null;
  userPrompt?: string | null;
  improvedPrompt?: string | null;
  systemPrompt?: string | null;
  uploadedImageUrl?: string | null;
  generationId?: string | null;
  isGenerateMode?: boolean | null;
  productSlug?: string | null;
  sizeSlug?: string | null;
  frameSlug?: string | null;
  orientation?: string | null;
  apiSize?: string | null;
  aiRawResponse?: string | null;
  aiParsedReply?: string | null;
  userGenerationIntent?: boolean | null;
  creditUsed?: number | null;
  creditDeducted?: boolean | null;
  creditBalanceAfter?: number | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  errorCode?: string | null;
  generatedImageUrl?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Insert a log entry into the ai_log table.
 * This function NEVER throws — it catches all errors internally
 * so logging failures don't break the main flow.
 */
export async function logAiEvent(entry: AiLogEntry): Promise<void> {
  try {
    await db.insert(aiLogSchema).values({
      userId: entry.userId ?? null,
      chatSessionId: entry.chatSessionId ?? null,
      eventType: entry.eventType,
      status: entry.status,
      textModel: entry.textModel ?? null,
      imageModel: entry.imageModel ?? null,
      modelProvider: entry.modelProvider ?? null,
      userPrompt: entry.userPrompt ?? null,
      improvedPrompt: entry.improvedPrompt ?? null,
      systemPrompt: entry.systemPrompt ?? null,
      uploadedImageUrl: entry.uploadedImageUrl ?? null,
      generationId: entry.generationId ?? null,
      isGenerateMode: entry.isGenerateMode ?? null,
      productSlug: entry.productSlug ?? null,
      sizeSlug: entry.sizeSlug ?? null,
      frameSlug: entry.frameSlug ?? null,
      orientation: entry.orientation ?? null,
      apiSize: entry.apiSize ?? null,
      aiRawResponse: entry.aiRawResponse ?? null,
      aiParsedReply: entry.aiParsedReply ?? null,
      userGenerationIntent: entry.userGenerationIntent ?? null,
      creditUsed: entry.creditUsed ?? null,
      creditDeducted: entry.creditDeducted ?? null,
      creditBalanceAfter: entry.creditBalanceAfter ?? null,
      errorMessage: entry.errorMessage ?? null,
      errorStack: entry.errorStack ?? null,
      errorCode: entry.errorCode ?? null,
      generatedImageUrl: entry.generatedImageUrl ?? null,
      durationMs: entry.durationMs ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (err) {
    // Never let logging break the main flow
    console.error('[AI Logger] Failed to write log:', err);
  }
}
