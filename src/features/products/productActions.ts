'use server';

import { and, eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { productFrameSchema, productSchema, productSizeSchema } from '@/models/Schema';

export async function getProducts(locale: string = 'tr') {
  const products = await db
    .select()
    .from(productSchema)
    .where(eq(productSchema.isActive, true))
    .orderBy(productSchema.sortOrder);

  return products.map((product: typeof productSchema.$inferSelect) => ({
    id: product.id,
    slug: product.slug,
    name: locale === 'en' ? (product.nameEn || product.name) : locale === 'fr' ? (product.nameFr || product.name) : product.name,
    description: locale === 'en' ? (product.descriptionEn || product.description) : locale === 'fr' ? (product.descriptionFr || product.description) : product.description,
    imageSquareUrl: product.imageSquareUrl,
    imageSquareUrl2: product.imageSquareUrl2,
    imageSquareUrl3: product.imageSquareUrl3,
    imageWideUrl: product.imageWideUrl,
  }));
}

export async function getProductDetails(productSlug: string, locale: string = 'tr') {
  const [product] = await db
    .select()
    .from(productSchema)
    .where(eq(productSchema.slug, productSlug))
    .limit(1);

  if (!product) {
    return null;
  }

  const sizes = await db
    .select()
    .from(productSizeSchema)
    .where(and(eq(productSizeSchema.productId, product.id), eq(productSizeSchema.isActive, true)))
    .orderBy(productSizeSchema.sortOrder);

  const frames = await db
    .select()
    .from(productFrameSchema)
    .where(and(eq(productFrameSchema.productId, product.id), eq(productFrameSchema.isActive, true)))
    .orderBy(productFrameSchema.sortOrder);

  return {
    id: product.id,
    slug: product.slug,
    name: locale === 'en' ? (product.nameEn || product.name) : locale === 'fr' ? (product.nameFr || product.name) : product.name,
    description: locale === 'en' ? (product.descriptionEn || product.description) : locale === 'fr' ? (product.descriptionFr || product.description) : product.description,
    imageSquareUrl: product.imageSquareUrl,
    imageWideUrl: product.imageWideUrl,
    imageDimensions: product.imageDimensions || '1920x1080', // Required image dimensions
    sizeLabel: locale === 'en' ? (product.sizeLabelEn || product.sizeLabel || 'Select Size') : locale === 'fr' ? (product.sizeLabelFr || product.sizeLabel || 'Sélectionner la taille') : (product.sizeLabel || 'Boyut Seçin'),
    frameLabel: locale === 'en' ? (product.frameLabelEn || product.frameLabel || 'Select Frame') : locale === 'fr' ? (product.frameLabelFr || product.frameLabel || 'Sélectionner le cadre') : (product.frameLabel || 'Çerçeve Seçin'),
    sizes: sizes.map((size: typeof productSizeSchema.$inferSelect) => ({
      id: size.id,
      slug: size.slug,
      name: locale === 'en' ? (size.nameEn || size.name) : locale === 'fr' ? (size.nameFr || size.name) : size.name,
      dimensions: size.dimensions,
      price: size.priceAmount / 100, // Convert from cents to TL
    })),
    frames: frames.map((frame: typeof productFrameSchema.$inferSelect) => ({
      id: frame.id,
      slug: frame.slug,
      name: locale === 'en' ? (frame.nameEn || frame.name) : locale === 'fr' ? (frame.nameFr || frame.name) : frame.name,
      price: frame.priceAmount / 100, // Convert from cents to TL
      colorCode: frame.colorCode,
      frameImage: frame.frameImage,
      frameImageLarge: frame.frameImageLarge,
    })),
  };
}

export async function getProductIdsFromSlugs(params: {
  productSlug?: string;
  sizeSlug?: string;
  frameSlug?: string;
}) {
  let productId: number | null = null;
  let sizeId: number | null = null;
  let frameId: number | null = null;

  // Get product ID
  if (params.productSlug) {
    const [product] = await db
      .select({ id: productSchema.id })
      .from(productSchema)
      .where(eq(productSchema.slug, params.productSlug))
      .limit(1);
    productId = product?.id || null;
  }

  // Get size ID
  if (params.sizeSlug && productId) {
    const [size] = await db
      .select({ id: productSizeSchema.id })
      .from(productSizeSchema)
      .where(eq(productSizeSchema.slug, params.sizeSlug))
      .limit(1);
    sizeId = size?.id || null;
  }

  // Get frame ID
  if (params.frameSlug && productId) {
    const [frame] = await db
      .select({ id: productFrameSchema.id })
      .from(productFrameSchema)
      .where(eq(productFrameSchema.slug, params.frameSlug))
      .limit(1);
    frameId = frame?.id || null;
  }

  return {
    productId,
    sizeId,
    frameId,
  };
}

export async function getProductBySlug(productSlug: string, locale: string = 'tr') {
  const [product] = await db
    .select()
    .from(productSchema)
    .where(eq(productSchema.slug, productSlug))
    .limit(1);

  if (!product) {
    return null;
  }

  const result = {
    id: product.id,
    slug: product.slug,
    name: locale === 'en' ? (product.nameEn || product.name) : locale === 'fr' ? (product.nameFr || product.name) : product.name,
    description: locale === 'en' ? (product.descriptionEn || product.description) : locale === 'fr' ? (product.descriptionFr || product.description) : product.description,
    imageSquareUrl: product.imageSquareUrl,
    imageSquareUrl2: product.imageSquareUrl2,
    imageSquareUrl3: product.imageSquareUrl3,
    imageWideUrl: product.imageWideUrl,
  };

  console.log('getProductBySlug result:', result);

  return result;
}
