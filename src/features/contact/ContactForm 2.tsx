'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { submitContactForm } from '@/features/contact/contactActions';

export default function ContactForm() {
  const t = useTranslations('Contact');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('message', formData.message);

      const result = await submitContactForm(formDataToSend);

      if (result && !result.success) {
        setError(result.error || 'Bir hata oluştu');
      } else {
        setIsSuccess(true);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-card p-8 shadow-lg dark:bg-slate-900 dark:ring-1 dark:ring-white/10">
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto size-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-green-800 dark:text-green-400">
            {t('success_title')}
          </h2>
          <p className="mb-6 text-muted-foreground dark:text-gray-400">
            {t('success_message')}
          </p>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {t('send_another_message')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-8 shadow-lg dark:bg-slate-900 dark:ring-1 dark:ring-white/10">
      <h2 className="mb-6 text-2xl font-bold text-foreground dark:text-white">
        {t('form_title')}
      </h2>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ad Soyad */}
        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-foreground dark:text-gray-300">
            {t('full_name')}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t('full_name_placeholder')}
          />
        </div>

        {/* E-posta */}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground dark:text-gray-300">
            {t('email')}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t('email_placeholder')}
          />
        </div>

        {/* Telefon */}
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground dark:text-gray-300">
            {t('phone')}
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t('phone_placeholder')}
          />
        </div>

        {/* Konu */}
        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-medium text-foreground dark:text-gray-300">
            {t('subject')}
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t('subject_placeholder')}
          />
        </div>

        {/* Mesaj */}
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-foreground dark:text-gray-300">
            {t('message')}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            value={formData.message}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder={t('message_placeholder')}
          />
        </div>

        {/* Gönder Butonu */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-slate-800"
          >
            {isLoading ? t('sending_button') : t('submit_button')}
          </button>
        </div>
      </form>
    </div>
  );
}
