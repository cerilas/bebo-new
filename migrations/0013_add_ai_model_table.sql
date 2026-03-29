-- AI Model Configuration table
CREATE TABLE IF NOT EXISTS "ai_model" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "model_identifier" varchar(100) NOT NULL,
  "model_type" varchar(20) DEFAULT 'text' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default models
INSERT INTO "ai_model" ("name", "model_identifier", "model_type", "is_active", "sort_order") VALUES
  ('GPT-4.1', 'gpt-4.1', 'text', true, 0),
  ('GPT-4.1 Mini', 'gpt-4.1-mini', 'text', true, 10),
  ('GPT-4.1 Nano', 'gpt-4.1-nano', 'text', true, 20),
  ('GPT Image 1', 'gpt-image-1', 'image', true, 0);
