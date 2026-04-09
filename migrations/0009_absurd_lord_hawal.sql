CREATE TABLE IF NOT EXISTS "ai_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256),
	"chat_session_id" varchar(256),
	"event_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"text_model" varchar(128),
	"image_model" varchar(128),
	"model_provider" varchar(50),
	"user_prompt" text,
	"improved_prompt" text,
	"system_prompt" text,
	"uploaded_image_url" text,
	"generation_id" varchar(128),
	"is_generate_mode" boolean,
	"product_slug" varchar(256),
	"size_slug" varchar(256),
	"frame_slug" varchar(256),
	"orientation" varchar(20),
	"api_size" varchar(20),
	"ai_raw_response" text,
	"ai_parsed_reply" text,
	"user_generation_intent" boolean,
	"credit_used" integer,
	"credit_deducted" boolean,
	"credit_balance_after" integer,
	"error_message" text,
	"error_stack" text,
	"error_code" varchar(50),
	"generated_image_url" text,
	"duration_ms" integer,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_model" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"model_identifier" varchar(255) NOT NULL,
	"type" varchar(20) DEFAULT 'image' NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"short_description" text,
	"short_description_en" text,
	"short_description_fr" text,
	"long_description_html" text,
	"long_description_html_en" text,
	"long_description_html_fr" text,
	"gallery_images" text DEFAULT '[]',
	"video_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_detail_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
ALTER TABLE "generated_image" ADD COLUMN "orientation" varchar(20);--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "final_product_image_url" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "preview_image_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_detail" ADD CONSTRAINT "product_detail_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
