import { logger } from '../../utils/logger.js';

export class MockTranscriptionAdapter {
  constructor() {
    this.name = 'MOCK_STT';
  }

  async transcribe({ audioBuffer, mimeType = 'audio/ogg', sampleText = '' }) {
    logger.info(`[MockTranscriptionAdapter] Transcribing audio buffer (${audioBuffer ? audioBuffer.length : 0} bytes)`);

    // If sample text provided (e.g. in test or webhook simulation)
    if (sampleText) {
      const lower = sampleText.toLowerCase();
      let detectedLanguage = 'en';
      if (lower.includes('bhai') || lower.includes('chahiye') || lower.includes('kya')) {
        detectedLanguage = 'hi';
      } else if (lower.includes('mate') || lower.includes('joiye') || lower.includes('karo') || lower.includes('daisu')) {
        detectedLanguage = 'gu';
      } else if (lower.includes('kavali') || lower.includes('andi')) {
        detectedLanguage = 'te';
      }

      return {
        transcript: sampleText,
        detectedLanguage,
        confidence: 0.94,
        durationSeconds: 8,
        provider: this.name,
      };
    }

    // Default realistic B2B sample
    return {
      transcript: 'Bhai 200 piece blue color 40 size denim chahiye, jaldi quotation bhejo',
      detectedLanguage: 'hi',
      confidence: 0.95,
      durationSeconds: 12,
      provider: this.name,
    };
  }
}
