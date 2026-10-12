import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { transcriptionService } from '../src/services/transcription/transcriptionService.js';
import { MockTranscriptionAdapter } from '../src/services/transcription/MockTranscriptionAdapter.js';
import { Customer } from '../src/models/Customer.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { Quotation } from '../src/models/Quotation.js';

let mongoServer;
let ownerToken = '';
let sampleProduct = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register organization
  const orgRes = await request(app).post('/api/auth/register').send({
    orgName: 'Morbi Audio Ceramics Ltd',
    slug: 'morbi-audio-ceramics',
    industry: 'ceramics',
    ownerName: 'Pankaj Patel',
    email: 'pankaj@morbiaudio.com',
    password: 'Password12345!',
  });
  ownerToken = orgRes.body.data.token;

  // Add Product (Ceramic Tiles)
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      sku: 'CR-VTR-600',
      name: 'Vitrified Floor Tiles 600x600',
      category: 'Vitrified Tiles',
      defaultSellingPricePaise: 45000,
      costPricePaise: 32000,
      availableQuantity: 2000,
      variants: [
        {
          sku: 'CR-VTR-600-WHT',
          name: 'Glossy White 600x600',
          attributes: { finish: 'glossy', color: 'white' },
          costPricePaise: 32000,
          sellingPricePaise: 45000,
          availableQuantity: 1000,
        },
      ],
    });
  sampleProduct = prodRes.body.data;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 8: Voice Note Transcription & AI Audio Pipeline Tests', () => {
  it('transcribes default Hindi voice sample successfully', async () => {
    const res = await transcriptionService.transcribeAudio({
      audioBuffer: Buffer.from('mock_audio_bytes'),
      mimeType: 'audio/ogg',
    });

    expect(res).toBeDefined();
    expect(res.transcript).toContain('Bhai 200 piece');
    expect(res.detectedLanguage).toBe('hi');
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.isLowConfidence).toBe(false);
  });

  it('detects Gujarati language in Gujarati audio transcripts', async () => {
    const res = await transcriptionService.transcribeAudio({
      audioBuffer: Buffer.from('mock_audio_bytes'),
      mimeType: 'audio/ogg',
      sampleText: 'Mane 500 box glossy white tile joiye che rate daisu',
    });

    expect(res.detectedLanguage).toBe('gu');
    expect(res.transcript).toBe('Mane 500 box glossy white tile joiye che rate daisu');
    expect(res.isLowConfidence).toBe(false);
  });

  it('normalizes transcript by stripping filler words and extra spaces', async () => {
    const res = await transcriptionService.transcribeAudio({
      audioBuffer: Buffer.from('mock_audio_bytes'),
      mimeType: 'audio/ogg',
      sampleText: 'Um  bhai  uh  hume 100 box   tile chahiye er  jaldi',
    });

    expect(res.transcript).toBe('bhai hume 100 box tile chahiye jaldi');
  });

  it('rejects audio files exceeding 16MB limit with 400 AUDIO_TOO_LARGE', async () => {
    // 17MB buffer
    const largeBuffer = Buffer.alloc(17 * 1024 * 1024);

    await expect(
      transcriptionService.transcribeAudio({
        audioBuffer: largeBuffer,
        mimeType: 'audio/ogg',
      })
    ).rejects.toThrow(/exceeds maximum allowed limit of 16MB/);
  });

  it('flags low-confidence transcriptions correctly', async () => {
    // Create custom adapter that simulates low confidence
    const customService = new (class extends transcriptionService.constructor {
      resolveAdapter() {
        return {
          transcribe: async () => ({
            transcript: 'garbled audio background noise',
            detectedLanguage: 'hi',
            confidence: 0.55,
            durationSeconds: 4,
            provider: 'LOW_CONF_MOCK',
          }),
        };
      }
    })();

    const res = await customService.transcribeAudio({
      audioBuffer: Buffer.from('noisy_bytes'),
    });

    expect(res.confidence).toBe(0.55);
    expect(res.isLowConfidence).toBe(true);
  });

  it('POST /api/webhooks/whatsapp ingests WhatsApp audio note, transcribes, and creates quotation via AI', async () => {
    const audioPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_ENTRY_AUDIO_1',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+919999900000',
                  phone_number_id: 'PNID_MORBI_AUDIO_1',
                },
                contacts: [
                  {
                    profile: { name: 'Bhavesh Ceramic Traders' },
                    wa_id: '919876543219',
                  },
                ],
                messages: [
                  {
                    from: '919876543219',
                    id: 'wamid.AUDIO_MORBI_SAMPLE_001',
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: 'audio',
                    audio: {
                      id: 'MEDIA_ID_AUDIO_001',
                      mime_type: 'audio/ogg; codecs=opus',
                      caption: 'Bhai 200 box Vitrified Floor Tiles white glossy chahiye rate batao',
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const res = await request(app).post('/api/webhooks/whatsapp').send(audioPayload);
    expect(res.status).toBe(200);

    // Wait a brief moment for async webhook queue execution
    await new Promise((r) => setTimeout(r, 600));

    // Verify Customer was created
    const customer = await Customer.findOne({ whatsappPhone: '+919876543219' });
    expect(customer).toBeDefined();

    // Verify Message was saved as AUDIO with transcription metadata
    const message = await Message.findOne({ whatsappMessageId: 'wamid.AUDIO_MORBI_SAMPLE_001' });
    expect(message).toBeDefined();
    expect(message.type).toBe('AUDIO');
    expect(message.mediaId).toBe('MEDIA_ID_AUDIO_001');
    expect(message.text).toContain('Vitrified Floor Tiles');
    expect(message.aiExtractedData).toBeDefined();
    expect(message.aiExtractedData.transcription).toBeDefined();
    expect(message.aiExtractedData.transcription.detectedLanguage).toBe('hi');

    // Verify AI Orchestrator created Quotation from the transcribed voice note
    const quotation = await Quotation.findOne({ customerId: customer._id });
    expect(quotation).toBeDefined();
    expect(quotation.lineItems.length).toBeGreaterThan(0);
    expect(quotation.lineItems[0].productName).toContain('Vitrified');
    expect(quotation.grandTotalPaise).toBeGreaterThan(0);

    // Verify Conversation was updated with the active quotation
    const conv = await Conversation.findOne({ customerId: customer._id });
    expect(conv).toBeDefined();
    expect(conv.activeQuotationId?.toString()).toBe(quotation._id.toString());
  });
});
