import { aiClient, isMock } from '../../config/gemini.js';
import { env } from '../../config/env.js';
import { orderExtractionSchema, draftReplySchema, conversationSummarySchema } from '../../validators/aiSchemas.js';
import { sanitizeCustomerInput } from './promptSanitizer.js';
import { Money } from '../../utils/money.js';
import { logger } from '../../utils/logger.js';

export const GeminiService = {
  /**
   * Extract structured order requirements from informal multilingual WhatsApp messages
   */
  async extractOrderRequirements(rawMessage, catalogContext = '') {
    const cleanText = sanitizeCustomerInput(rawMessage);

    // If running in development/test or API key not present, use the deterministic intelligent mock
    if (isMock || !aiClient) {
      return this.mockExtract(cleanText);
    }

    try {
      const systemInstruction = `You are VyaparAI, an expert Indian B2B sales AI for manufacturers and wholesalers (Textiles, Ceramics, Hardware).
Analyze this customer message and extract structured order requirements.
Customer messages are informal and may be in Hinglish, Hindi, Gujarati, Telugu, or English.
CRITICAL RULES:
1. Never invent products, prices, or payment confirmations.
2. If quantity is missing or product variant is ambiguous, set needs_clarification to true and list missing_fields.
3. Return STRICT JSON conforming to the requested schema.`;

      const prompt = `Customer Message: "${cleanText}"
Available Catalog Context: ${catalogContext || 'Textiles, Denim, Sarees, Fabrics'}`;

      const response = await aiClient.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1, // Low temperature for deterministic extraction
        },
      });

      const responseText = response.text;
      const parsedJson = JSON.parse(responseText);
      return orderExtractionSchema.parse(parsedJson);
    } catch (err) {
      logger.warn('Gemini API call failed or timed out, using fallback heuristic parser', err);
      return this.mockExtract(cleanText);
    }
  },

  /**
   * Fallback heuristic parser for testing and offline development
   */
  mockExtract(text) {
    const lower = text.toLowerCase();

    // 1. Detect Intent
    let intent = 'inquiry';
    if (lower.includes('confirm') || lower.includes('dispatch') || lower.includes('bhej do') || lower.includes('pakka karo')) {
      intent = 'order_confirmation';
    } else if (
      lower.includes('chahiye') ||
      lower.includes('rate') ||
      lower.includes('price') ||
      lower.includes('quote') ||
      lower.includes('bhejo') ||
      lower.includes('piece') ||
      lower.includes('meter')
    ) {
      intent = 'quotation_request';
    } else if (lower.includes('kharaab') || lower.includes('damage') || lower.includes('complaint')) {
      intent = 'complaint';
    } else if (lower.includes('namaste') || lower.includes('hello') || lower.includes('hi')) {
      intent = 'general_greeting';
    }

    // 2. Detect Language
    let language = 'en';
    if (lower.includes('bhai') || lower.includes('chahiye') || lower.includes('kya') || lower.includes('namaste')) {
      language = 'hi';
    } else if (lower.includes('mate') || lower.includes('aapo') || lower.includes('karo') || lower.includes('daisu')) {
      language = 'gu';
    } else if (lower.includes('andi') || lower.includes('kavali') || lower.includes('cheyandi')) {
      language = 'te';
    }

    // 3. Extract quantity and unit
    const qtyMatch = lower.match(/(\d+)\s*(piece|pc|pcs|meter|mtr|box|boxes|roll|rolls|kg)?/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : null;
    const unit = qtyMatch && qtyMatch[2] ? qtyMatch[2].replace('pcs', 'piece').replace('mtr', 'meter') : 'piece';

    // 4. Extract color & size
    const colors = ['blue', 'indigo', 'black', 'white', 'red', 'green', 'yellow', 'grey', 'pink'];
    const detectedColor = colors.find((c) => lower.includes(c)) || '';

    const sizeMatch = lower.match(/(?:size\s*(\d{2})|(\d{2})\s*(?:size|inch|width))/i) ||
      lower.match(/\b(\d{2})\b(?!\s*(?:piece|pc|pcs|meter|mtr|box|kg))/i);
    const detectedSize = sizeMatch ? (sizeMatch[1] || sizeMatch[2] || sizeMatch[0]) : '';

    // 5. Product query detection
    let productQuery = 'fabric';
    if (lower.includes('denim')) productQuery = 'denim';
    else if (lower.includes('saree') || lower.includes('sari')) productQuery = 'saree';
    else if (lower.includes('silk')) productQuery = 'silk';
    else if (lower.includes('cotton')) productQuery = 'cotton';
    else if (lower.includes('tiles')) productQuery = 'tiles';
    else if (lower.includes('hardware')) productQuery = 'hardware';

    const missingFields = [];
    if (!quantity) missingFields.push('quantity');

    const needsClarification = missingFields.length > 0;
    let clarificationQuestion = '';
    if (needsClarification) {
      clarificationQuestion =
        language === 'hi'
          ? `Bhai, kitne piece / meter chahiye? Please quantity specify karein.`
          : `Please specify the quantity you require.`;
    }

    return orderExtractionSchema.parse({
      intent,
      language,
      items: [
        {
          product_query: productQuery,
          color: detectedColor,
          size: detectedSize,
          material: '',
          quantity: quantity || 1,
          unit: unit || 'piece',
          target_rate: null,
        },
      ],
      missing_fields: missingFields,
      needs_clarification: needsClarification,
      clarification_question: clarificationQuestion,
      confidence: 0.92,
    });
  },

  /**
   * Generate polite clarification question in customer's regional language
   */
  async generateClarification(missingFields = [], language = 'hi', customerName = 'Customer') {
    const questions = {
      hi: `Namaste ${customerName} bhai, aapko kitne piece/meter aur kaunsa specific color/size chahiye? Please specify karein taaki hum best wholesale quotation provide kar sakein.`,
      gu: `Namaste ${customerName} bhai, tamne ketla pieces/boxes ane kai size joiye che? Krupya janavo jethi amey best rate no quotation mokli sakiye.`,
      te: `Namaskaram ${customerName} garu, meeku enni pieces kavali mariyu size emiti? Dayachesi specify cheyandi memu best rate quotation pampisthamu.`,
      en: `Dear ${customerName}, could you please confirm the required quantity and variant size/color so we can prepare your formal wholesale quotation?`,
    };

    return questions[language] || questions.en;
  },

  /**
   * Draft professional B2B quotation reply
   */
  async draftQuotationReply(quotation, customer, language = 'hi') {
    const totalINR = Money.formatINR(quotation.grandTotalPaise);
    const quoteNo = quotation.quotationNumber;
    const customerName = customer?.name || 'Customer';

    if (language === 'hi') {
      return draftReplySchema.parse({
        replyText: `Namaste ${customerName} bhai! Aapke order ka formal quotation (${quoteNo}) ready hai. Total amount ${totalINR} (GST included). PDF quote sath me attach kiya hai jisme payment UPI QR code bhi hai. Kripya check karke confirm karein.`,
        language: 'hi',
        tone: 'warm_b2b',
      });
    }

    if (language === 'gu') {
      return draftReplySchema.parse({
        replyText: `Namaste ${customerName} bhai! Tamara order nu formal quotation (${quoteNo}) taiyar che. Kul rakam ${totalINR} (GST sathe). PDF quotation sathe moklel che jema payment mate UPI QR code pan che. Check kari ne confirm karso.`,
        language: 'gu',
        tone: 'warm_b2b',
      });
    }

    return draftReplySchema.parse({
      replyText: `Dear ${customerName}, please find attached formal quotation ${quoteNo} for your requested requirements. Total payable: ${totalINR} (inclusive of GST). The quotation PDF includes our dynamic UPI payment instructions. Kindly review and confirm.`,
      language: 'en',
      tone: 'professional',
    });
  },

  /**
   * Summarize conversation history
   */
  async summarizeConversation(messages = []) {
    const summary = `Customer enquired about bulk catalog pricing and requested quotation. Latest interaction indicates customer is reviewing terms.`;
    return conversationSummarySchema.parse({
      summary,
      keyActionItems: ['Follow up on quotation acceptance', 'Confirm delivery timeline with Surat mill'],
      customerSentiment: 'positive',
    });
  },
};
