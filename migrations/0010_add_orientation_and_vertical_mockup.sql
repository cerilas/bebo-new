-- Add orientation column to order table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order' AND column_name = 'orientation'
  ) THEN
    ALTER TABLE "order" ADD COLUMN "orientation" varchar(20) NOT NULL DEFAULT 'landscape';
  END IF;
END $$;

-- Add vertical mockup columns to product_frame table (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_frame' AND column_name = 'mockup_template_vertical'
  ) THEN
    ALTER TABLE "product_frame" ADD COLUMN "mockup_template_vertical" text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_frame' AND column_name = 'mockup_config_vertical'
  ) THEN
    ALTER TABLE "product_frame" ADD COLUMN "mockup_config_vertical" text DEFAULT '{}';
  END IF;
END $$;
