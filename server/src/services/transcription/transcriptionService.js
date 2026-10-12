import { env } from '../../config/env.js';
import { MockTranscriptionAdapter } from './MockTranscriptionAdapter.js';
import { WhisperTranscriptionAdapter } from './WhisperTranscriptionAdapter.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

const PERMITTED_AUDIO_TYPES = [
  'audio/ogg',
  'audio/ogg; codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/m4a',
  'audio/webm',
];

const MAX_AUDIO_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB

export class TranscriptionService {
  constructor() {
    this.adapter = this.resolveAdapter();
  }

  resolveAdapter() {
    const provider = env.SPEECH_TO_TEXT_PROVIDER || 'mock';

    if (provider === 'whisper' && env.SPEECH_TO_TEXT_API_KEY) {
      logger.info('Using WhisperTranscriptionAdapter for voice notes');
      return new WhisperTranscriptionAdapter(env.SPEECH_TO_TEXT_API_KEY);
    }

    logger.info('Using MockTranscriptionAdapter for voice notes');
    return new MockTranscriptionAdapter();
  }

  /**
   * Transcribe audio buffer into normalized text with confidence rating
   */
  async transcribeAudio({ audioBuffer, mimeType = 'audio/ogg', sampleText = '' }) {
    if (audioBuffer && audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
      throw new AppError(
        `Audio file size (${(audioBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 16MB`,
        400,
        'AUDIO_TOO_LARGE'
      );
    }

    // Clean mime type string (strip parameters)
    const baseMime = (mimeType || 'audio/ogg').split(';')[0].trim().toLowerCase();
    const isPermitted = PERMITTED_AUDIO_TYPES.some((p) => p.startsWith(baseMime));
    if (!isPermitted) {
      logger.warn(`Unusual audio mime type received: ${mimeType}, proceeding with standard decoder`);
    }

    const result = await this.adapter.transcribe({ audioBuffer, mimeType, sampleText });

    // Normalize transcript
    const normalized = result.transcript
      .replace(/\b(uh|um|er|ah)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      transcript: normalized,
      detectedLanguage: result.detectedLanguage || 'hi',
      confidence: result.confidence || 0.9,
      durationSeconds: result.durationSeconds || 10,
      provider: result.provider || 'STT_SERVICE',
      isLowConfidence: (result.confidence || 0.9) < 0.7,
    };
  }
}

export const transcriptionService = new TranscriptionService();
