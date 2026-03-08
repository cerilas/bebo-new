-- Add image_transform column to order table for storing crop/position data
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "image_transform" text;
