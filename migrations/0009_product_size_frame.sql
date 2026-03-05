-- Product Size-Frame Availability table
-- Hangi boyut-çerçeve kombinasyonunun stokta olduğunu tutar
CREATE TABLE IF NOT EXISTS "product_size_frame" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "size_id" integer NOT NULL REFERENCES "product_size"("id") ON DELETE CASCADE,
  "frame_id" integer NOT NULL REFERENCES "product_frame"("id") ON DELETE CASCADE,
  "is_available" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("product_id", "size_id", "frame_id")
);

-- Örnek: Ürün 5, boyut 12 için çerçeve 7 stokta değil
-- INSERT INTO "product_size_frame" ("product_id", "size_id", "frame_id", "is_available") VALUES
-- (5, 12, 7, false);

-- NOT: Tabloda kayıt olmayan kombinasyonlar varsayılan olarak STOKTA kabul edilir.
-- Yani sadece stokta OLMAYAN kombinasyonları eklemeniz yeterli (is_available = false).
