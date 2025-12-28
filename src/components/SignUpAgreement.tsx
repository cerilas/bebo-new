'use client';

import Link from 'next/link';

type SignUpAgreementProps = {
  accepted: boolean;
  onChange: (value: boolean) => void;
  locale: string;
};

export const SignUpAgreement = ({ accepted, onChange, locale }: SignUpAgreementProps) => {
  const labels = {
    tr: {
      text: 'Kullanım Koşullarını ve Gizlilik Politikasını okudum, kabul ediyorum.',
      linkText: 'Kullanıcı Sözleşmesini Oku',
    },
    en: {
      text: 'I have read and agree to the Terms of Service and Privacy Policy.',
      linkText: 'Read User Agreement',
    },
    fr: {
      text: 'J\'ai lu et j\'accepte les conditions d\'utilisation et la politique de confidentialité.',
      linkText: 'Lire le contrat d\'utilisateur',
    },
  };

  const currentLabels = labels[locale as keyof typeof labels] || labels.tr;

  return (
    <div className="mb-6 flex w-full max-w-[400px] flex-col gap-2 rounded-xl border border-gray-200 bg-white/50 p-4 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-black/50">
      <label className="flex cursor-pointer items-start gap-3">
        <div className="relative flex items-center pt-0.5">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => onChange(e.target.checked)}
            className="peer size-5 cursor-pointer appearance-none rounded border-2 border-gray-300 bg-white transition-all checked:border-purple-600 checked:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-900"
          />
          <svg
            className="pointer-events-none absolute left-0 top-0 size-5 translate-y-0.5 scale-0 text-white transition-transform peer-checked:scale-100"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentLabels.text}
        </span>
      </label>

      <div className="ml-8">
        <Link
          href={`/${locale}/legal`}
          target="_blank"
          className="text-xs font-semibold text-purple-600 underline-offset-4 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
        >
          {currentLabels.linkText}
        </Link>
      </div>

      {!accepted && (
        <div className="ml-8 mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
          <span className="flex size-3 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">!</span>
          Devam etmek için işaretlemelisiniz
        </div>
      )}
    </div>
  );
};
