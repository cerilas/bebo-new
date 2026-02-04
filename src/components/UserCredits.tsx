'use client';

import { useUser } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getUserArtCredits } from '@/features/design/creditsActions';

type UserCreditsProps = {
  isLandingPage?: boolean;
};

export const UserCredits = ({ isLandingPage }: UserCreditsProps) => {
  const t = useTranslations('Design');
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (!user) {
        return;
      }
      try {
        const amount = await getUserArtCredits();
        setCredits(amount);
      } catch (error) {
        console.error('Failed to fetch credits in Navbar:', error);
      }
    }

    fetchCredits();
  }, [user]);

  if (!user || credits === null) {
    return null;
  }

  return (
    <Link
      href="/purchase-credits"
      className={`group flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-300 ${isLandingPage
        ? 'border border-white/10 bg-white/10 text-white hover:bg-white/20'
        : 'border border-primary/10 bg-primary/5 text-primary hover:bg-primary/10'
      }`}
      title={t('art_credits')}
    >
      <Sparkles className={`size-3.5 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${isLandingPage ? 'text-yellow-400' : 'text-primary'
      }`}
      />
      <span className="text-xs font-bold tracking-tight">
        {credits}
      </span>
    </Link>
  );
};
