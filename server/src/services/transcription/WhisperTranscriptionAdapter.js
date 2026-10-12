import axios from 'axios';
import { logger } from '../../utils/logger.js';

export class WhisperTranscriptionAdapter {
  constructor(apiKey, apiUrl = 'https://api.openai.com/v1/audio/transcriptions') {
    this.name = 'WHISPER_STT';
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async transcribe({ audioBuffer, mimeType = 'audio/ogg' }) {
    if (!this.apiKey) {
      throw new Error('Whisper API key is required for WhisperTranscriptionAdapter');
    }

    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: 'voice_note.ogg',
        contentType: mimeType,
      });
      form.append('model', 'whisper-1');
      form.append('prompt', 'Indian B2B wholesale quotation enquiry in Hindi, Gujarati, Telugu, or English');

      const response = await axios.post(this.apiUrl, form, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 25000,
      });

      const text = response.data?.text || '';
      return {
        transcript: text.trim(),
        detectedLanguage: response.data?.language || 'en',
        confidence: 0.92,
        durationSeconds: response.data?.duration || 10,
        provider: this.name,
      };
    } catch (err) {
      logger.error('Whisper transcription failed', err.response?.data || err.message);
      throw new Error(`Whisper transcription failed: ${err.message}`);
    }
  }
}
