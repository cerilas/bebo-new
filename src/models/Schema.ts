import {
  bigint,
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// The migration is automatically applied during the next database interaction,
// so there's no need to run it manually or restart the Next.js server.

// Need a database for production? Check out https://www.prisma.io/?via=saasboilerplatesrc
// Tested and compatible with Next.js Boilerplate
export const organizationSchema = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeSubscriptionPriceId: text('stripe_subscription_price_id'),
    stripeSubscriptionStatus: text('stripe_subscription_status'),
    stripeSubscriptionCurrentPeriodEnd: bigint(
      'stripe_subscription_current_period_end',
      { mode: 'number' },
    ),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => {
    return {
      stripeCustomerIdIdx: uniqueIndex('stripe_customer_id_idx').on(
        table.stripeCustomerId,
      ),
    };
  },
);

export const todoSchema = pgTable('todo', {
  id: serial('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Users table for Birebiro - tracking user credits and settings
export const userSchema = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: varchar('phone', { length: 20 }),
  imageUrl: text('image_url'),
  artCredits: integer('art_credits').default(1).notNull(), // Tasarım hakkı - starting credits
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Product tables for Birebiro
export const productSchema = pgTable('product', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  nameFr: text('name_fr'),
  description: text('description').notNull(),
  descriptionEn: text('description_en'),
  descriptionFr: text('description_fr'),
  imageSquareUrl: text('image_square_url'), // Square product image (1080x1080)
  imageSquareUrl2: text('image_square_url_2'), // Second square product image
  imageSquareUrl3: text('image_square_url_3'), // Third square product image
  imageWideUrl: text('image_wide_url'), // Wide product image (1920x1080)
  imageDimensions: varchar('image_dimensions', { length: 50 }).default('1920x1080').notNull(), // Required image dimensions (e.g., "1920x1080")
  sizeLabel: text('size_label').default('Boyut Seçin').notNull(), // "Boyut Seçin" etiketi
  sizeLabelEn: text('size_label_en').default('Select Size'),
  sizeLabelFr: text('size_label_fr').default('Sélectionner la taille'),
  frameLabel: text('frame_label').default('Çerçeve Seçin').notNull(), // "Çerçeve Seçin" etiketi
  frameLabelEn: text('frame_label_en').default('Select Frame'),
  frameLabelFr: text('frame_label_fr').default('Sélectionner le cadre'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const productSizeSchema = pgTable('product_size', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => productSchema.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  nameFr: text('name_fr'),
  dimensions: varchar('dimensions', { length: 50 }).notNull(),
  priceAmount: integer('price_amount').notNull(), // in cents (kuruş)
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const productFrameSchema = pgTable('product_frame', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => productSchema.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  nameFr: text('name_fr'),
  priceAmount: integer('price_amount').notNull(), // in cents (kuruş)
  colorCode: varchar('color_code', { length: 7 }), // Hex color code (e.g., #000000)
  frameImage: text('frame_image'), // Frame preview image URL
  frameImageLarge: text('frame_image_large'), // Large frame banner image URL
  // Mockup settings (landscape/horizontal - default)
  mockupTemplate: text('mockup_template'), // Mockup PNG image URL (transparent frame)
  mockupConfig: text('mockup_config').default('{}'), // JSON: { x, y, width, height, rotation }
  // Mockup settings (portrait/vertical)
  mockupTemplateVertical: text('mockup_template_vertical'), // Vertical mockup PNG image URL
  mockupConfigVertical: text('mockup_config_vertical').default('{}'), // JSON: vertical config
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Generated images table for storing user-created designs
export const generatedImageSchema = pgTable('generated_image', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  chatSessionId: varchar('chat_session_id', { length: 255 }).notNull(),
  generationId: varchar('generation_id', { length: 255 }).notNull().unique(), // From n8n API
  productId: integer('product_id').references(() => productSchema.id, { onDelete: 'set null' }),
  productSizeId: integer('product_size_id').references(() => productSizeSchema.id, { onDelete: 'set null' }),
  productFrameId: integer('product_frame_id').references(() => productFrameSchema.id, { onDelete: 'set null' }),
  textPrompt: text('text_prompt').notNull(), // User's original prompt
  improvedPrompt: text('improved_prompt'), // AI-improved prompt
  imageUrl: text('image_url').notNull(), // Generated image URL
  thumbnailUrl: text('thumbnail_url'), // Thumbnail version of generated image for performance
  uploadedImageUrl: text('uploaded_image_url'), // User uploaded reference image
  userGenerationIntent: text('user_generation_intent'), // What user wants to create
  isGenerateMode: boolean('is_generate_mode').default(true).notNull(), // Generate vs inspiration mode
  creditUsed: integer('credit_used').default(1).notNull(), // Credits consumed
  isSelected: boolean('is_selected').default(false).notNull(), // Did user select this for purchase?
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Orders table for tracking customer purchases
export const orderSchema = pgTable('order', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  generationId: varchar('generation_id', { length: 255 }).notNull(), // Generated image ID
  imageUrl: text('image_url'), // Görselin URL'i
  finalProductImageUrl: text('final_product_image_url'), // Sipariş anındaki çerçeveli final ürün görseli
  productId: integer('product_id').notNull().references(() => productSchema.id, { onDelete: 'restrict' }),
  productSizeId: integer('product_size_id').notNull().references(() => productSizeSchema.id, { onDelete: 'restrict' }),
  productFrameId: integer('product_frame_id').notNull().references(() => productFrameSchema.id, { onDelete: 'restrict' }),
  merchantOid: varchar('merchant_oid', { length: 64 }).notNull().unique(), // PayTR sipariş numarası
  paymentAmount: integer('payment_amount').notNull(), // Ödeme tutarı (kuruş cinsinden)
  totalAmount: integer('total_amount'), // Müşteriden tahsil edilen toplam tutar (taksit vs. ile değişebilir)
  currency: varchar('currency', { length: 10 }).default('TL').notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending').notNull(), // pending, success, failed
  paymentType: varchar('payment_type', { length: 20 }), // card, eft
  paytrToken: text('paytr_token'), // PayTR iframe token
  orderType: varchar('order_type', { length: 20 }).default('product').notNull(), // 'product' | 'credit'
  creditAmount: integer('credit_amount'), // Satın alınan kredi adedi (sadece orderType='credit' için)
  failedReasonCode: varchar('failed_reason_code', { length: 10 }), // Başarısız ödeme kodu
  failedReasonMsg: text('failed_reason_msg'), // Başarısız ödeme mesajı
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerAddress: text('customer_address').notNull(),
  customerCity: varchar('customer_city', { length: 100 }), // İl
  cityCode: varchar('city_code', { length: 10 }), // Geliver İl Kodu
  customerDistrict: varchar('customer_district', { length: 100 }), // İlçe
  districtId: integer('district_id'), // Geliver İlçe ID
  isCorporateInvoice: boolean('is_corporate_invoice').default(false).notNull(), // Kurumsal fatura isteniyor mu?
  companyName: text('company_name'), // Ünvan (şirket adı)
  taxNumber: varchar('tax_number', { length: 11 }), // Vergi kimlik numarası
  taxOffice: varchar('tax_office', { length: 100 }), // Vergi dairesi
  companyAddress: text('company_address'), // Şirket adresi
  orientation: varchar('orientation', { length: 20 }).default('landscape').notNull(), // landscape | portrait
  imageTransform: text('image_transform'), // JSON string: { x: number, y: number, scale: number }
  shippingStatus: varchar('shipping_status', { length: 20 }).default('pending').notNull(), // pending, preparing, shipped, delivered
  trackingNumber: varchar('tracking_number', { length: 100 }),
  notes: text('notes'), // Admin notları
  paidAt: timestamp('paid_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Art Credit Settings Schema
export const artCreditSettingsSchema = pgTable('art_credit_settings', {
  id: serial('id').primaryKey(),
  pricePerCredit: integer('price_per_credit').default(100).notNull(), // Kuruş cinsinden (100 kuruş = 1 TL)
  isActive: boolean('is_active').default(true).notNull(),
  minPurchase: integer('min_purchase').default(1).notNull(), // Minimum satın alma adedi
  maxPurchase: integer('max_purchase').default(1000).notNull(), // Maximum satın alma adedi
  maxUserCredits: integer('max_user_credits'), // Bir kullanıcının sahip olabileceği maksimum toplam kredi (null = sınırsız)
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

// Legal Documents Schema - for privacy policy, terms of service, etc.
export const legalDocumentSchema = pgTable('legal_documents', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  language: varchar('language', { length: 5 }).default('tr').notNull(), // 'tr', 'en', 'fr'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// About Page Content Schema - for dynamic about page management
export const aboutContentSchema = pgTable('about_content', {
  id: serial('id').primaryKey(),
  language: varchar('language', { length: 5 }).default('tr').notNull(), // 'tr', 'en', 'fr'

  // Section 1 content
  image1: text('image1'), // URL to first section image
  title1: text('title1').notNull(),
  body1: text('body1').notNull(),

  // Section 2 content
  image2: text('image2'), // URL to second section image
  title2: text('title2').notNull(),
  body2: text('body2').notNull(),

  // Section 3 content
  image3: text('image3'), // URL to third section image
  title3: text('title3').notNull(),
  body3: text('body3').notNull(),

  // Mission and Vision
  mission: text('mission').notNull(),
  vision: text('vision').notNull(),

  // Metadata
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Contact Form Submissions Schema - for managing contact form entries
export const contactSubmissionsSchema = pgTable('contact_submissions', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  subject: varchar('subject', { length: 500 }),
  message: text('message').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  isRead: boolean('is_read').default(false).notNull(),
  isReplied: boolean('is_replied').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Newsletter Subscribers Schema - for managing email newsletter subscriptions
export const newsletterSubscribersSchema = pgTable(
  'newsletter_subscribers',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, unsubscribed, bounced
    subscriptionSource: varchar('subscription_source', { length: 100 }).default('website'),
    ipAddress: text('ip_address'), // INET type olarak tutulacak ama drizzle'da text olarak tanımlanıyor
    userAgent: text('user_agent'),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true, mode: 'date' }),
    unsubscribeToken: varchar('unsubscribe_token', { length: 100 }).unique(),
    preferences: text('preferences').default('{}'), // JSONB olarak tutulacak ama drizzle'da text olarak
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex('idx_newsletter_email').on(table.email),
    };
  },
);

// Site ayarları - iletişim bilgileri, sosyal medya linkleri, şirket bilgileri
export const siteSettingsSchema = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(), // 'contact_email', 'social_instagram', etc.
  value: text('value'), // Değer
  valueType: varchar('value_type', { length: 20 }).default('text').notNull(), // 'text', 'email', 'phone', 'url', 'json'
  category: varchar('category', { length: 50 }).default('general').notNull(), // 'contact', 'social', 'company', 'general'
  label: text('label'), // Admin panelinde gösterilecek etiket
  description: text('description'), // Açıklama
  isPublic: boolean('is_public').default(true).notNull(), // Frontend'de gösterilebilir mi?
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Product Size-Frame Availability (Boyut-Çerçeve Stok İlişkisi)
export const productSizeFrameSchema = pgTable('product_size_frame', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => productSchema.id, { onDelete: 'cascade' }),
  sizeId: integer('size_id').notNull().references(() => productSizeSchema.id, { onDelete: 'cascade' }),
  frameId: integer('frame_id').notNull().references(() => productFrameSchema.id, { onDelete: 'cascade' }),
  isAvailable: boolean('is_available').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Payment Logs Schema - for logging all PayTR callback data for debugging
export const paymentLogsSchema = pgTable('payment_logs', {
  id: serial('id').primaryKey(),
  merchantOid: varchar('merchant_oid', { length: 64 }), // PayTR sipariş numarası
  status: varchar('status', { length: 20 }), // success, failed
  totalAmount: varchar('total_amount', { length: 20 }),
  hash: text('hash'),
  paymentType: varchar('payment_type', { length: 20 }),
  failedReasonCode: varchar('failed_reason_code', { length: 20 }),
  failedReasonMsg: text('failed_reason_msg'),
  testMode: varchar('test_mode', { length: 5 }),
  currency: varchar('currency', { length: 10 }),
  paymentAmount: varchar('payment_amount', { length: 20 }),
  rawPayload: text('raw_payload'), // JSON string of entire payload
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
