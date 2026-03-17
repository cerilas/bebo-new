'use client';

import { useUser } from '@clerk/nextjs';
import { AlertCircle, ArrowLeft, ChevronDown, CreditCard, Loader2, Package, Shield, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { MockupPreview } from '@/components/MockupPreview';
import { ProtectedImage } from '@/components/ProtectedImage';
import { type City, type District, getCities, getDistricts } from '@/features/checkout/geliverActions';
import { type GeneratedImageResponse, getGeneratedImage, getUserGeneratedImages } from '@/features/design/chatActions';
import { getProductPricing, type ProductPriceData } from '@/features/design/productPriceActions';
import { parseMockupConfig } from '@/utils/mockupUtils';

import { processAkbankProductPayment } from './paytrActions';

type CheckoutInterfaceProps = {
  locale: string;
  generationId?: string;
  imageUrl?: string;
  productSlug?: string;
  sizeSlug?: string;
  frameSlug?: string;
  orientation?: 'landscape' | 'portrait';
  imageTransform?: { x: number; y: number; scale: number };
};

export function CheckoutInterface({
  locale,
  generationId: propGenerationId,
  imageUrl,
  productSlug: propProductSlug,
  sizeSlug: propSizeSlug,
  frameSlug: propFrameSlug,
  orientation: propOrientation,
  imageTransform: propImageTransform,
}: CheckoutInterfaceProps) {
  const t = useTranslations('Checkout');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  // URL parametreleri (fallback olarak)
  const generationId = propGenerationId || searchParams.get('generationId') || '';
  const productSlug = propProductSlug || searchParams.get('product') || '';
  const sizeSlug = propSizeSlug || searchParams.get('size') || '';
  const frameSlug = propFrameSlug || searchParams.get('frame') || '';
  const orientation = propOrientation || (searchParams.get('orientation') as 'landscape' | 'portrait') || 'landscape';

  // State
  const [imageData, setImageData] = useState<GeneratedImageResponse | null>(null);
  const [priceData, setPriceData] = useState<ProductPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hata mesajını otomatik temizle
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(user?.primaryEmailAddress?.emailAddress || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
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

  // Geliver Address State
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Load cities on mount
  useEffect(() => {
    async function loadCities() {
      const result = await getCities();
      if (result.success && result.data) {
        setCities(result.data);
      }
    }
    loadCities();
  }, []);

  // Load districts when city changes
  useEffect(() => {
    async function loadDistricts() {
      if (!customerCity) {
        setDistricts([]);
        setCustomerDistrict(''); // Clear district if city is cleared
        return;
      }
      const result = await getDistricts(customerCity);
      if (result.success && result.data) {
        setDistricts(result.data);
      }
    }
    loadDistricts();
  }, [customerCity]);

  // Görsel ve fiyat verilerini yükle
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Görseli yükle
        if (imageUrl) {
          // User uploaded image - create mock data
          const mockImageData: GeneratedImageResponse = {
            id: Date.now(),
            user_id: '',
            chat_session_id: '',
            generation_id: `user-upload-${Date.now()}`,
            product_id: 0,
            product_size_id: 0,
            product_frame_id: 0,
            text_prompt: 'Kullanıcı tarafından yüklenen görsel',
            improved_prompt: '',
            image_url: imageUrl,
            uploaded_image_url: imageUrl,
            user_generation_intent: '',
            is_generate_mode: false,
            credit_used: 0,
            is_selected: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setImageData(mockImageData);
        } else if (generationId) {
          // Generated image
          const userImagesResult = await getUserGeneratedImages();
          if (userImagesResult.success && userImagesResult.data) {
            const matchedImage = userImagesResult.data.find(
              img => img.generation_id === generationId,
            );
            if (matchedImage) {
              setImageData(matchedImage);
            } else {
              const result = await getGeneratedImage(generationId);
              if (result.success && result.data) {
                setImageData(Array.isArray(result.data) ? result.data[0]! : result.data);
              }
            }
          }
        }

        // Fiyatları yükle
        const pricingResult = await getProductPricing(productSlug, sizeSlug, frameSlug);
        if (pricingResult.success && pricingResult.data) {
          setPriceData(pricingResult.data);
          console.log('Price Data Loaded:', pricingResult.data);
        } else {
          console.error('Failed to load pricing:', pricingResult.error);
        }
      } catch (error) {
        console.error('Error loading checkout data:', error);
      }
      setIsLoading(false);
    }

    loadData();
  }, [generationId, imageUrl, productSlug, sizeSlug, frameSlug]);

  // Kullanıcı email'ini otomatik doldur
  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setCustomerEmail(user.primaryEmailAddress.emailAddress);
    }
    if (user?.fullName) {
      setCustomerName(user.fullName);
    }
  }, [user]);

  // Ödeme işlemini başlat
  const handleCompletePayment = async () => {
    setError(null);
    if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
      setError(t('fill_all_fields'));
      return;
    }

    if (!priceData || !imageData) {
      console.error('Missing data:', { priceData, imageData });
      setError('Ürün bilgileri yüklenemedi');
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

    const normalizedCardNumber = cardNumber.replace(/\s/g, '');
    const normalizedCvv = cardCvv.replace(/\D/g, '');
    const cardExpiryValid = /^(?:0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);

    if (!cardHolderName || normalizedCardNumber.length < 15 || !cardExpiryValid || normalizedCvv.length < 3) {
      setError(locale === 'en'
        ? 'Please enter valid card information'
        : locale === 'fr'
          ? 'Veuillez saisir des informations de carte valides'
          : 'Lütfen geçerli kart bilgileri girin');
      return;
    }

    // ID'leri kontrol et
    if (!priceData.productId || !priceData.sizeId || !priceData.frameId) {
      console.error('Missing product IDs:', {
        productId: priceData.productId,
        sizeId: priceData.sizeId,
        frameId: priceData.frameId,
      });
      setError('Ürün bilgileri eksik. Lütfen sayfayı yenileyin.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Sending to AKBANK:', {
        productId: priceData.productId,
        sizeId: priceData.sizeId,
        frameId: priceData.frameId,
        paymentAmount: priceData.totalPrice,
        imageUrl: imageData.image_url,
      });

      // Resolve city/district names
      const selectedCity = cities.find(c => c.cityCode === customerCity);
      const selectedDistrict = districts.find(d => d.districtID.toString() === customerDistrict);

      const cityName = selectedCity?.name || customerCity;
      const districtName = selectedDistrict?.name || customerDistrict;

      const result = await processAkbankProductPayment({
        generationId,
        imageUrl: imageData.image_url,
        productId: priceData.productId,
        productSizeId: priceData.sizeId,
        productFrameId: priceData.frameId,
        paymentAmount: priceData.totalPrice,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerCity: cityName,
        cityCode: customerCity, // Send code
        customerDistrict: districtName,
        districtId: customerDistrict ? Number.parseInt(customerDistrict) : undefined, // Send ID
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
        orientation,
        imageTransform: propImageTransform, // Görsel konumlandırma/crop bilgisi
        locale,
      });

      if (result.redirectPath) {
        const redirectUrl = result.merchantOid
          ? `${result.redirectPath}?merchant_oid=${encodeURIComponent(result.merchantOid)}`
          : result.redirectPath;
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto size-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('processing_payment')}</p>
        </div>
      </div>
    );
  }

  if (!imageData || !priceData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ürün bulunamadı</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-purple-600 hover:underline"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-5" />
          {t('back_to_preview')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('page_title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('page_description')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Sol: Form ve Ödeme */}
        <div className="space-y-6">
          {/* Müşteri Bilgileri */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Package className="size-6 text-purple-600" />
              {t('customer_information')}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="customer-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('full_name')}
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder={t('full_name_placeholder')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="customer-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('email')}
                </label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="customer-phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('phone')}
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder={t('phone_placeholder')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="customer-city" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    İl
                  </label>
                  <div className="relative">
                    <select
                      id="customer-city"
                      value={customerCity}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        setCustomerCity(selectedCode);
                        setCustomerDistrict('');
                      }}
                      className="w-full appearance-none rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">İl Seçiniz</option>
                      {cities.map(city => (
                        <option key={city.cityCode} value={city.cityCode}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-district" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    İlçe
                  </label>
                  <div className="relative">
                    <select
                      id="customer-district"
                      value={customerDistrict}
                      onChange={e => setCustomerDistrict(e.target.value)}
                      disabled={!customerCity}
                      className="w-full appearance-none rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">İlçe Seçiniz</option>
                      {districts.map(district => (
                        <option key={district.districtID} value={district.districtID.toString()}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="customer-address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('address')}
                </label>
                <textarea
                  id="customer-address"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder={t('address_placeholder')}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={wantsCorporateInvoice}
                    onChange={e => setWantsCorporateInvoice(e.target.checked)}
                    className="size-5 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kurumsal Fatura İstiyorum
                  </span>
                </label>
              </div>

              {wantsCorporateInvoice && (
                <div className="space-y-4 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/10">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Kurumsal Fatura Bilgileri
                  </h3>

                  <div>
                    <label htmlFor="company-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ünvan (Şirket Adı)
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Örn: ABC Teknoloji A.Ş."
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="tax-number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Vergi Kimlik No
                      </label>
                      <input
                        id="tax-number"
                        type="text"
                        value={taxNumber}
                        onChange={e => setTaxNumber(e.target.value)}
                        placeholder="10 haneli numara"
                        maxLength={10}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="tax-office" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Vergi Dairesi
                      </label>
                      <input
                        id="tax-office"
                        type="text"
                        value={taxOffice}
                        onChange={e => setTaxOffice(e.target.value)}
                        placeholder="Örn: Kadıköy"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company-address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Şirket Adresi
                    </label>
                    <textarea
                      id="company-address"
                      value={companyAddress}
                      onChange={e => setCompanyAddress(e.target.value)}
                      placeholder="Şirket fatura adresini giriniz"
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                  {locale === 'en' ? 'Payment Method' : locale === 'fr' ? 'Mode de paiement' : 'Ödeme Yöntemi'}
                </h3>

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
                          placeholder={locale === 'en' ? 'e.g. JOHN DOE' : locale === 'fr' ? 'ex. JEAN DUPONT' : 'Örn: AHMET YILMAZ'}
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
              </div>
            </div>
          </div>

          {/* Güvenli Ödeme Bildirimi */}
          <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <Shield className="size-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                {t('secure_payment')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('secure_payment_info')}
              </p>
            </div>
          </div>
        </div>

        {/* Sağ: Sipariş Özeti */}
        <div>
          <div className="sticky top-8 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              {t('order_summary')}
            </h2>

            {/* Görsel */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('your_design')}
              </p>
              {priceData.mockupTemplate
                ? (
                    <MockupPreview
                      imageUrl={imageData.image_url}
                      mockupTemplate={
                        orientation === 'portrait' && priceData.mockupTemplateVertical
                          ? priceData.mockupTemplateVertical
                          : priceData.mockupTemplate
                      }
                      mockupType={parseMockupConfig(
                        orientation === 'portrait' && priceData.mockupConfigVertical
                          ? priceData.mockupConfigVertical
                          : priceData.mockupConfig,
                      ).type || 'frame'}
                      mockupConfig={parseMockupConfig(
                        orientation === 'portrait' && priceData.mockupConfigVertical
                          ? priceData.mockupConfigVertical
                          : priceData.mockupConfig,
                      )}
                      imageTransform={propImageTransform}
                      className="w-full overflow-hidden rounded-lg"
                    />
                  )
                : (
                    <ProtectedImage
                      src={imageData.image_url}
                      alt={imageData.text_prompt}
                      width={600}
                      height={600}
                      className="w-full rounded-lg"
                      unoptimized
                    />
                  )}
            </div>

            {/* Ürün Detayları */}
            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('product')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {priceData.productName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('size')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {priceData.sizeName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('frame')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {priceData.frameName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('orientation')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {orientation === 'portrait' ? t('portrait') : t('landscape')}
                </span>
              </div>
            </div>

            {/* Fiyat Hesaplama */}
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('subtotal')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ₺
                  {(priceData.totalPrice / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('shipping')}</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {t('shipping_free')}
                </span>
              </div>
            </div>

            {/* Toplam */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 p-4 dark:from-purple-900/30 dark:to-pink-900/30">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {t('total')}
              </span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ₺
                {(priceData.totalPrice / 100).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={isProcessing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              {isProcessing
                ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {t('processing_payment')}
                    </>
                  )
                : (
                    <>
                      <CreditCard className="size-5" />
                      {t('complete_payment')}
                    </>
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
