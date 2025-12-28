'use client';

import { CheckCircle, Loader2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

import { processSuccessfulCreditPurchase } from './processCreditsActions';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countdown, setCountdown] = useState(5);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingResult, setProcessingResult] = useState<{
    success: boolean;
    message: string;
    creditsAdded?: number;
  } | null>(null);

  // PayTR'den gelen parametreler
  const merchantOid = searchParams.get('merchant_oid');

  // Kredi yükleme işlemini başlat
  useEffect(() => {
    const processCredits = async () => {
      if (!merchantOid) {
        setProcessingResult({
          success: false,
          message: `Geçersiz ödeme bilgisi - merchant_oid bulunamadı. URL: ${window.location.href}`,
        });
        setIsProcessing(false);
        return;
      }

      try {
        const result = await processSuccessfulCreditPurchase(merchantOid);
        setProcessingResult(result);
      } catch (error) {
        console.error('Credit processing error:', error);
        setProcessingResult({
          success: false,
          message: 'Kredi yükleme sırasında bir hata oluştu',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processCredits();
  }, [merchantOid]);

  // Countdown timer
  useEffect(() => {
    if (isProcessing) {
      return; // İşlem devam ediyorsa countdown başlatma
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/design');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, isProcessing]);

  return (
    <>
      <Navbar />

      <div className="flex h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">

          {/* Loading State */}
          {isProcessing && (
            <>
              <div className="mb-4 flex justify-center">
                <div className="flex size-28 items-center justify-center rounded-full bg-blue-500">
                  <Loader2 className="size-20 animate-spin text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Haklar Yükleniyor...
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Lütfen bekleyiniz, tasarım haklarınız hesabınıza yükleniyor.
              </p>
            </>
          )}

          {/* Success State */}
          {!isProcessing && processingResult?.success && (
            <>
              <div className="mb-4 flex justify-center">
                <div className="flex size-28 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle className="size-20 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Ödeme Başarılı!
              </h2>

              <p className="mb-4 text-gray-600 dark:text-gray-400">
                {processingResult.message}
              </p>

              {processingResult.creditsAdded && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    +
                    {processingResult.creditsAdded}
                    {' '}
                    Tasarım hakkı eklendi!
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {countdown}
                {' '}
                saniye sonra tasarım sayfasına yönlendirileceksiniz...
              </p>
            </>
          )}

          {/* Error State */}
          {!isProcessing && processingResult && !processingResult.success && (
            <>
              <div className="mb-4 flex justify-center">
                <div className="flex size-28 items-center justify-center rounded-full bg-red-500">
                  <X className="size-20 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                İşlem Başarısız
              </h2>

              <p className="mb-6 text-gray-600 dark:text-gray-400">
                {processingResult.message}
              </p>

              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {countdown}
                  {' '}
                  saniye sonra tasarım sayfasına yönlendirileceksiniz...
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

export function PurchaseCreditsSuccess() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="size-12 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      )}
    >
      <SuccessContent />
    </Suspense>
  );
}
