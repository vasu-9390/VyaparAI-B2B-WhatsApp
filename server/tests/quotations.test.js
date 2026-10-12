import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { USER_ROLES } from '../src/models/User.js';
import { QUOTATION_STATUSES } from '../src/models/Quotation.js';

let mongoServer;
let ownerToken = '';
let salesRepToken = '';
let competitorToken = '';
let sampleProduct = null;
let sampleCustomer = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Organization A (Surat Wholesaler)
  const orgRes = await request(app).post('/api/auth/register').send({
    orgName: 'Surat Royal Fabrics',
    slug: 'surat-royal-fabrics',
    industry: 'textiles',
    ownerName: 'Pankaj Vora',
    email: 'pankaj@royalfabrics.com',
    password: 'Password12345!',
  });
  ownerToken = orgRes.body.data.token;

  // Add Sales Rep
  await request(app)
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Deepak Joshi',
      email: 'deepak@royalfabrics.com',
      password: 'Password12345!',
      role: USER_ROLES.SALES_REP,
    });
  const repLogin = await request(app).post('/api/auth/login').send({
    email: 'deepak@royalfabrics.com',
    password: 'Password12345!',
  });
  salesRepToken = repLogin.body.data.token;

  // Add Sample Product (Cost: ₹ 180, Min: ₹ 200, Selling: ₹ 250)
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      sku: 'SRT-SLK-01',
      name: 'Surat Mulberry Silk Fabric',
      category: 'Silk',
      uom: 'meter',
      hsnCode: '5007',
      taxRatePercent: 12,
      costPricePaise: 18000, // ₹ 180.00
      defaultSellingPricePaise: 25000, // ₹ 250.00
      minSellingPricePaise: 20000, // ₹ 200.00
      availableQuantity: 1000,
    });
  sampleProduct = prodRes.body.data;

  // Add Sample Customer
  const custRes = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Mahesh Agarwal',
      companyName: 'Agarwal Fashion Mart Delhi',
      whatsappPhone: '+919811223344',
      email: 'mahesh@agarwalfashions.com',
      gstin: '07AABCA1234C1Z9',
    });
  sampleCustomer = custRes.body.data;

  // 2. Organization B (Competitor)
  const compRes = await request(app).post('/api/auth/register').send({
    orgName: 'Ahmedabad Comp Textiles',
    slug: 'ahmedabad-comp',
    industry: 'textiles',
    ownerName: 'Kunal Dave',
    email: 'kunal@ahmedabadcomp.com',
    password: 'Password12345!',
  });
  competitorToken = compRes.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 4: Pricing Engine & Quotation Lifecycle Tests', () => {
  let standardQuoteId = '';
  let discountQuoteId = '';

  it('POST /api/quotations creates a standard quotation with deterministic GST math', async () => {
    // 200 meters @ ₹250.00 = ₹50,000.00 (5,000,000 paise)
    // 12% GST = ₹6,000.00 (600,000 paise)
    // Grand Total = ₹56,000.00 (5,600,000 paise)
    // Shipping = ₹1,500.00 (150,000 paise)
    // Final Grand Total = ₹57,500.00 (5,750,000 paise)
    // Cost = 200 * ₹180 = ₹36,000.00
    // Margin = ((50,000 - 36,000) / 50,000) * 100 = 28% (Well above 15% threshold)
    const payload = {
      customerId: sampleCustomer._id,
      items: [
        {
          productId: sampleProduct._id,
          quantity: 200,
          discountPercent: 0,
        },
      ],
      shippingPaise: 150000,
      validityDays: 10,
    };

    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subtotalPaise).toBe(5000000);
    expect(res.body.data.taxTotalPaise).toBe(600000);
    expect(res.body.data.shippingPaise).toBe(150000);
    expect(res.body.data.grandTotalPaise).toBe(5750000);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.DRAFT);
    expect(res.body.data.approvalRequired).toBe(false);
    expect(res.body.data.overallMarginPercent).toBe(28);

    standardQuoteId = res.body.data._id;
  });

  it('POST /api/quotations triggers PENDING_APPROVAL when margin policy is violated', async () => {
    // Quote with 25% discount (exceeds max discount policy of 10% and drives margin below 15%)
    const payload = {
      customerId: sampleCustomer._id,
      items: [
        {
          productId: sampleProduct._id,
          quantity: 100,
          discountPercent: 25, // 25% discount!
        },
      ],
    };

    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesRepToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.PENDING_APPROVAL);
    expect(res.body.data.approvalRequired).toBe(true);
    expect(res.body.data.approvalReason).toContain('exceeds maximum authorized discount');

    discountQuoteId = res.body.data._id;
  });

  it('Sales Rep is BLOCKED (403) from sending quotation pending manager approval', async () => {
    const res = await request(app)
      .post(`/api/quotations/${discountQuoteId}/send`)
      .set('Authorization', `Bearer ${salesRepToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('APPROVAL_REQUIRED');
  });

  it('Business Owner can approve discounted quotation', async () => {
    const res = await request(app)
      .post(`/api/quotations/${discountQuoteId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ note: 'Special discount authorized for strategic Delhi account' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.APPROVED);
    expect(res.body.data.approvalRequired).toBe(false);
  });

  it('GET /api/quotations/:id hides confidential margin & cost details from Sales Rep', async () => {
    const res = await request(app)
      .get(`/api/quotations/${standardQuoteId}`)
      .set('Authorization', `Bearer ${salesRepToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Sales rep should NOT see margin or cost
    expect(res.body.data.overallMarginPercent).toBeUndefined();
    expect(res.body.data.totalCostPaise).toBeUndefined();
    expect(res.body.data.lineItems[0].unitCostPricePaise).toBeUndefined();
  });

  it('POST /api/quotations/:id/send generates PDF with UPI QR code and transitions status to SENT', async () => {
    const res = await request(app)
      .post(`/api/quotations/${standardQuoteId}/send`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.SENT);
    expect(res.body.data.pdfStorageKey).toBeDefined();
    expect(res.body.data.sentAt).toBeDefined();
  });

  it('GET /api/quotations/:id/pdf streams a valid binary PDF document', async () => {
    const res = await request(app)
      .get(`/api/quotations/${standardQuoteId}/pdf`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    // PDF magic bytes header check '%PDF-'
    expect(res.body.toString('utf-8', 0, 5)).toContain('%PDF-');
  });

  it('POST /api/quotations/:id/accept records customer confirmation', async () => {
    const res = await request(app)
      .post(`/api/quotations/${standardQuoteId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.ACCEPTED);
    expect(res.body.data.acceptedAt).toBeDefined();
  });

  it('POST /api/quotations/:id/reject records rejection with reason', async () => {
    const res = await request(app)
      .post(`/api/quotations/${discountQuoteId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Customer found alternate supplier with faster delivery' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(QUOTATION_STATUSES.REJECTED);
    expect(res.body.data.rejectedReason).toBe('Customer found alternate supplier with faster delivery');
  });

  it('Multi-tenancy isolation: Competitor cannot access or view quotations', async () => {
    const res = await request(app)
      .get(`/api/quotations/${standardQuoteId}`)
      .set('Authorization', `Bearer ${competitorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
