'use server';

import { eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import { productSizeFrameSchema } from '@/models/Schema';

export type SizeFrameAvailability = {
  id: number;
  productId: number;
  sizeId: number;
  frameId: number;
  isAvailable: boolean;
};

/**
 * Bir ürünün tüm boyut-çerçeve stok durumlarını getir.
 * Sayfa yüklendiğinde tek seferde çekilir.
 */
export async function getSizeFrameAvailability(
  productId: number,
): Promise<SizeFrameAvailability[]> {
  try {
    const results = await db
      .select({
        id: productSizeFrameSchema.id,
        productId: productSizeFrameSchema.productId,
        sizeId: productSizeFrameSchema.sizeId,
        frameId: productSizeFrameSchema.frameId,
        isAvailable: productSizeFrameSchema.isAvailable,
      })
      .from(productSizeFrameSchema)
      .where(eq(productSizeFrameSchema.productId, productId));

    return results;
  } catch (error) {
    console.error('Error fetching size-frame availability:', error);
    return [];
  }
}
