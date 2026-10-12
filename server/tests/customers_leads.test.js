import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { USER_ROLES } from '../src/models/User.js';

let mongoServer;
let orgAToken = '';
let orgBToken = '';
let orgAOwnerId = '';
let orgASalesRepId = '';
let sampleProductId = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Setup Organization A (Surat Wholesaler)
  const orgARes = await request(app).post('/api/auth/register').send({
    orgName: 'Surat Saree Wholesalers',
    slug: 'surat-saree-wholesalers',
    industry: 'textiles',
    ownerName: 'Vipul Shah',
    email: 'vipul@suratsaree.com',
    password: 'Password12345!',
  });
  orgAToken = orgARes.body.data.token;
  orgAOwnerId = orgARes.body.data.user._id;

  // Add a Sales Rep to Org A
  const repRes = await request(app)
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${orgAToken}`)
    .send({
      name: 'Ramesh Mehta',
      email: 'ramesh@suratsaree.com',
      password: 'Password12345!',
      role: USER_ROLES.SALES_REP,
    });
  orgASalesRepId = repRes.body.data.user._id;

  // Create a product in Org A
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${orgAToken}`)
    .send({
      sku: 'SRT-GEO-001',
      name: 'Pure Georgette Printed Saree',
      category: 'Georgette Sarees',
      defaultSellingPricePaise: 150000, // ₹ 1,500.00
      costPricePaise: 90000, // ₹ 900.00
      minSellingPricePaise: 110000, // ₹ 1,100.00
      availableQuantity: 300,
    });
  sampleProductId = prodRes.body.data._id;

  // 2. Setup Organization B (Competitor Morbi Distributor)
  const orgBRes = await request(app).post('/api/auth/register').send({
    orgName: 'Morbi Sanitary Hub',
    slug: 'morbi-sanitary-hub',
    industry: 'ceramics',
    ownerName: 'Dinesh Patel',
    email: 'dinesh@morbihub.com',
    password: 'Password12345!',
  });
  orgBToken = orgBRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 3: Customer & Lead Management Tests', () => {
  let createdCustomerId = '';
  let createdLeadId = '';

  it('POST /api/customers registers a B2B customer with custom pricing and credit limits', async () => {
    const payload = {
      name: 'Suresh Singhania',
      companyName: 'Singhania Silk Stores Ahmedabad',
      whatsappPhone: '+919876501234',
      email: 'suresh@singhaniasilk.com',
      gstin: '24AABCS1429B1ZX',
      category: 'WHOLESALER',
      creditLimitPaise: 50000000, // ₹ 5,00,000.00
      creditDays: 45,
      customPricingRules: [
        {
          productId: sampleProductId,
          customPricePaise: 135000, // Negotiated ₹ 1,350.00 instead of ₹ 1,500.00
          notes: 'Agreed 10% volume discount for Ahmedabad branches',
        },
      ],
      tags: ['prompt-payer', 'ahmedabad-tier1'],
    };

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyName).toBe('Singhania Silk Stores Ahmedabad');
    expect(res.body.data.creditLimitPaise).toBe(50000000);
    expect(res.body.data.customPricingRules.length).toBe(1);

    createdCustomerId = res.body.data._id;
  });

  it('POST /api/customers rejects duplicate WhatsApp phone within the same organization', async () => {
    const duplicatePhonePayload = {
      name: 'Duplicate Contact',
      companyName: 'Singhania Branch 2',
      whatsappPhone: '+919876501234', // Same phone as above
    };

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send(duplicatePhonePayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_PHONE');
  });

  it('GET /api/customers/:id/pricing/:productId returns the customer negotiated pricing rule', async () => {
    const res = await request(app)
      .get(`/api/customers/${createdCustomerId}/pricing/${sampleProductId}`)
      .set('Authorization', `Bearer ${orgAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.catalogPricePaise).toBe(150000);
    expect(res.body.data.effectivePricePaise).toBe(135000); // Special customer price
    expect(res.body.data.isSpecialPricing).toBe(true);
    expect(res.body.data.creditDays).toBe(45);
  });

  it('POST /api/leads creates an enquiry pipeline card linked to the customer', async () => {
    const payload = {
      customerId: createdCustomerId,
      source: 'WHATSAPP',
      status: 'NEW',
      priority: 'HIGH',
      assignedTo: orgASalesRepId,
      requestedProducts: [
        {
          query: 'georgette printed sarees 50 pieces',
          productId: sampleProductId,
          quantity: 50,
          estimatedBudgetPaise: 6750000,
        },
      ],
      tags: ['wedding-season', 'bulk-request'],
    };

    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('HIGH');
    expect(res.body.data.customerId.companyName).toBe('Singhania Silk Stores Ahmedabad');
    expect(res.body.data.assignedTo._id.toString()).toBe(orgASalesRepId.toString());

    createdLeadId = res.body.data._id;
  });

  it('POST /api/leads/:id/notes logs interaction history on the lead timeline', async () => {
    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/notes`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ text: 'Customer requested sample swatches for peacock blue design via WhatsApp' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const lastNote = res.body.data[res.body.data.length - 1];
    expect(lastNote.text).toContain('sample swatches');
  });

  it('POST /api/leads/:id/assign reassigns lead to another sales representative', async () => {
    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/assign`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ assignedTo: orgAOwnerId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedTo.toString()).toBe(orgAOwnerId.toString());
  });

  it('Multi-tenancy isolation: Organization B CANNOT access Organization A customers or leads', async () => {
    // Org B attempts to read Org A customer
    const customerRes = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${orgBToken}`);

    expect(customerRes.status).toBe(404);
    expect(customerRes.body.success).toBe(false);

    // Org B attempts to read Org A lead
    const leadRes = await request(app)
      .get(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${orgBToken}`);

    expect(leadRes.status).toBe(404);
    expect(leadRes.body.success).toBe(false);
  });
});
