'use client';

import { useUser } from '@clerk/nextjs';
import { Check, Image as ImageIcon, Loader2, Send, ShoppingCart, Sparkles, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';

import { ProtectedImage } from '@/components/ProtectedImage';
import { getProductDetails } from '@/features/products/productActions';
import { useRouter } from '@/libs/i18nNavigation';
import getCroppedImg from '@/utils/cropImage';

import { type GeneratedImageResponse, getGeneratedImage, getUserGeneratedImages, sendChatMessage } from './chatActions';
import { generateChatSessionId } from './chatUtils';
import { decrementArtCredits, getUserArtCredits } from './creditsActions';
import { uploadImageToN8n } from './imageUpload';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  userImageUrl?: string; // User uploaded image
  timestamp: Date;
};

type ChatInterfaceProps = {
  locale?: string;
  productSlug?: string;
  sizeSlug?: string;
  frameSlug?: string;
  initialImageUrl?: string;
};

export function ChatInterface({
  locale = 'tr',
  productSlug,
  sizeSlug,
  frameSlug,
  initialImageUrl,
}: ChatInterfaceProps) {
  const t = useTranslations('Design');
  const { user } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerateMode, setIsGenerateMode] = useState(false); // false = tasarım ilhamı (default)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageResponse[]>([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [chatSessionId] = useState(() =>
    generateChatSessionId(user?.id || 'anonymous', productSlug),
  );
  const [historyImages, setHistoryImages] = useState<GeneratedImageResponse[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedImageDetail, setSelectedImageDetail] = useState<GeneratedImageResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [artCredits, setArtCredits] = useState<number>(0);
  const [productFullData, setProductFullData] = useState<any>(null);
  // User upload section states
  const [userUploadedImageUrl, setUserUploadedImageUrl] = useState<string>('');
  const [isUploadingUserImage, setIsUploadingUserImage] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<number>(1920 / 1080); // Default aspect ratio
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userUploadFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive (only scroll the chat container)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Load user's art credits
  useEffect(() => {
    async function loadCredits() {
      if (!user) {
        return;
      }

      try {
        const credits = await getUserArtCredits();
        setArtCredits(credits);
      } catch (error) {
        console.error('Failed to load credits:', error);
      }
    }

    loadCredits();
  }, [user]);

  // Load user's history images
  useEffect(() => {
    async function loadHistoryImages() {
      if (!user) {
        return;
      }

      setIsLoadingHistory(true);
      const result = await getUserGeneratedImages();

      if (result.success && result.data) {
        // Filter images that have image_url (completed generations)
        const completedImages = result.data.filter(img => img.image_url);
        setHistoryImages(completedImages);
      }

      setIsLoadingHistory(false);
    }

    loadHistoryImages();
  }, [user]);

  // Load product details and calculate crop aspect ratio
  useEffect(() => {
    async function loadProductDetails() {
      if (!productSlug) {
        return;
      }

      try {
        const productData = await getProductDetails(productSlug, locale);
        setProductFullData(productData);

        if (productData?.imageDimensions) {
          // Parse dimensions like "1920x1080" and calculate aspect ratio
          const [width, height] = productData.imageDimensions.split('x').map(Number);

          if (width && height && height !== 0) {
            setCropAspectRatio(width / height);
          }
        }
      } catch (error) {
        console.error('Failed to load product details:', error);
        // Keep default aspect ratio (1920/1080) if loading fails
      }
    }

    loadProductDetails();
  }, [productSlug, locale]);

  // Set initial image if provided via URL parameter
  useEffect(() => {
    if (initialImageUrl && !userUploadedImageUrl) {
      setUserUploadedImageUrl(decodeURIComponent(initialImageUrl));
    }
  }, [initialImageUrl, userUploadedImageUrl]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('welcome_message'),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) {
      return;
    }

    // Check credits only for image generation mode
    if (isGenerateMode && artCredits <= 0) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('insufficient_credits'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      userImageUrl: uploadedImageUrl || undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    const currentImageUrl = uploadedImageUrl;
    setInputValue('');
    setUploadedImageUrl('');
    setIsSending(true);

    try {
      // Call API
      const result = await sendChatMessage({
        textPrompt: currentInput,
        imagePromptUrl: currentImageUrl,
        isGenerateMode,
        chatSessionId,
        productSlug,
        sizeSlug,
        frameSlug,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'API yanıt vermedi');
      }

      // Display AI response
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.data.reply_to_user,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

      // If image_generation is true, wait and fetch the generated image
      if (result.data.image_generation && result.data.generation_id) {
        // Decrement credits when starting image generation
        try {
          const newCredits = await decrementArtCredits();
          setArtCredits(newCredits);
        } catch (error) {
          console.error('Failed to decrement credits:', error);
        }

        setIsGeneratingImage(true); // Disable input during image generation

        // Show motivational messages while waiting (30 seconds total)
        const motivationalMessages: string[] = [
          t('creating_masterpiece'),
          t('analyzing_details'),
          t('crafting_unique'),
          t('adding_artistic_touch'),
          t('almost_ready'),
          t('finalizing'),
        ];

        // Add motivational message
        const motivationMessageId = `${Date.now()}-motivation`;
        let currentMessageIndex = 0;

        const motivationMessage: Message = {
          id: motivationMessageId,
          role: 'assistant',
          content: motivationalMessages[0]!,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, motivationMessage]);

        // Update motivational message every 5 seconds (6 messages over 30 seconds)
        const messageInterval = setInterval(() => {
          currentMessageIndex = (currentMessageIndex + 1) % motivationalMessages.length;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === motivationMessageId
                ? { ...msg, content: motivationalMessages[currentMessageIndex]! }
                : msg,
            ),
          );
        }, 5000);

        // Polling function to check image generation status
        const pollForImage = async (generationId: string, attempts = 0, maxAttempts = 20) => {
          const pollInterval = 5000; // Check every 5 seconds
          // Max wait time: 20 attempts × 5s = 100 seconds max

          try {
            const imageResult = await getGeneratedImage(generationId);

            // Check if image is ready
            if (imageResult.success && imageResult.data && imageResult.data.image_url) {
              // Image is ready!
              clearInterval(messageInterval);

              // Remove motivational message
              setMessages(prev => prev.filter(msg => msg.id !== motivationMessageId));

              setGeneratedImages(prev => [...prev, imageResult.data!]);

              const imageMessage: Message = {
                id: `${Date.now()}-image`,
                role: 'assistant',
                content: t('image_generated'),
                imageUrl: imageResult.data.image_url,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, imageMessage]);
              setIsGeneratingImage(false);
            } else if (attempts < maxAttempts - 1) {
              // Image not ready yet, try again after delay
              setTimeout(() => {
                pollForImage(generationId, attempts + 1, maxAttempts);
              }, pollInterval);
            } else {
              // Max attempts reached
              clearInterval(messageInterval);
              setMessages(prev => prev.filter(msg => msg.id !== motivationMessageId));

              const timeoutMessage: Message = {
                id: `${Date.now()}-timeout`,
                role: 'assistant',
                content: t('generation_timeout'),
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, timeoutMessage]);
              setIsGeneratingImage(false);
            }
          } catch (error) {
            console.error('Error fetching generated image:', error);
            clearInterval(messageInterval);
            setMessages(prev => prev.filter(msg => msg.id !== motivationMessageId));

            const errorMsg: Message = {
              id: `${Date.now()}-image-error`,
              role: 'assistant',
              content: 'Görsel alınırken bir hata oluştu.',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
            setIsGeneratingImage(false);
          }
        };

        // Start polling after initial 10 seconds
        setTimeout(() => {
          pollForImage(result.data.generation_id!, 0, 20);
        }, 10000); // Wait 10 seconds before first check
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 999).toString(),
        role: 'assistant',
        content: `Üzgünüm, bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir görsel dosyası seçin');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Görsel boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to n8n webhook
      const uploadResult = await uploadImageToN8n(file);

      console.log('Upload result:', uploadResult); // Debug log

      if (uploadResult.success && uploadResult.imageUrl) {
        console.log('Setting uploaded image URL:', uploadResult.imageUrl);
        setUploadedImageUrl(uploadResult.imageUrl);
      } else {
        console.error('Upload failed:', uploadResult);
        throw new Error(uploadResult.error || 'Yükleme başarısız - URL bulunamadı');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(`Görsel yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // User upload section handlers
  const handleUserImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Lütfen bir görsel dosyası seçin',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Görsel boyutu 5MB\'dan küçük olmalıdır',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Convert file to data URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (!imageToCrop || !croppedAreaPixels) {
        return;
      }

      setIsUploadingUserImage(true);
      setIsCropModalOpen(false);

      // Get cropped image
      const croppedImageDataUrl = await getCroppedImg(imageToCrop, croppedAreaPixels);

      // Convert data URL to File
      const response = await fetch(croppedImageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

      // Upload to n8n webhook
      const uploadResult = await uploadImageToN8n(file);

      if (uploadResult.success && uploadResult.imageUrl) {
        setUserUploadedImageUrl(uploadResult.imageUrl);

        // Add success message
        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Görselin başarıyla yüklendi! Artık siparişine devam edebilirsin.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error(uploadResult.error || 'Yükleme başarısız');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Görsel yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploadingUserImage(false);
      setImageToCrop('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const removeUserUploadedImage = () => {
    setUserUploadedImageUrl('');
    if (userUploadFileInputRef.current) {
      userUploadFileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-8">
        {/* Header with Product Info & Mode Toggle */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Product Info */}
              {productSlug && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">
                    {t('selected_product')}
                    :
                  </span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    {(() => {
                      if (!productFullData) {
                        return productSlug;
                      }
                      const size = productFullData.sizes?.find((s: any) => s.slug === sizeSlug);
                      const frame = productFullData.frames?.find((f: any) => f.slug === frameSlug);

                      let display = productFullData.name;
                      if (size) {
                        display += ` - ${size.dimensions} cm`;
                      }
                      if (frame && frameSlug !== 'none') {
                        display += ` - ${frame.name}`;
                      } else if (frameSlug === 'none') {
                        display += ` - ${locale === 'tr' ? 'Çerçevesiz' : (locale === 'fr' ? 'Sans Cadre' : 'No Frame')}`;
                      }
                      return display;
                    })()}
                  </span>
                </div>
              )}

              {/* Art Credits Display */}
              <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-2 dark:from-yellow-900/20 dark:to-amber-900/20">
                <Sparkles className="size-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t('art_credits')}
                  :
                  {' '}
                  <span className="text-yellow-600 dark:text-yellow-400">{artCredits}</span>
                </span>
                <button
                  type="button"
                  onClick={() => router.push('/purchase-credits')}
                  className="ml-2 flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-1 text-xs font-medium text-white transition-all hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                  title={t('buy_credits_title')}
                >
                  <ShoppingCart className="size-3.5" />
                  {t('buy_credits')}
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {isGenerateMode ? t('mode_generate') : t('mode_inspiration')}
                </span>
                <button
                  onClick={() => setIsGenerateMode(!isGenerateMode)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${isGenerateMode
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block size-6 rounded-full bg-white shadow-lg transition-transform ${isGenerateMode ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  >
                    {isGenerateMode
                      ? (
                          <ImageIcon className="size-6 p-1 text-purple-500" />
                        )
                      : (
                          <Sparkles className="size-6 p-1 text-gray-500" />
                        )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chat Area - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="flex h-[600px] flex-col rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 space-y-4 overflow-y-auto p-6"
              >
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      {/* User uploaded image */}
                      {message.userImageUrl && (
                        <ProtectedImage
                          src={message.userImageUrl}
                          alt="User upload"
                          width={512}
                          height={512}
                          className="mt-3 max-h-48 w-auto rounded-lg"
                        />
                      )}
                      {/* AI generated image */}
                      {message.imageUrl && (
                        <ProtectedImage
                          src={message.imageUrl}
                          alt="Generated"
                          width={512}
                          height={512}
                          className="mt-3 h-auto w-full rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-700">
                      <Loader2 className="size-5 animate-spin text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                {/* Uploaded Image Preview */}
                {uploadedImageUrl && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-purple-50 p-2 dark:bg-purple-900/20">
                    <ProtectedImage
                      src={uploadedImageUrl}
                      alt="Upload preview"
                      width={64}
                      height={64}
                      className="size-16 rounded object-cover"
                    />
                    <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                      Görsel yüklendi
                    </span>
                    <button
                      onClick={removeUploadedImage}
                      className="rounded-full p-1 hover:bg-purple-100 dark:hover:bg-purple-800"
                    >
                      <X className="size-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Image Upload Button - Only show in generate mode */}
                  {isGenerateMode && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isSending || isGeneratingImage}
                        className="flex size-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        title="Görsel yükle"
                      >
                        {isUploading
                          ? (
                              <Loader2 className="size-5 animate-spin" />
                            )
                          : (
                              <Upload className="size-5" />
                            )}
                      </button>
                    </>
                  )}

                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGeneratingImage ? t('wait_for_generation') : (isGenerateMode ? t('placeholder_generate') : t('placeholder_inspiration'))}
                    rows={2}
                    disabled={isSending || isGeneratingImage}
                    className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSending || isGeneratingImage}
                    className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isSending
                      ? (
                          <Loader2 className="size-5 animate-spin" />
                        )
                      : (
                          <Send className="size-5" />
                        )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('hint')}
                  </p>
                  {isGenerateMode && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      ⚡
                      {' '}
                      {t('credit_warning')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Image Gallery - Takes 1/3 on large screens */}
          <div className="lg:col-span-1">
            {/* Current Session Generated Images */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
                <ImageIcon className="size-5 text-purple-500" />
                {t('generated_images')}
              </h2>

              {generatedImages.length === 0
                ? (
                    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('no_images_yet')}
                      </p>
                    </div>
                  )
                : (
                    <div className="grid grid-cols-2 gap-3">
                      {generatedImages.map((image, index) => (
                        <div
                          key={index}
                          role="button"
                          tabIndex={0}
                          className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                          onClick={() => {
                            setSelectedImageDetail(image);
                            setIsModalOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedImageDetail(image);
                              setIsModalOpen(true);
                            }
                          }}
                        >
                          <ProtectedImage
                            src={image.image_url}
                            alt={`Generated ${index + 1}`}
                            fill
                            className="object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageDetail(image);
                                setIsModalOpen(true);
                              }}
                              className="absolute bottom-2 right-2 rounded-lg bg-white px-3 py-1 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
                            >
                              {t('explore')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </div>

            {/* User Upload Section */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
                <Upload className="size-5 text-green-500" />
                {t('upload_own_image')}
              </h2>

              {!userUploadedImageUrl
                ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 dark:border-gray-600">
                      <input
                        ref={userUploadFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUserImageUpload}
                        className="hidden"
                      />
                      <Upload className="mb-3 size-12 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                        {t('upload_description')}
                      </p>
                      <button
                        type="button"
                        onClick={() => userUploadFileInputRef.current?.click()}
                        disabled={isUploadingUserImage}
                        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                      >
                        {isUploadingUserImage
                          ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                {t('uploading')}
                              </>
                            )
                          : (
                              <>
                                <Upload className="size-4" />
                                {t('select_image')}
                              </>
                            )}
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        {t('max_file_size')}
                      </p>
                    </div>
                  )
                : (
                    <div className="space-y-4">
                      <div className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <ProtectedImage
                          src={userUploadedImageUrl}
                          alt={t('uploaded_image')}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              if (!productSlug || !sizeSlug || !frameSlug) {
                              // Navigate to product selection with uploaded image
                                router.push(
                                  `/products?imageUrl=${encodeURIComponent(userUploadedImageUrl)}`,
                                );
                                return;
                              }
                              // Navigate to preview with uploaded image
                              router.push(
                                `/design/preview?imageUrl=${encodeURIComponent(userUploadedImageUrl)}&product=${productSlug}&size=${sizeSlug}&frame=${frameSlug}`,
                              );
                            }}
                            className="absolute bottom-2 right-2 rounded-lg bg-white px-3 py-1 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
                          >
                            {t('continue_order')}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => userUploadFileInputRef.current?.click()}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('change_image')}
                        </button>
                        <button
                          type="button"
                          onClick={removeUserUploadedImage}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                        >
                          {t('remove')}
                        </button>
                      </div>
                      <input
                        ref={userUploadFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUserImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
            </div>
          </div>
        </div>

        {/* History Images Section - Full Width Below */}
        {historyImages.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-white">
              <ImageIcon className="size-6 text-blue-500" />
              {t('history_images')}
            </h2>

            {isLoadingHistory
              ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-gray-400" />
                  </div>
                )
              : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {historyImages.map(image => (
                      <div
                        key={image.id}
                        role="button"
                        tabIndex={0}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                        onClick={() => {
                          setSelectedImageDetail(image);
                          setIsModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedImageDetail(image);
                            setIsModalOpen(true);
                          }
                        }}
                      >
                        <ProtectedImage
                          src={image.thumbnail_url || image.image_url}
                          alt={image.text_prompt}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className="mb-2 line-clamp-2 text-xs text-white">
                              {image.text_prompt}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageDetail(image);
                                setIsModalOpen(true);
                              }}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                            >
                              {t('explore')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        )}

        {/* Image Detail Modal */}
        {isModalOpen && selectedImageDetail && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                <X className="size-5" />
              </button>

              {/* Image */}
              <div className="mb-6">
                <ProtectedImage
                  src={selectedImageDetail.image_url}
                  alt={selectedImageDetail.text_prompt}
                  width={800}
                  height={800}
                  className="h-auto w-full rounded-xl"
                />
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Creation Date */}
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('creation_date')}
                  </h3>
                  <p className="text-base text-gray-900 dark:text-white">
                    {new Date(selectedImageDetail.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Prompt */}
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('your_prompt')}
                  </h3>
                  <p className="text-base text-gray-900 dark:text-white">
                    {selectedImageDetail.text_prompt}
                  </p>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Navigate to preview page with all necessary params
                    router.push(`/design/preview?generationId=${selectedImageDetail.generation_id}&product=${productSlug}&size=${sizeSlug}&frame=${frameSlug}`);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600"
                >
                  <Check className="size-5" />
                  {t('select')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal - Ana container'dan ayrı, body'ye direkt render edilecek */}
      <div data-testid="crop-modal-wrapper" data-is-open={isCropModalOpen} style={{ display: isCropModalOpen ? 'block' : 'none' }}>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {t('crop_image')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCropModalOpen(false);
                  setImageToCrop('');
                }}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Crop Area */}
            <div className="relative h-[500px] w-full bg-gray-100 dark:bg-gray-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={cropAspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom Control */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('zoom')}
                :
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(zoom * 100)}
                %
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCropModalOpen(false);
                  setImageToCrop('');
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                disabled={isUploadingUserImage}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {isUploadingUserImage
                  ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        {t('uploading')}
                      </>
                    )
                  : (
                      <>
                        <Check className="size-5" />
                        {t('save_and_upload')}
                      </>
                    )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
