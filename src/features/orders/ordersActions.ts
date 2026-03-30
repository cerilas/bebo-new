'use server';

import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/libs/DB';
import {
  generatedImageSchema,
  orderSchema,
  productFrameSchema,
  productSchema,
  productSizeSchema,
} from '@/models/Schema';

export async function getUserOrders() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    const orders = await db
      .select({
        id: orderSchema.id,
        userId: orderSchema.userId,
        generationId: orderSchema.generationId,
        imageUrl: orderSchema.imageUrl,
        finalProductImageUrl: orderSchema.finalProductImageUrl,
        merchantOid: orderSchema.merchantOid,
        paymentAmount: orderSchema.paymentAmount,
        totalAmount: orderSchema.totalAmount,
        currency: orderSchema.currency,
        paymentStatus: orderSchema.paymentStatus,
        paymentType: orderSchema.paymentType,
        orderType: orderSchema.orderType, // Kredi vs ürün siparişi için
        customerName: orderSchema.customerName,
        customerEmail: orderSchema.customerEmail,
        customerPhone: orderSchema.customerPhone,
        customerAddress: orderSchema.customerAddress,
        shippingStatus: orderSchema.shippingStatus,
        trackingNumber: orderSchema.trackingNumber,
        paidAt: orderSchema.paidAt,
        createdAt: orderSchema.createdAt,
        updatedAt: orderSchema.updatedAt,
        // Product info
        productId: productSchema.id,
        productName: productSchema.name,
        // Size info
        productSizeId: productSizeSchema.id,
        sizeName: productSizeSchema.name,
        sizeDimensions: productSizeSchema.dimensions,
        // Frame info
        productFrameId: productFrameSchema.id,
        frameName: productFrameSchema.name,
        // Preview
        previewImageUrl: orderSchema.previewImageUrl,
      })
      .from(orderSchema)
      .leftJoin(productSchema, eq(orderSchema.productId, productSchema.id))
      .leftJoin(
        productSizeSchema,
        eq(orderSchema.productSizeId, productSizeSchema.id),
      )
      .leftJoin(
        productFrameSchema,
        eq(orderSchema.productFrameId, productFrameSchema.id),
      )
      .where(and(eq(orderSchema.userId, userId), eq(orderSchema.paymentStatus, 'success')))
      .orderBy(desc(orderSchema.createdAt));

    return orders;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Failed to fetch orders');
  }
}

export async function getOrderDetail(orderId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const orderIdNumber = Number.parseInt(orderId, 10);
  if (Number.isNaN(orderIdNumber)) {
    throw new TypeError('Invalid order ID');
  }

  try {
    const [orderDetail] = await db
      .select({
        id: orderSchema.id,
        userId: orderSchema.userId,
        generationId: orderSchema.generationId,
        imageUrl: orderSchema.imageUrl,
        finalProductImageUrl: orderSchema.finalProductImageUrl,
        merchantOid: orderSchema.merchantOid,
        paymentAmount: orderSchema.paymentAmount,
        totalAmount: orderSchema.totalAmount,
        currency: orderSchema.currency,
        paymentStatus: orderSchema.paymentStatus,
        paymentType: orderSchema.paymentType,
        orderType: orderSchema.orderType,
        customerName: orderSchema.customerName,
        customerEmail: orderSchema.customerEmail,
        customerPhone: orderSchema.customerPhone,
        customerAddress: orderSchema.customerAddress,
        shippingStatus: orderSchema.shippingStatus,
        trackingNumber: orderSchema.trackingNumber,
        paidAt: orderSchema.paidAt,
        createdAt: orderSchema.createdAt,
        updatedAt: orderSchema.updatedAt,
        // Product info
        productId: productSchema.id,
        productName: productSchema.name,
        // Size info
        productSizeId: productSizeSchema.id,
        sizeName: productSizeSchema.name,
        sizeDimensions: productSizeSchema.dimensions,
        // Preview & transform
        previewImageUrl: orderSchema.previewImageUrl,
        // Frame info
        productFrameId: productFrameSchema.id,
        frameName: productFrameSchema.name,
        // Generation info
        textPrompt: generatedImageSchema.textPrompt,
        improvedPrompt: generatedImageSchema.improvedPrompt,
        userGenerationIntent: generatedImageSchema.userGenerationIntent,
      })
      .from(orderSchema)
      .leftJoin(productSchema, eq(orderSchema.productId, productSchema.id))
      .leftJoin(
        productSizeSchema,
        eq(orderSchema.productSizeId, productSizeSchema.id),
      )
      .leftJoin(
        productFrameSchema,
        eq(orderSchema.productFrameId, productFrameSchema.id),
      )
      .leftJoin(
        generatedImageSchema,
        eq(orderSchema.generationId, generatedImageSchema.generationId),
      )
      .where(eq(orderSchema.id, orderIdNumber))
      .limit(1);

    // Kullanıcının kendi siparişi olduğunu kontrol et
    if (!orderDetail || orderDetail.userId !== userId) {
      return null;
    }

    return orderDetail;
  } catch (error) {
    console.error('Error fetching order detail:', error);
    throw new Error('Failed to fetch order detail');
  }
}
