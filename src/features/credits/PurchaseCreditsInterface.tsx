'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { AlertCircle, CreditCard, Info, Shield, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { type City, type District, getCities, getDistricts } from '@/features/checkout/geliverActions';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';

import { getUserArtCredits } from '../design/creditsActions';
import { createCreditPurchase, type CreditSettings, getCreditSettings } from './purchaseCreditActions';

export function PurchaseCreditsInterface() {
  const t = useTranslations('PurchaseCredits');
  const locale = useLocale();
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [akbankActionUrl, setAkbankActionUrl] = useState<string | null>(null);
  const [akbankFields, setAkbankFields] = useState<Record<string, string> | null>(null);
  const akbankFormRef = useRef<HTMLFormElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wantsCorporateInvoice, setWantsCorporateInvoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | null>(null);
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Hata mesajını otomatik temizle
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  useEffect(() => {
    if (akbankActionUrl && akbankFields && akbankFormRef.current) {
      akbankFormRef.current.submit();
    }
  }, [akbankActionUrl, akbankFields]);

  useEffect(() => {
    const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    const email = user?.primaryEmailAddress?.emailAddress || '';

    if (fullName) {
      setCustomerName(prev => prev || fullName);
    }

    if (email) {
      setCustomerEmail(prev => prev || email);
    }
  }, [user]);

  useEffect(() => {
    async function loadCities() {
      const result = await getCities();
      if (result.success && result.data) {
        setCities(result.data);
      }
    }

    loadCities();
  }, []);

  useEffect(() => {
    async function loadDistricts() {
      if (!customerCity) {
        setDistricts([]);
        setCustomerDistrict('');
        return;
      }

      const result = await getDistricts(customerCity);
      if (result.success && result.data) {
        setDistricts(result.data);
      } else {
        setDistricts([]);
      }

      setCustomerDistrict('');
    }

    loadDistricts();
  }, [customerCity]);

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
  const remainingByUserLimit = typeof maxUserCredits === 'number' && maxUserCredits > 0
    ? Math.max(0, maxUserCredits - currentCredits)
    : null;
  const effectiveMaxPurchase = remainingByUserLimit === null
    ? maxPurchase
    : Math.min(maxPurchase, remainingByUserLimit);
  const quickAmounts = useMemo(() => {
    const baseQuickAmounts = [5, 10, 25, 50];
    const dynamicAmounts = baseQuickAmounts.filter(amount => amount >= minPurchase && amount <= effectiveMaxPurchase);

    if (effectiveMaxPurchase >= minPurchase && !dynamicAmounts.includes(effectiveMaxPurchase)) {
      dynamicAmounts.push(effectiveMaxPurchase);
    }

    return Array.from(new Set(dynamicAmounts)).sort((a, b) => a - b);
  }, [effectiveMaxPurchase, minPurchase]);

  useEffect(() => {
    if (effectiveMaxPurchase < minPurchase) {
      setSelectedAmount(0);
      setCustomAmount('');
      setIsCustom(false);
      return;
    }

    if (!isCustom) {
      if (selectedAmount >= minPurchase && selectedAmount <= effectiveMaxPurchase) {
        return;
      }

      const fallbackAmount = quickAmounts[quickAmounts.length - 1] || effectiveMaxPurchase;
      setSelectedAmount(fallbackAmount);
    }
  }, [effectiveMaxPurchase, isCustom, minPurchase, quickAmounts, selectedAmount]);

  // Toplam fiyat hesaplama (kuruştan TL'ye çevir)
  const totalPrice = isCustom
    ? ((Number.parseInt(customAmount, 10) || 0) * pricePerCredit) / 100
    : (selectedAmount * pricePerCredit) / 100;

  const currentAmount = isCustom ? Number.parseInt(customAmount, 10) || 0 : selectedAmount;
  const normalizedCardNumber = cardNumber.replace(/\s/g, '');
  const normalizedCvv = cardCvv.replace(/\D/g, '');
  const cardExpiryValid = /^(?:0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const isBillingInfoComplete = Boolean(
    customerName.trim()
    && customerEmail.trim()
    && customerPhone.trim()
    && customerAddress.trim()
    && customerCity
    && customerDistrict,
  );
  const isCorporateInfoComplete = !wantsCorporateInvoice || Boolean(
    companyName.trim()
    && taxNumber.trim()
    && taxOffice.trim()
    && companyAddress.trim(),
  );
  const isPaymentInfoComplete = paymentMethod === 'card' && Boolean(
    cardHolderName.trim()
    && normalizedCardNumber.length >= 15
    && cardExpiryValid
    && normalizedCvv.length >= 3,
  );
  const isPurchaseFormReady = Boolean(
    isLoaded
    && userId
    && totalPrice > 0
    && effectiveMaxPurchase >= minPurchase
    && isBillingInfoComplete
    && isCorporateInfoComplete
    && isPaymentInfoComplete,
  );

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

    if (effectiveMaxPurchase < minPurchase) {
      setError(t('purchase_limit_reached'));
      return;
    }

    if (!customerName || !customerEmail || !customerPhone || !customerAddress || !customerCity || !customerDistrict) {
      setError(locale === 'en'
        ? 'Please fill in all billing and address fields'
        : locale === 'fr'
          ? 'Veuillez remplir tous les champs de facturation et d\'adresse'
          : 'Lütfen tüm fatura ve adres alanlarını doldurun');
      return;
    }

    if (wantsCorporateInvoice && (!companyName || !taxNumber || !taxOffice || !companyAddress)) {
      setError(locale === 'en'
        ? 'Please fill in all corporate invoice fields'
        : locale === 'fr'
          ? 'Veuillez remplir tous les champs de facture entreprise'
          : 'Lütfen tüm kurumsal fatura alanlarını doldurun');
      return;
    }

    if (paymentMethod !== 'card') {
      setError(locale === 'en'
        ? 'Please select a payment method'
        : locale === 'fr'
          ? 'Veuillez sélectionner un mode de paiement'
          : 'Lütfen bir ödeme yöntemi seçin');
      return;
    }

    if (!cardHolderName || normalizedCardNumber.length < 15 || !cardExpiryValid || normalizedCvv.length < 3) {
      setError(locale === 'en'
        ? 'Please enter valid card information'
        : locale === 'fr'
          ? 'Veuillez saisir des informations de carte valides'
          : 'Lütfen geçerli kart bilgileri girin');
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

      const selectedCity = cities.find(city => city.cityCode === customerCity);
      const selectedDistrict = districts.find(district => district.districtID.toString() === customerDistrict);

      const result = await createCreditPurchase(amount, locale, {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity: selectedCity?.name || customerCity,
        cityCode: customerCity,
        customerDistrict: selectedDistrict?.name || customerDistrict,
        districtId: customerDistrict ? Number.parseInt(customerDistrict, 10) : undefined,
        isCorporateInvoice: wantsCorporateInvoice,
        companyName: wantsCorporateInvoice ? companyName : undefined,
        taxNumber: wantsCorporateInvoice ? taxNumber : undefined,
        taxOffice: wantsCorporateInvoice ? taxOffice : undefined,
        companyAddress: wantsCorporateInvoice ? companyAddress : undefined,
        paymentType: 'card',
        cardHolderName,
        cardNumber: normalizedCardNumber,
        cardExpiry,
        cardCvv: normalizedCvv,
      });

      if (result.success && result.akbankActionUrl && result.akbankFields) {
        setAkbankActionUrl(result.akbankActionUrl);
        setAkbankFields(result.akbankFields as Record<string, string>);
        return;
      }

      if (result.redirectPath) {
        const params = new URLSearchParams();

        if (result.merchantOid) {
          params.set('merchant_oid', result.merchantOid);
        }

        if (!result.success && result.error) {
          params.set('reason', result.error);
        }

        const query = params.toString();
        const redirectUrl = query ? `${result.redirectPath}?${query}` : result.redirectPath;
        router.push(redirectUrl);
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
      <div className="mx-auto max-w-4xl px-4 pb-40 pt-14 sm:pb-44 sm:pt-16">
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

        {akbankActionUrl && akbankFields && (
          <form ref={akbankFormRef} action={akbankActionUrl} method="POST" className="hidden">
            {Object.entries(akbankFields).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
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
          {quickAmounts.length > 0
            ? (
                <div className={`grid gap-3 ${quickAmounts.length >= 4 ? 'grid-cols-4' : quickAmounts.length === 3 ? 'grid-cols-3' : quickAmounts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
              )
            : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  {t('purchase_limit_reached')}
                </div>
              )}
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
              max={Math.max(minPurchase, effectiveMaxPurchase)}
              value={customAmount}
              onChange={e => handleCustomInput(e.target.value)}
              placeholder={t('amount_placeholder')}
              disabled={effectiveMaxPurchase < minPurchase}
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
            {t('max_purchase', { max: effectiveMaxPurchase })}
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {locale === 'en' ? 'Billing Information' : locale === 'fr' ? 'Informations de facturation' : 'Fatura Bilgileri'}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="customer-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === 'en' ? 'Full Name' : locale === 'fr' ? 'Nom complet' : 'Ad Soyad'}
              </label>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="customer-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-posta
              </label>
              <input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="customer-phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === 'en' ? 'Phone' : locale === 'fr' ? 'Téléphone' : 'Telefon'}
              </label>
              <input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="customer-city" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === 'en' ? 'City' : locale === 'fr' ? 'Ville' : 'İl'}
              </label>
              <select
                id="customer-city"
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{locale === 'en' ? 'Select city' : locale === 'fr' ? 'Sélectionnez une ville' : 'İl seçin'}</option>
                {cities.map(city => (
                  <option key={city.cityCode} value={city.cityCode}>{city.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="customer-district" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === 'en' ? 'District' : locale === 'fr' ? 'District' : 'İlçe'}
              </label>
              <select
                id="customer-district"
                value={customerDistrict}
                onChange={e => setCustomerDistrict(e.target.value)}
                disabled={!customerCity || districts.length === 0}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{locale === 'en' ? 'Select district' : locale === 'fr' ? 'Sélectionnez un district' : 'İlçe seçin'}</option>
                {districts.map(district => (
                  <option key={district.districtID} value={district.districtID.toString()}>{district.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="customer-address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === 'en' ? 'Address' : locale === 'fr' ? 'Adresse' : 'Adres'}
              </label>
              <textarea
                id="customer-address"
                rows={3}
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={wantsCorporateInvoice}
                onChange={e => setWantsCorporateInvoice(e.target.checked)}
                className="size-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              {locale === 'en' ? 'I want a corporate invoice' : locale === 'fr' ? 'Je veux une facture entreprise' : 'Kurumsal fatura istiyorum'}
            </label>

            {wantsCorporateInvoice && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="company-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Company Name' : locale === 'fr' ? 'Nom de l\'entreprise' : 'Şirket Ünvanı'}
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="tax-number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Tax Number' : locale === 'fr' ? 'Numéro fiscal' : 'Vergi Numarası'}
                  </label>
                  <input
                    id="tax-number"
                    type="text"
                    value={taxNumber}
                    onChange={e => setTaxNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="tax-office" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Tax Office' : locale === 'fr' ? 'Centre des impôts' : 'Vergi Dairesi'}
                  </label>
                  <input
                    id="tax-office"
                    type="text"
                    value={taxOffice}
                    onChange={e => setTaxOffice(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="company-address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Company Address' : locale === 'fr' ? 'Adresse de l\'entreprise' : 'Şirket Adresi'}
                  </label>
                  <textarea
                    id="company-address"
                    rows={2}
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {locale === 'en' ? 'Payment Method' : locale === 'fr' ? 'Mode de paiement' : 'Ödeme Yöntemi'}
          </h2>

          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${paymentMethod === 'card'
              ? 'border-purple-600 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
              : 'border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {locale === 'en' ? 'Credit / Debit Card' : locale === 'fr' ? 'Carte de crédit / débit' : 'Kredi / Banka Kartı'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {locale === 'en' ? 'Enter your card details securely' : locale === 'fr' ? 'Saisissez vos informations de carte en toute sécurité' : 'Kart bilgilerinizi güvenle girin'}
                </p>
              </div>
            </div>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${paymentMethod === 'card'
              ? 'mt-3 grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-900/40 dark:bg-purple-900/10">
                <div>
                  <label htmlFor="card-holder-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Card Holder Name' : locale === 'fr' ? 'Nom du titulaire' : 'Kart Üzerindeki İsim'}
                  </label>
                  <input
                    id="card-holder-name"
                    type="text"
                    value={cardHolderName}
                    onChange={e => setCardHolderName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="card-number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'en' ? 'Card Number' : locale === 'fr' ? 'Numéro de carte' : 'Kart Numarası'}
                  </label>
                  <input
                    id="card-number"
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 19);
                      const formatted = digitsOnly.replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(formatted);
                    }}
                    placeholder="0000 0000 0000 0000"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="card-expiry" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {locale === 'en' ? 'Expiry Date' : locale === 'fr' ? 'Date d\'expiration' : 'Son Kullanma Tarihi'}
                    </label>
                    <input
                      id="card-expiry"
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const formatted = digitsOnly.length > 2
                          ? `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
                          : digitsOnly;
                        setCardExpiry(formatted);
                      }}
                      placeholder="MM/YY"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="card-cvv" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CVV
                    </label>
                    <input
                      id="card-cvv"
                      type="password"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Shield className="size-4 text-green-600" />
            <span>
              {locale === 'en' ? 'Your payment is protected with SSL encryption' : locale === 'fr' ? 'Votre paiement est protégé par un chiffrement SSL' : 'Ödemeniz SSL şifreleme ile korunur'}
            </span>
          </div>
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

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          <div className="mx-auto w-full max-w-4xl px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            {/* Purchase Button */}
            <button
              type="button"
              onClick={handlePurchase}
              disabled={!isPurchaseFormReady || isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="size-6" />
              {isProcessing ? t('processing') : t('buy_button')}
            </button>

            {/* Footer Note */}
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              Ödeme işleminiz güvenli SSL sertifikası ile korunmaktadır
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
