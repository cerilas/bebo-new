'use client';

import { Check, ChevronRight } from 'lucide-react';
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

  return (
    <div className="w-full">
      <div className="mx-auto max-w-4xl px-4 pb-1 pt-2 md:py-6">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const isLast = index === steps.length - 1;

              return (
                <li key={step.number} className="flex items-center">
                  <div className={`relative flex items-center gap-2 md:gap-3 ${isCurrent ? 'flex-1' : ''}`}>
                    {/* Step Circle */}
                    <div
                      className={`
                        flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 md:size-10 md:text-base
                        ${isCompleted
                  ? 'border-green-500 bg-green-500 text-white shadow-sm'
                  : isCurrent
                    ? 'border-purple-600 bg-purple-50 text-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.15)] ring-2 ring-purple-600/20'
                    : 'border-gray-200 bg-gray-50 text-gray-400'
                }
                      `}
                    >
                      {isCompleted ? <Check className="size-4 md:size-5" /> : step.number}
                    </div>

                    {/* Step Label (Always visible on desktop, visible if current on mobile) */}
                    <span
                      className={`
                        whitespace-nowrap text-xs font-semibold transition-colors duration-300 md:text-sm
                        ${isCompleted ? 'text-green-600' : ''}
                        ${isCurrent ? 'text-purple-700' : 'hidden text-gray-500 md:block'}
                      `}
                    >
                      {t(step.key)}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {!isLast && (
                    <div className="mx-2 text-gray-300 md:mx-4">
                      <ChevronRight className="size-4 md:size-5" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};
