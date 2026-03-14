'use client';

import { CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function Newsletter() {
  const t = useTranslations('Newsletter');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t('error_empty_email'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { subscribeToNewsletter } = await import('@/features/newsletter/newsletterActions');
      const result = await subscribeToNewsletter(email);

      if (result.success) {
        setIsSuccess(true);
        setEmail('');
      } else {
        setError(result.error || t('error_general'));
      }
    } catch {
      setError(t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <section id="bulten" className="relative overflow-hidden bg-[#0a0a0f] py-24">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
              <CheckCircle className="size-10 text-green-400" />
            </div>
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
              {t('success_title')}
            </h2>
            <p className="mb-6 max-w-md text-lg text-gray-400">
              {t('success_subtitle')}
            </p>
            <p className="mb-8 text-sm text-gray-500">
              {t('success_message')}
            </p>
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="text-sm text-gray-400 underline decoration-gray-600 underline-offset-4 transition-colors hover:text-white"
            >
              {t('subscribe_another')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="bulten" className="relative overflow-hidden bg-[#0a0a0f] py-24">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/2 size-[500px] -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/2 size-[500px] -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 blur-3xl" />
      </div>

      {/* Subtle Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        {/* Content Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl md:p-12">
          {/* Inner Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />

          <div className="relative flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Sparkles className="size-8 text-purple-400" />
            </div>

            {/* Title */}
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
              {t('title')}
            </h2>
            <p className="mb-8 max-w-lg text-lg text-gray-400">
              {t('subtitle')}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full max-w-lg">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white backdrop-blur-sm transition-all placeholder:text-gray-500 focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-black transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading
                    ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          {t('subscribing')}
                        </>
                      )
                    : (
                        t('subscribe_button')
                      )}
                </button>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-400">
                  {error}
                </p>
              )}
            </form>

            {/* Privacy Note */}
            <p className="mt-6 text-sm text-gray-500">
              {t('privacy_note')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
