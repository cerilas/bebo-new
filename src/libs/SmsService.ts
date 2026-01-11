import { Buffer } from 'node:buffer';

import { Env } from '@/libs/Env';

export const SmsService = {
  /**
   * Formats a phone number for Netgsm API
   * Removes leading + and 90, ensures 10 digit format if possible
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) {
      return '';
    }
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 90, remove it (Turkey country code)
    if (cleaned.startsWith('90') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    }

    // If starts with 0, remove it (local prefix)
    if (cleaned.startsWith('0') && cleaned.length > 10) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  },

  /**
   * Sends an SMS using Netgsm API
   * @param to Phone number
   * @param message Message content
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    const username = Env.NETGSM_USERNAME;
    const password = Env.NETGSM_PASSWORD;

    // Construct Basic Auth Header
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const formattedPhone = this.formatPhoneNumber(to);

    if (!formattedPhone) {
      console.warn('⚠️ Invalid phone number for SMS:', to);
      return false;
    }

    try {
      console.log(`📨 Sending SMS via Netgsm...`);
      console.log(`To (Raw): ${to}`);
      console.log(`To (Formatted): ${formattedPhone}`);

      const response = await fetch('https://api.netgsm.com.tr/sms/rest/v2/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          msgheader: 'birebiro',
          msg: message,
          no: formattedPhone,
        }),
      });

      const result = await response.text();
      console.log('✅ Netgsm SMS response:', result);
      return true;
    } catch (error) {
      console.error('❌ Error sending SMS via Netgsm:', error);
      return false;
    }
  },
};
