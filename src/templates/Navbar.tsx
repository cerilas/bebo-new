'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import GooeyNav from '@/components/GooeyNav';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

import { Logo } from './Logo';

export const Navbar = () => {
  const t = useTranslations('Navbar');
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if we're on the landing page (dark background)
  const isLandingPage = pathname === '/' || pathname === '/tr' || pathname === '/en' || pathname === '/fr';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Calculate scroll progress
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (pathname !== '/' && !pathname.endsWith('/')) {
      router.push(`/#${sectionId}`);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const navLinks = [
    { id: 'products', label: t('products'), href: '/products' },
    { id: 'how-it-works', label: t('docs'), onClick: () => scrollToSection('nasil-calisir') },
    { id: 'features', label: t('product'), onClick: () => scrollToSection('ozellikler') },
  ];

  // Transform navLinks for GooeyNav
  const gooeyNavItems = navLinks.map(link => ({
    label: link.label,
    href: link.href,
    onClick: link.onClick,
  }));

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isLandingPage
        ? (isScrolled || isMobileMenuOpen)
            ? 'border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl'
            : 'bg-transparent'
        : (isScrolled || isMobileMenuOpen)
            ? 'border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a0f]/80'
            : 'border-b border-gray-100 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a0a0f]/60'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="group relative z-10 flex flex-col items-start">
            <Logo variant={isLandingPage ? 'light' : 'dark'} scrollProgress={scrollProgress} />
            <span className={`-mt-1 whitespace-nowrap text-[0.55rem] font-medium sm:text-[0.65rem] ${isLandingPage ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
              {t('subtitle')}
            </span>
          </Link>

          {/* Desktop Navigation - GooeyNav */}
          <div className="hidden md:flex">
            <GooeyNav
              items={gooeyNavItems}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={0}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
              variant={isLandingPage ? 'light' : 'dark'}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              <ThemeSwitcher />
              <LocaleSwitcher variant={isLandingPage ? 'light' : 'dark'} />
            </div>

            <SignedOut>
              <Link
                href="/sign-in"
                className={`hidden text-sm transition-colors md:block ${isLandingPage
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {t('sign_in')}
              </Link>
              <Link
                href="/sign-up"
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${isLandingPage
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                }`}
              >
                {t('sign_up')}
              </Link>
            </SignedOut>

            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: `size-9 ring-2 ${isLandingPage ? 'ring-white/20' : 'ring-gray-200 dark:ring-white/20'}`,
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Geçmiş Siparişlerim"
                    labelIcon={(
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                    )}
                    href="/dashboard/orders"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </SignedIn>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`rounded-lg p-2 md:hidden ${isLandingPage
                ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div
            className={`border-t py-4 md:hidden ${isLandingPage ? 'border-white/10' : 'border-gray-200 dark:border-white/10'
            }`}
          >
            <div className="flex flex-col gap-2">
              {navLinks.map(link => (
                link.href
                  ? (
                      <Link
                        key={link.id}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`rounded-lg px-4 py-3 transition-colors ${isLandingPage
                          ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                      >
                        {link.label}
                      </Link>
                    )
                  : (
                      <button
                        key={link.id}
                        type="button"
                        onClick={link.onClick}
                        className={`rounded-lg px-4 py-3 text-left transition-colors ${isLandingPage
                          ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                      >
                        {link.label}
                      </button>
                    )
              ))}
              <div className="mt-2 flex items-center justify-between px-4">
                <LocaleSwitcher variant={isLandingPage ? 'light' : 'dark'} />
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Spacer component to prevent content from being hidden behind fixed navbar
export const NavbarSpacer = () => (
  <div className="h-16 md:h-20" />
);
