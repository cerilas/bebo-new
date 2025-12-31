'use client';

import { useEffect } from 'react';

/**
 * Clerk's prebuilt components don't allow HTML in custom field labels.
 * This component fixes that by searching the DOM for the legal text
 * and replacing it with clickable links.
 */
export const ClerkLegalLinkFixer = () => {
  useEffect(() => {
    // Exact text as it appears in the Clerk component
    const targetText = 'Hizmet Şartları ve Gizlilik Politikası\'nı kabul ediyorum';

    const fixLinks = () => {
      // Find all spans (Clerk labels are usually in spans)
      const elements = document.querySelectorAll('span');

      elements.forEach((el) => {
        // We trim to handle potential extra spaces in Clerk's rendering
        if (el.textContent?.trim() === targetText && !el.querySelector('a')) {
          el.innerHTML = `
            <a href="/tr/legal" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500; pointer-events: auto; position: relative; z-index: 10;">Hizmet Şartları</a> 
            ve 
            <a href="/tr/legal" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500; pointer-events: auto; position: relative; z-index: 10;">Gizlilik Politikası</a>'nı 
            kabul ediyorum.
          `;
        }
      });
    };

    // Run immediately and also set a slight delay to handle Clerk's async mount
    fixLinks();
    const timeout = setTimeout(fixLinks, 500);

    // Also watch for changes (Clerk components load dynamically)
    const observer = new MutationObserver(() => {
      fixLinks();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return null;
};
