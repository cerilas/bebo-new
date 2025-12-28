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
    <div className="mb-6 flex w-full max-w-[400px] flex-col px-1">
      <label className="flex cursor-pointer items-start gap-3">
        <div className="relative flex items-center pt-1">
          <input
            type="checkbox"
            id="agreement-checkbox"
            checked={accepted}
            onChange={e => onChange(e.target.checked)}
            className="peer size-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white transition-all checked:border-purple-600 checked:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-800"
          />
          <svg
            className="pointer-events-none absolute left-0 top-0 size-4 translate-y-1 scale-0 text-white transition-transform peer-checked:scale-100"
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
        <span className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          <Link
            href={`/${locale}/legal`}
            target="_blank"
            className="font-semibold text-purple-600 underline-offset-2 hover:underline dark:text-purple-400"
          >
            {currentLabels.linkText}
          </Link>
          {' '}
          {locale === 'tr' ? 've' : (locale === 'fr' ? 'et' : 'and')}
          {' '}
          <span className="font-semibold">{locale === 'tr' ? 'Gizlilik Politikasını' : (locale === 'fr' ? 'la politique de confidentialité' : 'Privacy Policy')}</span>
          {' '}
          {locale === 'tr' ? 'okudum, kabul ediyorum.' : (locale === 'fr' ? 'li, j\'accepte.' : 'read, I agree.')}
        </span>
      </label>
    </div>
  );
};
