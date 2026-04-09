import { useTranslations } from 'next-intl';

const logos = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const Sponsors = () => {
  const t = useTranslations('Sponsors');

  return (
    <section className="relative bg-[#0a0a0f] py-6 md:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-4 text-center text-xs uppercase tracking-widest text-gray-500 md:mb-8 md:text-sm">
          {t('title')}
        </p>
      </div>
      <div className="overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-x-16 opacity-60 grayscale transition-opacity hover:opacity-80 hover:[animation-play-state:paused]">
          {logos.map(n => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={n}
              src={`/assets/images/isbirlik-logolar-png/${n}.png`}
              alt={`isbirligi-${n}`}
              loading="lazy"
              className="h-10 w-auto shrink-0 object-contain px-2 md:h-12"
            />
          ))}
          {logos.map(n => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`dup-${n}`}
              src={`/assets/images/isbirlik-logolar-png/${n}.png`}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-10 w-auto shrink-0 object-contain px-2 md:h-12"
            />
          ))}
        </div>
      </div>
    </section>
  );
};
