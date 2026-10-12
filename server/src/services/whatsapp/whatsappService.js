import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const WhatsAppService = {
  isMock() {
    return (
      !env.WHATSAPP_ACCESS_TOKEN ||
      env.WHATSAPP_ACCESS_TOKEN === 'mock_whatsapp_access_token' ||
      env.WHATSAPP_ACCESS_TOKEN === 'your_meta_system_user_access_token' ||
      env.NODE_ENV === 'test'
    );
  },

  /**
   * Format phone number to clean E.164 digits without symbols
   */
  formatPhone(phone) {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  },

  /**
   * Send WhatsApp text message via Meta Cloud API
   */
  async sendTextMessage(toPhone, text) {
    const cleanPhone = this.formatPhone(toPhone);

    if (this.isMock()) {
      logger.info(`[WhatsApp MOCK Outbound] To: ${cleanPhone} | Message: "${text.substring(0, 80)}..."`);
      return {
        success: true,
        messageId: `wamid.HBg${Date.now()}_MOCK`,
        recipient: cleanPhone,
        status: 'accepted',
      };
    }

    try {
      const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id || `wamid.HBg${Date.now()}`;
      return {
        success: true,
        messageId,
        recipient: cleanPhone,
        status: 'accepted',
      };
    } catch (error) {
      logger.error(`Failed to dispatch WhatsApp message to ${cleanPhone}`, error.response?.data || error.message);
      throw new Error(`WhatsApp delivery failed: ${error.response?.data?.error?.message || error.message}`);
    }
  },

  /**
   * Send PDF quotation document via WhatsApp
   */
  async sendDocumentMessage(toPhone, documentUrl, filename = 'Quotation.pdf', caption = '') {
    const cleanPhone = this.formatPhone(toPhone);

    if (this.isMock()) {
      logger.info(`[WhatsApp MOCK Document] To: ${cleanPhone} | Doc: ${filename} | Caption: "${caption}"`);
      return {
        success: true,
        messageId: `wamid.HBgDoc${Date.now()}_MOCK`,
        recipient: cleanPhone,
        status: 'accepted',
      };
    }

    try {
      const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'document',
        document: {
          link: documentUrl,
          filename,
          caption: caption || `Formal B2B Quotation - ${filename}`,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.messages?.[0]?.id || `wamid.HBgDoc${Date.now()}`;
      return {
        success: true,
        messageId,
        recipient: cleanPhone,
        status: 'accepted',
      };
    } catch (error) {
      logger.error(`Failed to dispatch WhatsApp document to ${cleanPhone}`, error.response?.data || error.message);
      throw new Error(`WhatsApp document delivery failed: ${error.response?.data?.error?.message || error.message}`);
    }
  },
};
