'use client';

import { useAuth } from '@clerk/nextjs';
import { AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { AkbankPayHostingRequestFields } from '@/features/payments/akbankUtils';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

import { getUserArtCredits } from '../design/creditsActions';
import { createCreditPurchase, type CreditSettings, getCreditSettings } from './purchaseCreditActions';

export function PurchaseCreditsInterface() {
  const t = useTranslations('PurchaseCredits');
  const locale = useLocale();
  const akbankFormRef = useRef<HTMLFormElement>(null);
  const { isLoaded, userId } = useAuth();

  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [akbankActionUrl, setAkbankActionUrl] = useState<string | null>(null);
  const [akbankFields, setAkbankFields] = useState<AkbankPayHostingRequestFields | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Hata mesajını otomatik temizle
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  // Mevcut kredi miktarını ve ayarları yükle
  useEffect(() => {
    async function loadData() {
      if (!isLoaded) {
        return;
      }

      setIsLoadingSettings(true);

      if (!userId) {
        setCreditSettings({
          pricePerCredit: 100,
          minPurchase: 1,
          maxPurchase: 1000,
          maxUserCredits: null,
          isActive: true,
        });
        setCurrentCredits(0);
        setIsLoadingSettings(false);
        return;
      }

      try {
        const [settings, credits] = await Promise.all([
          getCreditSettings(),
          getUserArtCredits(),
        ]);
        setCreditSettings(settings);
        setCurrentCredits(credits || 0);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Default ayarlar
        setCreditSettings({
          pricePerCredit: 100,
          minPurchase: 1,
          maxPurchase: 1000,
          maxUserCredits: null,
          isActive: true,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    }

    loadData();
  }, [isLoaded, userId]);

  const pricePerCredit = creditSettings?.pricePerCredit || 100;
  const minPurchase = creditSettings?.minPurchase || 1;
  const maxPurchase = creditSettings?.maxPurchase || 1000;
  const maxUserCredits = creditSettings?.maxUserCredits;
  const quickAmounts = [5, 10, 25, 50];

  // Toplam fiyat hesaplama (kuruştan TL'ye çevir)
  const totalPrice = isCustom
    ? ((Number.parseInt(customAmount, 10) || 0) * pricePerCredit) / 100
    : (selectedAmount * pricePerCredit) / 100;

  const currentAmount = isCustom ? Number.parseInt(customAmount, 10) || 0 : selectedAmount;

  const handleQuickSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomInput = (value: string) => {
    setCustomAmount(value);
    setIsCustom(true);
  };

  const handlePurchase = async () => {
    setError(null);

    if (!isLoaded) {
      return;
    }

    if (!userId) {
      setError('Lütfen giriş yapın');
      return;
    }

    // Limit kontrolü
    if (typeof maxUserCredits === 'number' && maxUserCredits > 0) {
      const nextTotal = currentCredits + currentAmount;
      if (nextTotal > maxUserCredits) {
        setError(`${t('max_limit_error', { max: maxUserCredits, current: currentCredits, available: Math.max(0, maxUserCredits - currentCredits) })}`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const amount = isCustom ? Number.parseInt(customAmount, 10) : selectedAmount;

      const result = await createCreditPurchase(amount, locale);

      if (result.success && result.actionUrl && result.fields) {
        setAkbankActionUrl(result.actionUrl);
        setAkbankFields(result.fields);
      } else {
        setError(result.error || 'Ödeme işlemi başlatılamadı');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);

      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsProcessing(false);
    }
  };

  // AKBANK form hazır olduğunda otomatik submit et
  useEffect(() => {
    if (!akbankActionUrl || !akbankFields || !akbankFormRef.current) {
      return;
    }

    akbankFormRef.current.submit();
  }, [akbankActionUrl, akbankFields]);

  // Loading durumu
  if (isLoadingSettings) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="size-12 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('processing')}
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Error Notification */}
        {error && (
          <div className="fixed inset-x-4 top-24 z-[100] flex justify-center sm:inset-x-0">
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 dark:border-red-900/30 dark:bg-gray-900/90">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="max-w-[300px] sm:max-w-md">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('error_title')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-2 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('page_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('page_description')}</p>
        </div>

        {isLoaded && !userId && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Tasarım kredisi satın almak için önce giriş yapmanız gerekiyor.
            </p>
          </div>
        )}

        {/* Exchange Rate Card */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-lg">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:divide-x sm:divide-white/20">
            <div className="text-center">
              <p className="mb-1 text-xs font-medium opacity-80">
                {t('current_rate')}
              </p>
              <p className="text-2xl font-bold">
                {t('credit_price', { price: (pricePerCredit / 100).toFixed(2) })}
              </p>
            </div>
            <div className="text-center sm:pl-4">
              <p className="mb-1 text-xs font-medium opacity-80">
                Mevcut Bakiyeniz
              </p>
              <p className="text-2xl font-bold">
                {currentCredits}
                {' '}
                /
                {maxUserCredits || '∞'}
              </p>
              {maxUserCredits && currentCredits >= maxUserCredits && (
                <p className="mt-1 text-[10px] font-bold text-yellow-300">
                  Limit doldu!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Amount Selection */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('quick_amounts')}
          </label>
          <div className="grid grid-cols-4 gap-3">
            {quickAmounts.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickSelect(amount)}
                className={`rounded-lg border-2 p-4 text-center transition-all ${!isCustom && selectedAmount === amount
                  ? 'border-purple-600 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
                  : 'border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-500'
                }`}
              >
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {amount}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Tasarım hakkı
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('custom_amount')}
          </label>
          <div className="relative">
            <input
              type="number"
              min={minPurchase}
              max={maxPurchase}
              value={customAmount}
              onChange={e => handleCustomInput(e.target.value)}
              placeholder={t('amount_placeholder')}
              className={`w-full rounded-lg border-2 px-4 py-3 transition-all focus:outline-none dark:bg-gray-800 dark:text-gray-100 ${isCustom
                ? 'border-purple-600 dark:border-purple-400'
                : 'border-gray-200 focus:border-purple-400 dark:border-gray-700'
              }`}
            />
            <Sparkles className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-yellow-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('min_purchase', { min: minPurchase })}
            {' • '}
            {t('max_purchase', { max: maxPurchase })}
          </p>
        </div>

        {/* Total Price Display */}
        <div className="mb-8 rounded-xl border-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('amount_label')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isCustom ? Number.parseInt(customAmount, 10) || 0 : selectedAmount}
                {' '}
                Tasarım hakkı
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('total_price')}
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {totalPrice.toFixed(2)}
                {' '}
                TL
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Satın aldığınız Tasarım hakları, hesabınıza anında yüklenecek ve sınırsız
            süre geçerli olacaktır. Her görsel oluşturma işlemi 1 Tasarım hakkı
            tüketir.
          </p>
        </div>

        {/* Purchase Button */}
        <button
          type="button"
          onClick={handlePurchase}
          disabled={totalPrice === 0 || isProcessing || !isLoaded || !userId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="size-6" />
          {isProcessing ? t('processing') : t('buy_button')}
        </button>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Ödeme işleminiz güvenli SSL sertifikası ile korunmaktadır
        </p>

        {akbankFields && akbankActionUrl && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              Güvenli Ödeme
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              AKBANK güvenli ödeme ekranına yönlendiriliyorsunuz...
            </p>
            <form ref={akbankFormRef} action={akbankActionUrl} method="POST">
              {Object.entries(akbankFields).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Ödeme ekranına git
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
