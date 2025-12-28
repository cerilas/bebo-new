'use client';

import { ChevronLeft, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { getUserOrders } from '@/features/orders/ordersActions';

type Order = Awaited<ReturnType<typeof getUserOrders>>[number];

type OrdersListProps = {
  initialOrders: Order[];
};

const ITEMS_PER_PAGE = 5;

export function OrdersList({ initialOrders }: OrdersListProps) {
  const t = useTranslations('Orders');
  const orders = initialOrders;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = orders.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <ShoppingBag className="mx-auto size-16 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Henüz sipariş yok
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          İlk siparişinizi oluşturmak için ürünlerimize göz atın
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: 'Beklemede',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      },
      success: {
        label: 'Ödendi',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      },
      failed: {
        label: 'Başarısız',
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
    <div className="space-y-6">
      {/* Siparişler Listesi */}
      <div className="space-y-4">
        {currentOrders.map(order => (
          <div
            key={order.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Ürün Görseli */}
              <div className="shrink-0">
                {order.orderType === 'credit'
                  ? (
                      <Image
                        src="/assets/images/birebiro-art-credit.jpg"
                        alt="Tasarım hakkı"
                        width={150}
                        height={150}
                        className="rounded-lg object-cover"
                      />
                    )
                  : order.imageUrl
                    ? (
                        <Image
                          src={order.imageUrl}
                          alt={order.productName || 'Ürün'}
                          width={150}
                          height={150}
                          className="rounded-lg object-cover"
                        />
                      )
                    : (
                        <div className="flex size-[150px] items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Package className="size-12 text-gray-400" />
                        </div>
                      )}
              </div>

              {/* Sipariş Bilgileri */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {order.orderType === 'credit'
                        ? `Tasarım hakkı (${Math.floor((order.paymentAmount || 0) / 100)} Adet)`
                        : order.productName || 'Ürün'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sipariş No:
                      {' '}
                      {order.merchantOid}
                    </p>
                  </div>
                  {getStatusBadge(order.paymentStatus || 'pending')}
                </div>

                {order.orderType === 'credit'
                  ? (
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Tasarım hakkı sayısı:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {Math.floor((order.paymentAmount || 0) / 100)}
                            {' '}
                            Adet
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Tutar:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {((order.paymentAmount || 0) / 100).toFixed(2)}
                            {' '}
                            TL
                          </span>
                        </div>
                      </div>
                    )
                  : (
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Boyut:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {order.sizeName || order.sizeDimensions || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Çerçeve:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {order.frameName || 'Yok'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Tutar:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {((order.paymentAmount || 0) / 100).toFixed(2)}
                            {' '}
                            TL
                          </span>
                        </div>
                      </div>
                    )}

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {order.createdAt && (
                    <span>
                      Sipariş Tarihi:
                      {' '}
                      {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Kargo Takip Bilgisi - Sadece ürün siparişleri için */}
                {order.orderType !== 'credit' && order.trackingNumber && (
                  <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 dark:bg-blue-900/20">
                    <h4 className="mb-1 text-sm font-semibold text-blue-900 dark:text-blue-100">
                      🚚 Kargo Takip
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Takip Kodu:
                      {' '}
                      <span className="font-mono font-semibold">{order.trackingNumber}</span>
                    </p>
                    {order.shippingStatus && (
                      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                        Durum:
                        {' '}
                        {order.shippingStatus === 'preparing' && 'Hazırlanıyor'}
                        {order.shippingStatus === 'shipped' && 'Kargoya Verildi'}
                        {order.shippingStatus === 'delivered' && 'Teslim Edildi'}
                        {order.shippingStatus === 'pending' && 'Beklemede'}
                      </p>
                    )}
                  </div>
                )}

                {/* Teslimat Bilgileri - Sadece ürün siparişleri için */}
                {order.orderType !== 'credit' && order.customerName && (
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Teslimat Bilgileri
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>{order.customerName}</p>
                      <p>{order.customerEmail}</p>
                      <p>{order.customerPhone}</p>
                      <p>{order.customerAddress}</p>
                    </div>
                  </div>
                )}

                {/* Detay Butonu - Sadece ürün siparişleri için */}
                {order.orderType !== 'credit' && order.generationId && (
                  <div className="flex justify-end pt-3">
                    <a
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                    >
                      <Package className="size-4" />
                      {t('detail_button')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="size-4" />
            Önceki
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`size-10 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                  ? 'bg-purple-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Sonraki
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
