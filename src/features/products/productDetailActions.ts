'use server';

import { and, eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import {
  productDetailSchema,
  productFrameSchema,
  productSchema,
  productSizeSchema,
} from '@/models/Schema';

export async function getProductDetailPage(productSlug: string, locale: string = 'tr') {
  const [product] = await db
    .select()
    .from(productSchema)
    .where(eq(productSchema.slug, productSlug))
    .limit(1);

  if (!product) {
    return null;
  }

  // Get extended detail info
  const [detail] = await db
    .select()
    .from(productDetailSchema)
    .where(eq(productDetailSchema.productId, product.id))
    .limit(1);

  // Get sizes
  const sizes = await db
    .select()
    .from(productSizeSchema)
    .where(and(eq(productSizeSchema.productId, product.id), eq(productSizeSchema.isActive, true)))
    .orderBy(productSizeSchema.sortOrder);

  // Get frames
  const frames = await db
    .select()
    .from(productFrameSchema)
    .where(and(eq(productFrameSchema.productId, product.id), eq(productFrameSchema.isActive, true)))
    .orderBy(productFrameSchema.sortOrder);

  const localizedName = locale === 'en'
    ? (product.nameEn || product.name)
    : locale === 'fr'
      ? (product.nameFr || product.name)
      : product.name;

  const detailTitle = detail
    ? (locale === 'en'
        ? (detail.detailTitleEn || detail.detailTitle || localizedName)
        : locale === 'fr'
          ? (detail.detailTitleFr || detail.detailTitle || localizedName)
          : (detail.detailTitle || localizedName))
    : localizedName;

  const localizedDescription = locale === 'en'
    ? (product.descriptionEn || product.description)
    : locale === 'fr'
      ? (product.descriptionFr || product.description)
      : product.description;

  const shortDescription = detail
    ? (locale === 'en'
        ? (detail.shortDescriptionEn || detail.shortDescription)
        : locale === 'fr'
          ? (detail.shortDescriptionFr || detail.shortDescription)
          : detail.shortDescription)
    : null;

  const longDescriptionHtml = detail
    ? (locale === 'en'
        ? (detail.longDescriptionHtmlEn || detail.longDescriptionHtml)
        : locale === 'fr'
          ? (detail.longDescriptionHtmlFr || detail.longDescriptionHtml)
          : detail.longDescriptionHtml)
    : null;

  const localizedSizeLabel = locale === 'en'
    ? (product.sizeLabelEn || product.sizeLabel)
    : locale === 'fr'
      ? (product.sizeLabelFr || product.sizeLabel)
      : product.sizeLabel;

  const localizedFrameLabel = locale === 'en'
    ? (product.frameLabelEn || product.frameLabel)
    : locale === 'fr'
      ? (product.frameLabelFr || product.frameLabel)
      : product.frameLabel;

  let galleryImages: string[] = [];
  if (detail?.galleryImages) {
    try {
      galleryImages = JSON.parse(detail.galleryImages);
    } catch {
      galleryImages = [];
    }
  }
  // Fallback: use product square images if no gallery
  if (galleryImages.length === 0) {
    if (product.imageSquareUrl) {
      galleryImages.push(product.imageSquareUrl);
    }
    if (product.imageSquareUrl2) {
      galleryImages.push(product.imageSquareUrl2);
    }
    if (product.imageSquareUrl3) {
      galleryImages.push(product.imageSquareUrl3);
    }
    if (product.imageWideUrl) {
      galleryImages.push(product.imageWideUrl);
    }
  }

  return {
    id: product.id,
    slug: product.slug,
    name: localizedName,
    detailTitle,
    description: localizedDescription,
    shortDescription,
    longDescriptionHtml,
    galleryImages,
    videoUrl: detail?.videoUrl || null,
    sizeLabel: localizedSizeLabel,
    frameLabel: localizedFrameLabel,
    sizes: sizes.map((size: typeof productSizeSchema.$inferSelect) => ({
      id: size.id,
      slug: size.slug,
      name: locale === 'en' ? (size.nameEn || size.name) : locale === 'fr' ? (size.nameFr || size.name) : size.name,
      dimensions: size.dimensions,
      price: size.priceAmount / 100,
    })),
    frames: frames.map((frame: typeof productFrameSchema.$inferSelect) => ({
      id: frame.id,
      slug: frame.slug,
      name: locale === 'en' ? (frame.nameEn || frame.name) : locale === 'fr' ? (frame.nameFr || frame.name) : frame.name,
      price: frame.priceAmount / 100,
      colorCode: frame.colorCode,
      frameImage: frame.frameImage,
    })),
  };
}
