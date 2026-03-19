'use server';

import { and, eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { productFrameSchema, productSchema, productSizeSchema } from '@/models/Schema';

export type ProductPriceData = {
  productId: number; // Database ID
  productName: string;
  sizeId: number; // Database ID
  sizeName: string;
  sizeDimensions: string; // e.g. "30x40"
  sizePrice: number; // in cents
  frameId: number; // Database ID
  frameName: string;
  framePrice: number; // in cents
  totalPrice: number; // in cents
  // Mockup data (landscape - default)
  mockupTemplate: string | null;
  mockupConfig: string | null;
  // Mockup data (portrait/vertical)
  mockupTemplateVertical: string | null;
  mockupConfigVertical: string | null;
};

export async function getProductPricing(
  productSlug: string,
  sizeSlug: string,
  frameSlug: string,
): Promise<{ success: boolean; data?: ProductPriceData; error?: string }> {
  try {
    // Get product
    const product = await db
      .select()
      .from(productSchema)
      .where(eq(productSchema.slug, productSlug))
      .limit(1);

    if (!product || product.length === 0) {
      return { success: false, error: 'Product not found' };
    }

    const productData = product[0]!;

    // Get size pricing
    const size = await db
      .select()
      .from(productSizeSchema)
      .where(
        and(
          eq(productSizeSchema.productId, productData.id),
          eq(productSizeSchema.slug, sizeSlug),
        ),
      )
      .limit(1);

    if (!size || size.length === 0) {
      return { success: false, error: 'Size not found' };
    }

    const sizeData = size[0]!;

    // Get frame pricing
    const frame = await db
      .select()
      .from(productFrameSchema)
      .where(
        and(
          eq(productFrameSchema.productId, productData.id),
          eq(productFrameSchema.slug, frameSlug),
        ),
      )
      .limit(1);

    if (!frame || frame.length === 0) {
      return { success: false, error: 'Frame not found' };
    }

    const frameData = frame[0]!;

    // Calculate total
    const totalPrice = sizeData.priceAmount + frameData.priceAmount;

    const result = {
      productId: productData.id,
      productName: productData.name,
      sizeId: sizeData.id,
      sizeName: sizeData.name,
      sizeDimensions: sizeData.dimensions,
      sizePrice: sizeData.priceAmount,
      frameId: frameData.id,
      frameName: frameData.name,
      framePrice: frameData.priceAmount,
      totalPrice,
      // Mockup data
      mockupTemplate: frameData.mockupTemplate,
      mockupConfig: frameData.mockupConfig,
      mockupTemplateVertical: frameData.mockupTemplateVertical,
      mockupConfigVertical: frameData.mockupConfigVertical,
    };

    console.log('getProductPricing result:', result);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching product pricing:', error);
    return { success: false, error: 'Failed to fetch pricing data' };
  }
}
