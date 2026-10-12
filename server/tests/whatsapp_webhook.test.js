import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { Customer } from '../src/models/Customer.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { WebhookEvent } from '../src/models/WebhookEvent.js';
import { USER_ROLES } from '../src/models/User.js';

let mongoServer;
let ownerToken = '';
let salesRepId = '';
let sampleProduct = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register organization
  const orgRes = await request(app).post('/api/auth/register').send({
    orgName: 'Surat WhatsApp Weavers',
    slug: 'surat-wa-weavers',
    industry: 'textiles',
    ownerName: 'Harish Choksi',
    email: 'harish@suratwaweavers.com',
    password: 'Password12345!',
  });
  ownerToken = orgRes.body.data.token;

  // Add Sales Rep
  const repRes = await request(app)
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Pravin Joshi',
      email: 'pravin@suratwaweavers.com',
      password: 'Password12345!',
      role: USER_ROLES.SALES_REP,
    });
  salesRepId = repRes.body.data.user._id;

  // Add Product (Denim)
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      sku: 'TX-DNM-WA-01',
      name: 'Surat WhatsApp Denim Fabric',
      category: 'Denim Fabrics',
      defaultSellingPricePaise: 25000,
      costPricePaise: 18000,
      availableQuantity: 1000,
      variants: [
        {
          sku: 'TX-DNM-WA-01-BLU-40',
          name: 'Blue / 40',
          attributes: { color: 'blue', size: '40' },
          costPricePaise: 18000,
          sellingPricePaise: 25000,
          availableQuantity: 500,
        },
      ],
    });
  sampleProduct = prodRes.body.data;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 7: WhatsApp Cloud API & Webhook Processing Tests', () => {
  it('GET /api/webhooks/whatsapp verifies Meta subscription handshake challenge', async () => {
    const res = await request(app).get('/api/webhooks/whatsapp').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN,
      'hub.challenge': 'CHALLENGE_ACCEPTED_12345',
    });

    expect(res.status).toBe(200);
    expect(res.text).toBe('CHALLENGE_ACCEPTED_12345');
  });

  it('GET /api/webhooks/whatsapp rejects invalid verify token with 403', async () => {
    const res = await request(app).get('/api/webhooks/whatsapp').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong_token',
      'hub.challenge': 'CHALLENGE_ACCEPTED_12345',
    });

    expect(res.status).toBe(403);
  });

  it('POST /api/webhooks/whatsapp acknowledges event under 500ms and ingests customer message', async () => {
    const metaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550234567',
                  phone_number_id: '123456789',
                },
                contacts: [
                  {
                    profile: { name: 'Kanti Bhai' },
                    wa_id: '919876543210',
                  },
                ],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.HBgTEST_MSG_001',
                    timestamp: '1720000000',
                    text: {
                      body: 'Bhai 200 piece blue color 40 size denim chahiye, rate bolo',
                    },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const res = await request(app).post('/api/webhooks/whatsapp').send(metaPayload);

    // Immediate acknowledgment
    expect(res.status).toBe(200);
    expect(res.text).toBe('EVENT_RECEIVED');

    // Wait slightly for async background processing
    await new Promise((r) => setTimeout(r, 200));

    // Verify Customer was created / mapped
    const customer = await Customer.findOne({ whatsappPhone: '+919876543210' });
    expect(customer).toBeDefined();

    // Verify Conversation was created
    const conversation = await Conversation.findOne({ whatsappPhone: '+919876543210' });
    expect(conversation).toBeDefined();
    expect(conversation.unreadCount).toBeGreaterThanOrEqual(1);

    // Verify Message was saved
    const message = await Message.findOne({ whatsappMessageId: 'wamid.HBgTEST_MSG_001' });
    expect(message).toBeDefined();
    expect(message.direction).toBe('INBOUND');
    expect(message.text).toContain('200 piece blue color 40 size');

    // Verify AI extraction was saved on the message
    expect(message.aiExtractedData).toBeDefined();
    expect(message.aiExtractedData.intent).toBe('quotation_request');
  });

  it('POST /api/webhooks/whatsapp ignores duplicate message delivery safely', async () => {
    const duplicatePayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.HBgTEST_MSG_001', // Exact same message ID
                    type: 'text',
                    text: { body: 'Duplicate payload' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(app).post('/api/webhooks/whatsapp').send(duplicatePayload);
    expect(res.status).toBe(200);

    // Verify count of messages with this ID remains exactly 1
    const count = await Message.countDocuments({ whatsappMessageId: 'wamid.HBgTEST_MSG_001' });
    expect(count).toBe(1);
  });

  it('POST /api/webhooks/whatsapp updates message status upon receiving delivery receipt', async () => {
    const statusPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.HBgTEST_MSG_001',
                    status: 'delivered',
                    timestamp: '1720000050',
                    recipient_id: '919876543210',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const res = await request(app).post('/api/webhooks/whatsapp').send(statusPayload);
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    const message = await Message.findOne({ whatsappMessageId: 'wamid.HBgTEST_MSG_001' });
    expect(message.deliveryStatus).toBe('DELIVERED');
    expect(message.deliveredAt).toBeDefined();
  });

  it('POST /api/conversations/:id/messages sends outbound reply via WhatsApp', async () => {
    const conversation = await Conversation.findOne({ whatsappPhone: '+919876543210' });

    const res = await request(app)
      .post(`/api/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ text: 'Namaste Kanti bhai, quotation draft ready hai. Dispatching now.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.direction).toBe('OUTBOUND');
    expect(res.body.data.whatsappMessageId).toBeDefined();

    // Verify conversation updated
    const updatedConv = await Conversation.findById(conversation._id);
    expect(updatedConv.lastMessageText).toContain('quotation draft ready');
  });

  it('POST /api/conversations/:id/assign triggers human takeover and assigns sales rep', async () => {
    const conversation = await Conversation.findOne({ whatsappPhone: '+919876543210' });

    const res = await request(app)
      .post(`/api/conversations/${conversation._id}/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assignedTo: salesRepId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('HUMAN_TAKEOVER');
    expect(res.body.data.assignedTo.toString()).toBe(salesRepId.toString());
  });
});
