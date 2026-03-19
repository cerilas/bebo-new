'use client';

import { ArrowLeft, Calendar, Package, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/ProtectedImage';
import type { getOrderDetail } from '@/features/orders/ordersActions';

type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;

type OrderDetailClientProps = {
  orderDetail: NonNullable<OrderDetail>;
};

export default function OrderDetailClient({ orderDetail }: OrderDetailClientProps) {
  const t = useTranslations('Orders');

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: t('status_pending'),
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      },
      success: {
        label: t('status_success'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      },
      failed: {
        label: t('status_failed'),
        className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      },
    };

    const statusInfo = statusMap[status] || statusMap.pending!;

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {t('back_to_orders')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            {t('order_detail_title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('order_number')}
            :
            {' '}
            {orderDetail.merchantOid}
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Your Feelings Section */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-8 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Sparkles className="size-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('your_feelings_title')}
                </h2>
              </div>

              <div className="rounded-xl bg-white/50 p-6 backdrop-blur-sm dark:bg-gray-800/50">
                <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">
                  "
                  {orderDetail.textPrompt || orderDetail.improvedPrompt || 'Belirli bir his belirtilmemiş'}
                  "
                </blockquote>
                {orderDetail.userGenerationIntent && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <strong>
                      {t('purpose')}
                      :
                    </strong>
                    {' '}
                    {orderDetail.userGenerationIntent}
                  </p>
                )}
              </div>
            </div>

            {/* Final Product Preview (with frame) */}
            {orderDetail.finalProductImageUrl && (
              <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Ürün Ön İzleme
                </h3>
                <div className="overflow-hidden rounded-xl">
                  <ProtectedImage
                    src={orderDetail.finalProductImageUrl}
                    alt="Çerçeveli Ürün Ön İzleme"
                    width={600}
                    height={400}
                    className="h-auto w-full object-contain"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {orderDetail.productName && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      {orderDetail.productName}
                    </span>
                  )}
                  {(orderDetail.sizeName || orderDetail.sizeDimensions) && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      📐
                      {' '}
                      {orderDetail.sizeName || orderDetail.sizeDimensions}
                    </span>
                  )}
                  {orderDetail.frameName && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      🖼️
                      {' '}
                      {orderDetail.frameName}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Generated Image */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                {t('generated_design_title')}
              </h3>
              {orderDetail.imageUrl
                ? (
                    <div className="overflow-hidden rounded-xl">
                      <ProtectedImage
                        src={orderDetail.imageUrl}
                        alt="Oluşturulan Tasarım"
                        width={600}
                        height={400}
                        className="h-auto w-full object-cover"
                      />
                    </div>
                  )
                : (
                    <div className="flex h-64 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                      <Package className="size-16 text-gray-400" />
                    </div>
                  )}
            </div>

            {/* Product Details */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Ürün Detayları
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ürün:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {orderDetail.productName || 'Bilinmeyen Ürün'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Boyut:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {orderDetail.sizeName || orderDetail.sizeDimensions || 'Belirtilmemiş'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Çerçeve:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {orderDetail.frameName || 'Çerçevesiz'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tutar:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {((orderDetail.paymentAmount || 0) / 100).toFixed(2)}
                    {' '}
                    TL
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Info */}
          <div className="space-y-6">
            {/* Order Status */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Sipariş Durumu
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Ödeme:</span>
                  {getStatusBadge(orderDetail.paymentStatus || 'pending')}
                </div>
                {orderDetail.shippingStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Kargo:</span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {orderDetail.shippingStatus === 'preparing' && 'Hazırlanıyor'}
                      {orderDetail.shippingStatus === 'shipped' && 'Kargoya Verildi'}
                      {orderDetail.shippingStatus === 'delivered' && 'Teslim Edildi'}
                      {orderDetail.shippingStatus === 'pending' && 'Beklemede'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                <Calendar className="size-5" />
                Sipariş Tarihçesi
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Sipariş Oluşturuldu
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {orderDetail.createdAt
                      && new Date(orderDetail.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {orderDetail.paidAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 size-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Ödeme Tamamlandı
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(orderDetail.paidAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            {orderDetail.customerName && (
              <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                  <User className="size-5" />
                  Teslimat Bilgileri
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Ad Soyad:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {orderDetail.customerName}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">E-posta:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {orderDetail.customerEmail}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Telefon:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {orderDetail.customerPhone}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Adres:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {orderDetail.customerAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Info */}
            {orderDetail.trackingNumber && (
              <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-6 dark:bg-blue-900/20">
                <h4 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
                  🚚 Kargo Takip
                </h4>
                <p className="text-blue-800 dark:text-blue-200">
                  Takip Kodu:
                  <span className="ml-2 font-mono font-semibold">
                    {orderDetail.trackingNumber}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
