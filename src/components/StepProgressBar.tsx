'use client';

import { useTranslations } from 'next-intl';

type StepProgressBarProps = {
  currentStep: 1 | 2 | 3;
};

export const StepProgressBar = ({ currentStep }: StepProgressBarProps) => {
  const t = useTranslations('ProgressBar');

  const steps = [
    { number: 1, key: 'step_1' },
    { number: 2, key: 'step_2' },
    { number: 3, key: 'step_3' },
  ];

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="mx-auto mt-4 max-w-2xl px-4 py-1 md:mt-5 md:max-w-3xl md:py-2">
        <nav aria-label="Progress">
          <div className="px-5 md:px-8">
            <div className="relative">
              <div className="h-1 w-full rounded-full bg-gray-200/80 dark:bg-gray-700/70" />
              <div
                className="absolute left-0 top-0 h-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />

              {steps.map((step, index) => {
                const isActive = currentStep >= step.number;
                const position = (index / (steps.length - 1)) * 100;

                return (
                  <div
                    key={step.number}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div
                      className={`grid size-[27px] place-items-center rounded-full border transition-all duration-300 md:size-[30px] ${isActive ? 'border-purple-600 bg-white text-purple-600 dark:bg-gray-900' : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-500'}`}
                    >
                      <span className="block text-[12px] font-semibold tabular-nums leading-none md:text-[13px]">
                        {step.number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <ol className="relative mt-4 h-5 text-[10px] leading-tight md:mt-5 md:h-6 md:text-xs">
              {steps.map((step, index) => {
                const isActive = currentStep >= step.number;
                const isCurrent = currentStep === step.number;
                const position = (index / (steps.length - 1)) * 100;

                return (
                  <li
                    key={step.number}
                    className={`absolute top-0 -translate-x-1/2 whitespace-nowrap text-center font-medium transition-colors ${isCurrent ? 'text-purple-700 dark:text-purple-300' : isActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}
                    style={{ left: `${position}%` }}
                  >
                    {t(step.key)}
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>
      </div>
    </div>
  );
};
