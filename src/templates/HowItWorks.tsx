import { Package, ShoppingCart, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

const HowItWorks = () => {
  const t = useTranslations('HowItWorks');

  const steps = [
    {
      number: '01',
      icon: Package,
      titleKey: 'step1_title',
      descriptionKey: 'step1_description',
      gradient: 'from-purple-500 to-pink-500',
      glow: 'purple',
    },
    {
      number: '02',
      icon: Sparkles,
      titleKey: 'step2_title',
      descriptionKey: 'step2_description',
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'blue',
    },
    {
      number: '03',
      icon: ShoppingCart,
      titleKey: 'step3_title',
      descriptionKey: 'step3_description',
      gradient: 'from-orange-500 to-pink-500',
      glow: 'orange',
    },
  ];

  return (
    <section id="nasil-calisir" className="relative bg-[#0a0a0f] py-16 md:py-20">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-1/4 size-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute right-0 top-2/3 size-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm uppercase tracking-widest text-purple-400">
            Basit & Hızlı
          </p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {t('section_title')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            {t('section_subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connection line */}
          <div className="absolute inset-x-[16.67%] top-24 hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent md:block" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="group relative">
                {/* Card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:bg-white/10">
                  {/* Glow effect on hover */}
                  <div
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${step.gradient} opacity-0 blur transition-opacity duration-500 group-hover:opacity-20`}
                  />

                  {/* Content */}
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      {/* Number */}
                      <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-5xl font-bold text-transparent`}>
                        {step.number}
                      </span>

                      {/* Icon */}
                      <div className={`inline-flex rounded-xl bg-gradient-to-r ${step.gradient} p-3`}>
                        <Icon className="size-7 text-white" />
                      </div>
                    </div>

                    {/* Text */}
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-gray-400">
                      {t(step.descriptionKey)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { HowItWorks };
