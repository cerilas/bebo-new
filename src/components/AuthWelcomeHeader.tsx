'use client';

import { Gift } from 'lucide-react';

export const AuthWelcomeHeader = () => {
  // We can use translations here if we add them, or hardcode for now as per previous files
  // Ideally we should add these to the translation files, but for now matching existing text

  return (
    <div className="group relative mb-8 w-full max-w-[400px]">
      {/* Animated gradient background for border effect */}
      <div className="animate-tilt absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/90 p-6 text-center shadow-2xl backdrop-blur-xl dark:bg-black/90">

        {/* Icon with glow */}
        <div className="relative mb-4 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/30">
          <Gift className="size-7 animate-pulse text-white" />
          <div className="absolute inset-0 rounded-full bg-white/20 blur-md"></div>
        </div>

        {/* Text Content */}
        <h2 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Hoş geldin hediyesi
        </h2>

        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Kayıt ol,
          {' '}
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-base font-bold text-transparent">1 ücretsiz tasarım hakkını</span>
          {' '}
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-base font-bold text-transparent">kazan</span>
          , sana ait hayalindeki ürün kapına gelsin.
        </p>

        {/* Decorative bottom element */}
        <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
      </div>
    </div>
  );
};
