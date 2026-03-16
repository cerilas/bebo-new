'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Logo } from './Logo';

const DarkVeil = dynamic(() => import('@/components/DarkVeil'), {
  ssr: false,
  loading: () => <div className="size-full bg-[#0a0a0f]" />,
});

export const Hero = () => {
  const t = useTranslations('Hero');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartDesigning = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsLoading(true);
    router.push('/products');
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <DarkVeil />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-32">

        {/* Main heading */}
        <h1 className="mb-6 text-center text-[2.85rem] font-bold leading-tight tracking-tight text-white md:text-[4.2rem] lg:text-[5.4rem]">
          {t.rich('title', {
            important: chunks => (
              <span className="inline-flex flex-wrap items-center justify-center gap-x-3 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                {chunks}
              </span>
            ),
            logo: () => (
              <span className="inline-flex translate-y-[0.06em] items-center">
                <Logo size="xl" className="mx-2" />
              </span>
            ),
          })}
        </h1>

        {/* Description */}
        <p className="mb-12 max-w-2xl text-center text-lg text-gray-400 md:text-xl">
          {t('description')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/products"
            onClick={handleStartDesigning}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          >
            {isLoading
              ? (
                  <>
                    <div className="size-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    <span>Yükleniyor...</span>
                  </>
                )
              : (
                  <>
                    <Sparkles className="size-5" />
                    <span>{t('primary_button')}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
          </Link>

          <Link
            href="#nasil-calisir"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
          >
            {t('how_it_works')}
          </Link>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </section>
  );
};
