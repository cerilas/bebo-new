'use client';

import { ArrowRight, Package, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const ProcessSteps = () => {
  const t = useTranslations('ProcessSteps');

  const steps = [
    {
      number: '01',
      icon: Sparkles,
      title: t('step1_title'),
      description: t('step1_description'),
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      image: '/images/process-siparis.png',
    },
    {
      number: '02',
      icon: Package,
      title: t('step2_title'),
      description: t('step2_description'),
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      image: '/images/process-uretim.png',
    },
    {
      number: '03',
      icon: ShieldCheck,
      title: t('step3_title'),
      description: t('step3_description'),
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/30',
      image: '/images/process-kargo.png',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0a0a0f] py-24">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 size-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            {t.rich('section_title', {
              gradient: chunks => (
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            {t('section_description')}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative"
            >
              {/* Connecting Line (hidden on mobile, shown on desktop between cards) */}
              {index < steps.length - 1 && (
                <div className="absolute left-full top-1/2 z-0 hidden h-0.5 w-8 -translate-y-1/2 bg-gradient-to-r from-white/20 to-transparent md:block" />
              )}

              {/* Card */}
              <div
                className={`relative h-full overflow-hidden rounded-2xl border ${step.borderColor} bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]`}
              >
                {/* Inner Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-50`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Image */}
                  <div className="mb-6 overflow-hidden rounded-xl">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={400}
                      height={300}
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Step Number */}
                  <div className="mb-6 text-6xl font-bold text-white/10">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`mb-6 flex size-16 items-center justify-center rounded-xl border ${step.borderColor} bg-gradient-to-br ${step.gradient}`}>
                    <step.icon className={`size-8 ${step.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-white">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400">
                    {step.description}
                  </p>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} blur-xl`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/products"
            className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-semibold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          >
            {t('cta_button')}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
};
