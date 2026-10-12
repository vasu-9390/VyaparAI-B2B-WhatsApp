import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { USER_ROLES } from '../src/models/User.js';
import { InventoryMovement } from '../src/models/InventoryMovement.js';

let mongoServer;
let ownerToken = '';
let repToken = '';
let orgId = '';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Register an organization with owner
  const regRes = await request(app).post('/api/auth/register').send({
    orgName: 'Surat Textile Weavers',
    slug: 'surat-textile-weavers',
    industry: 'textiles',
    ownerName: 'Haresh Patel',
    email: 'haresh@suratweavers.com',
    password: 'Password12345!',
  });

  ownerToken = regRes.body.data.token;
  orgId = regRes.body.data.organization._id;

  // Create a Sales Rep in this organization
  await request(app)
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Kishore Kumar',
      email: 'kishore@suratweavers.com',
      password: 'RepPassword123!',
      role: USER_ROLES.SALES_REP,
    });

  const repLogin = await request(app).post('/api/auth/login').send({
    email: 'kishore@suratweavers.com',
    password: 'RepPassword123!',
  });
  repToken = repLogin.body.data.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 3: Product Catalog & Inventory Tests', () => {
  let createdProductId = '';

  it('POST /api/products creates a product with variants and Paise pricing', async () => {
    const payload = {
      sku: 'TX-COT-DENIM-01',
      name: 'Surat Premium Indigo Denim 12oz',
      description: '100% Cotton Indigo dyed fabric for trousers',
      category: 'Denim Fabrics',
      brand: 'SuratMills',
      uom: 'meter',
      hsnCode: '5208',
      taxRatePercent: 12,
      costPricePaise: 18000, // ₹ 180.00
      defaultSellingPricePaise: 25000, // ₹ 250.00
      wholesalePricePaise: 22000, // ₹ 220.00
      minSellingPricePaise: 20000, // ₹ 200.00 (floor price)
      variants: [
        {
          sku: 'TX-COT-DENIM-01-BLU-40',
          name: 'Indigo Blue / 40 Width',
          attributes: { color: 'Indigo Blue', size: '40 inch', material: 'Cotton' },
          costPricePaise: 18000,
          sellingPricePaise: 25000,
          availableQuantity: 500,
        },
        {
          sku: 'TX-COT-DENIM-01-BLK-40',
          name: 'Jet Black / 40 Width',
          attributes: { color: 'Jet Black', size: '40 inch', material: 'Cotton' },
          costPricePaise: 18500,
          sellingPricePaise: 26000,
          availableQuantity: 300,
        },
      ],
      reorderThreshold: 100,
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('TX-COT-DENIM-01');
    expect(res.body.data.availableQuantity).toBe(800); // 500 + 300
    expect(res.body.data.variants.length).toBe(2);

    createdProductId = res.body.data._id;
  });

  it('POST /api/products prevents duplicate SKU in the same organization', async () => {
    const duplicatePayload = {
      sku: 'TX-COT-DENIM-01', // Already exists
      name: 'Another Denim',
      category: 'Denim',
      defaultSellingPricePaise: 25000,
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(duplicatePayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('GET /api/products hides confidential costPricePaise from Sales Rep', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const item = res.body.data.find((p) => p._id === createdProductId);
    expect(item).toBeDefined();
    // Sales rep should NOT see costPricePaise
    expect(item.costPricePaise).toBeUndefined();
    expect(item.variants[0].costPricePaise).toBeUndefined();
    // But selling price is visible
    expect(item.defaultSellingPricePaise).toBe(25000);
  });

  it('GET /api/products/:id/availability computes stock and unreserved quantities', async () => {
    const res = await request(app)
      .get(`/api/products/${createdProductId}/availability?variantSku=TX-COT-DENIM-01-BLU-40&quantity=200`)
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.availableQuantity).toBe(500);
    expect(res.body.data.reservedQuantity).toBe(0);
    expect(res.body.data.netAvailableQuantity).toBe(500);
    expect(res.body.data.isAvailable).toBe(true);
  });

  it('POST /api/products/:id/adjust-stock adjusts quantity and records InventoryMovement ledger', async () => {
    const adjustPayload = {
      variantSku: 'TX-COT-DENIM-01-BLU-40',
      quantity: 50,
      movementType: 'PURCHASE_RECEIPT',
      reason: 'Batch mill delivery from loom #4',
    };

    const res = await request(app)
      .post(`/api/products/${createdProductId}/adjust-stock`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(adjustPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.movement.movementType).toBe('PURCHASE_RECEIPT');
    expect(res.body.data.movement.quantity).toBe(50);
    expect(res.body.data.movement.balanceAfter).toBe(550); // 500 + 50

    // Check ledger record in database
    const ledgerEntry = await InventoryMovement.findOne({ productId: createdProductId });
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.balanceAfter).toBe(550);
    expect(ledgerEntry.reason).toBe('Batch mill delivery from loom #4');
  });

  it('POST /api/products/:id/adjust-stock prevents decrementing below zero', async () => {
    const overDeductPayload = {
      variantSku: 'TX-COT-DENIM-01-BLU-40',
      quantity: -9999, // Exceeds available 550
      movementType: 'MANUAL_ADJUSTMENT',
      reason: 'Damaged water leak',
    };

    const res = await request(app)
      .post(`/api/products/${createdProductId}/adjust-stock`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(overDeductPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('GET /api/products/export-csv returns formatted CSV catalog', async () => {
    const res = await request(app)
      .get('/api/products/export-csv')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('SKU,Name,Category,UOM,HSN,SellingPriceINR,AvailableQty,ReservedQty');
    expect(res.text).toContain('TX-COT-DENIM-01');
    expect(res.text).toContain('250'); // Rupee representation of 25000 Paise
  });
});
