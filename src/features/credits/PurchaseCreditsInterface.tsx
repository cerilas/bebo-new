'use client';

import { useUser } from '@clerk/nextjs';
import { Info, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

import { createCreditPurchase, type CreditSettings, getCreditSettings } from './purchaseCreditActions';

export function PurchaseCreditsInterface() {
  const t = useTranslations('PurchaseCredits');
  const locale = useLocale();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useUser();

  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [merchantOid, setMerchantOid] = useState<string | null>(null);

  // Kredi ayarlarını yükle
  useEffect(() => {
    async function loadSettings() {
      setIsLoadingSettings(true);
      try {
        const settings = await getCreditSettings();
        setCreditSettings(settings);
      } catch (error) {
        console.error('Failed to load credit settings:', error);
        // Default ayarlar
        setCreditSettings({
          pricePerCredit: 100,
          minPurchase: 1,
          maxPurchase: 1000,
          isActive: true,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    }

    loadSettings();
  }, []);

  const pricePerCredit = creditSettings?.pricePerCredit || 100;
  const minPurchase = creditSettings?.minPurchase || 1;
  const maxPurchase = creditSettings?.maxPurchase || 1000;
  const quickAmounts = [5, 10, 25, 50];

  // Toplam fiyat hesaplama (kuruştan TL'ye çevir)
  const totalPrice = isCustom
    ? ((Number.parseInt(customAmount, 10) || 0) * pricePerCredit) / 100
    : (selectedAmount * pricePerCredit) / 100;

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
    if (!user?.id) {
      alert('Lütfen giriş yapın');
      return;
    }

    // Email kontrolü
    const userEmail = user.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      alert('Email adresi bulunamadı. Lütfen hesap ayarlarınızı kontrol edin.');
      return;
    }

    setIsProcessing(true);

    try {
      const amount = isCustom ? Number.parseInt(customAmount, 10) : selectedAmount;

      // Kullanıcı IP'sini al
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const userIp = ipData.ip;

      // PayTR token al - userId ve email'i geçiyoruz, ve LOCALE
      const result = await createCreditPurchase(user.id, userEmail, amount, userIp, locale);

      if (result.success && result.token) {
        setPaytrToken(result.token);
        setMerchantOid(result.merchantOid || null);
      } else {
        alert(result.error || 'Ödeme işlemi başlatılamadı');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);

      alert('Bir hata oluştu');
      setIsProcessing(false);
    }
  };

  // PayTR callback dinleyici
  useEffect(() => {
    if (!paytrToken) {
      return;
    }

    // PayTR iframe'e scroll yap
    if (iframeRef.current) {
      setTimeout(() => {
        iframeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 300); // iframe render olması için kısa bir gecikme
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://www.paytr.com') {
        if (event.data === 'success' && merchantOid) {
          router.push(`/${locale}/purchase-credits/success?merchant_oid=${merchantOid}`);
        } else if (event.data === 'fail') {
          router.push(`/${locale}/purchase-credits/failed`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [paytrToken, merchantOid, router, locale]);

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
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('page_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('page_description')}</p>
        </div>

        {/* Exchange Rate Card */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-lg">
          <div className="text-center">
            <p className="mb-2 text-sm font-medium opacity-90">
              {t('current_rate')}
            </p>
            <p className="text-4xl font-bold">
              {t('credit_price', { price: (pricePerCredit / 100).toFixed(2) })}
            </p>
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
          disabled={totalPrice === 0 || isProcessing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="size-6" />
          {isProcessing ? t('processing') : t('buy_button')}
        </button>

        {/* Footer Note */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Ödeme işleminiz güvenli SSL sertifikası ile korunmaktadır
        </p>

        {/* PayTR Ödeme Formu */}
        {paytrToken && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800" style={{ minHeight: '1000px' }}>
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
              Güvenli Ödeme
            </h2>
            <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
            <div className="overflow-hidden rounded-lg" style={{ minHeight: '1000px' }}>
              <iframe
                ref={iframeRef}
                src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
                id="paytriframe"
                frameBorder="0"
                scrolling="no"
                style={{ width: '100%', height: 'auto', minHeight: '1000px' }}
                className="block"
                title="PayTR Payment"
              />
            </div>
            <script
              dangerouslySetInnerHTML={{
                __html: `iFrameResize({},'#paytriframe');`,
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
