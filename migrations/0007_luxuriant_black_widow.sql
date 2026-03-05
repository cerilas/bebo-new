CREATE TABLE IF NOT EXISTS "about_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"language" varchar(5) DEFAULT 'tr' NOT NULL,
	"image1" text,
	"title1" text NOT NULL,
	"body1" text NOT NULL,
	"image2" text,
	"title2" text NOT NULL,
	"body2" text NOT NULL,
	"image3" text,
	"title3" text NOT NULL,
	"body3" text NOT NULL,
	"mission" text NOT NULL,
	"vision" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"subject" varchar(500),
	"message" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_replied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legal_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"language" varchar(5) DEFAULT 'tr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "legal_documents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"subscription_source" varchar(100) DEFAULT 'website',
	"ip_address" text,
	"user_agent" text,
	"verified_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_token" varchar(100),
	"preferences" text DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_oid" varchar(64),
	"status" varchar(20),
	"total_amount" varchar(20),
	"hash" text,
	"payment_type" varchar(20),
	"failed_reason_code" varchar(20),
	"failed_reason_msg" text,
	"test_mode" varchar(5),
	"currency" varchar(10),
	"payment_amount" varchar(20),
	"raw_payload" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"value_type" varchar(20) DEFAULT 'text' NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"label" text,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "art_credits" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "art_credit_settings" ADD COLUMN IF NOT EXISTS "max_user_credits" integer;--> statement-breakpoint
ALTER TABLE "generated_image" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "order_type" varchar(20) DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "credit_amount" integer;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "customer_city" varchar(100);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "city_code" varchar(10);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "customer_district" varchar(100);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "district_id" integer;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "is_corporate_invoice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "company_name" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "tax_number" varchar(11);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "tax_office" varchar(100);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "company_address" text;--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "color_code" varchar(7);--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "frame_image" text;--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "frame_image_large" text;--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "mockup_template" text;--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "mockup_config" text DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "product_frame" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_square_url" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_square_url_2" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_square_url_3" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_wide_url" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "image_dimensions" varchar(50) DEFAULT '1920x1080' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_size" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_newsletter_email" ON "newsletter_subscribers" USING btree ("email");