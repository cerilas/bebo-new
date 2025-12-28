'use client';

import { SignUp } from '@clerk/nextjs';
import { useState } from 'react';

import { AuthWelcomeHeader } from '@/components/AuthWelcomeHeader';
import { SignUpAgreement } from '@/components/SignUpAgreement';

type SignUpWrapperProps = {
  path: string;
  forceRedirectUrl?: string;
  locale: string;
};

export const SignUpWrapper = ({ path, forceRedirectUrl, locale }: SignUpWrapperProps) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col items-center px-4 py-10 sm:px-6">
      {/* Promotional Banner */}
      <AuthWelcomeHeader />

      {/* Agreement Checkbox */}
      <SignUpAgreement
        accepted={accepted}
        onChange={setAccepted}
        locale={locale}
      />

      {/* Clerk SignUp Component with optional overlay/disable effect */}
      <div className="relative w-full max-w-[400px]">
        <div className={`transition-all duration-500 ${!accepted ? 'pointer-events-none opacity-30 blur-[2px] grayscale' : 'opacity-100'}`}>
          <SignUp
            path={path}
            forceRedirectUrl={forceRedirectUrl}
          />
        </div>

        {!accepted && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center">
            {/* Transparent overlay blocks interactions */}
          </div>
        )}
      </div>
    </div>
  );
};
