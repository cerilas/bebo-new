CREATE TABLE IF NOT EXISTS "product_detail" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL UNIQUE REFERENCES "product"("id") ON DELETE CASCADE,
  "short_description" text,
  "short_description_en" text,
  "short_description_fr" text,
  "long_description_html" text,
  "long_description_html_en" text,
  "long_description_html_fr" text,
  "gallery_images" text DEFAULT '[]',
  "video_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
