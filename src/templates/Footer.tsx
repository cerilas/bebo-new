'use client';

import { Github, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getSiteSettings, type SiteSettings } from '@/features/settings/siteSettingsActions';

import { Logo } from './Logo';

export const Footer = () => {
  const t = useTranslations('Footer');
  const tNavbar = useTranslations('Navbar');
  const params = useParams();
  const locale = (params?.locale as string) || 'tr';
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    getSiteSettings().then(setSettings);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const footerLinks = [
    {
      title: t('product'),
      links: [
        { label: tNavbar('products'), href: '/products' },
        { label: tNavbar('product'), href: '/ozellikler' },
        { label: tNavbar('docs'), href: '/nasil-calisir' },
        { label: tNavbar('blog'), action: () => scrollToSection('fiyatlandirma') },
      ],
    },
    {
      title: t('company_title'),
      links: [
        { label: tNavbar('about'), href: '/about' },
        { label: tNavbar('company'), href: '/contact' },
        { label: t('legal_documents'), href: `/${locale}/legal` },
      ],
    },
    {
      title: t('support_title'),
      links: [
        { label: tNavbar('community'), action: () => scrollToSection('sss') },
        { label: t('email_label'), href: `mailto:${settings.contact_email || 'info@birebiro.com'}` },
      ],
    },
  ];

  const socialLinks = [
    { icon: Twitter, href: settings.social_twitter || '#', label: 'Twitter' },
    { icon: Instagram, href: settings.social_instagram || '#', label: 'Instagram' },
    { icon: Linkedin, href: settings.social_linkedin || '#', label: 'LinkedIn' },
    { icon: Youtube, href: settings.social_youtube || '#', label: 'YouTube' },
    { icon: Github, href: '#', label: 'GitHub' },
  ].filter(link => link.href && link.href !== '#');

  const paymentLogos = [
    { src: 'https://images.hepsiburada.net/assets/footer/visa.svg', alt: 'Visa', width: 51 },
    { src: 'https://images.hepsiburada.net/assets/footer/master-card.svg', alt: 'MasterCard', width: 31 },
    { src: 'https://images.hepsiburada.net/assets/footer/american-express.svg', alt: 'American Express', width: 27 },
    { src: 'https://images.hepsiburada.net/assets/footer/troy.svg', alt: 'Troy', width: 42 },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0a0a0f]">
      {/* Background Gradient */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 size-[400px] rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-6 inline-block">
              <Logo />
            </Link>
            <p className="mb-6 max-w-sm text-gray-400">
              {t('brand_description')}
            </p>

            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map(social => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white"
                  aria-label={social.label}
                >
                  <social.icon className="size-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map(section => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map(link => (
                  <li key={link.label}>
                    {link.href
                      ? (
                          <Link
                            href={link.href}
                            className="text-gray-400 transition-colors hover:text-white"
                          >
                            {link.label}
                          </Link>
                        )
                      : (
                          <button
                            type="button"
                            onClick={link.action}
                            className="text-gray-400 transition-colors hover:text-white"
                          >
                            {link.label}
                          </button>
                        )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-12 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            {settings.copyright_text || t('designed_by')}
          </p>

          {/* Payment Methods */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{t('secure_payment')}</span>
            <div className="flex items-center gap-3">
              {paymentLogos.map(logo => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={logo.alt}
                  loading="lazy"
                  src={logo.src}
                  width={logo.width}
                  alt={logo.alt}
                  className="h-6 w-auto opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
