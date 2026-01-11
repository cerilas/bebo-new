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
    const netgsmAuth = process.env.NETGSM_AUTHORIZATION;

    if (!netgsmAuth) {
      console.warn('⚠️ NETGSM_AUTHORIZATION is not set. SMS will not be sent.');
      return false;
    }

    const formattedPhone = this.formatPhoneNumber(to);

    if (!formattedPhone) {
      console.warn('⚠️ Invalid phone number for SMS.');
      return false;
    }

    try {
      console.log(`📨 Sending SMS to ${formattedPhone}: ${message}`);

      const response = await fetch('https://api.netgsm.com.tr/sms/rest/v2/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': netgsmAuth,
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
