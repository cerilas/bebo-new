'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { LoadingContext } from '@/hooks/useLoading';

import { RotatingTextLoader } from './RotatingTextLoader';

function LoadingProviderContent({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true); // Start with loading for initial page load
  const [finishFast, setFinishFast] = useState(false);

  useEffect(() => {
    // Signal that the page is ready/hydrated.
    // We can also attach to window.onload if we want to wait for all assets.
    if (document.readyState === 'complete') {
      setFinishFast(true);
    } else {
      const onPageLoad = () => setFinishFast(true);
      window.addEventListener('load', onPageLoad);
      return () => window.removeEventListener('load', onPageLoad);
    }
    // Fallback safety to ensure we don't spin forever if load event missed
    const timer = setTimeout(() => setFinishFast(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const showLoading = useCallback(() => {
    setIsLoading(true);
    // Reset finishFast if we show loading again manually?
    // Usually manual showLoading means we are starting a NEW op.
    setFinishFast(false);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Update context to expose ability to setFinished manually if needed (optional, keeping simple for now)
  const contextValue = useMemo(() => ({
    isLoading,
    showLoading,
    hideLoading,
  }), [isLoading, showLoading, hideLoading]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {isLoading && <RotatingTextLoader onComplete={hideLoading} finishFast={finishFast} />}
      {children}
    </LoadingContext.Provider>
  );
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Suspense>
  );
}
