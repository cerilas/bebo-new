import OpenAI from 'openai';

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

export const getOpenAITextModel = (): string => {
  return process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
};

export const getOpenAIImageModel = (): string => {
  return process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
};
