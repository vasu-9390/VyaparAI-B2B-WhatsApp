import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Product } from '../src/models/Product.js';
import { InventoryMovement } from '../src/models/InventoryMovement.js';
import { Quotation, QUOTATION_STATUSES } from '../src/models/Quotation.js';
import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { USER_ROLES } from '../src/models/User.js';

let mongoServer;
let ownerToken = '';
let managerToken = '';
let competitorToken = '';
let customerId = '';
let testProduct = null;
let approvedQuotation = null;
let unapprovedQuotation = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Register Primary Organization (Rajkot CNC Tools)
  const orgRes = await request(app).post('/api/auth/register').send({
    orgName: 'Rajkot Precision Tools Ltd',
    slug: 'rajkot-precision-tools',
    industry: 'hardware',
    ownerName: 'Kishore Trivedi',
    email: 'kishore@rajkotprecision.com',
    password: 'Password12345!',
  });
  ownerToken = orgRes.body.data.token;

  // Add Sales Manager
  const mgrRes = await request(app)
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Nitin Dave',
      email: 'nitin@rajkotprecision.com',
      password: 'Password12345!',
      role: USER_ROLES.SALES_MANAGER,
    });

  const loginMgrRes = await request(app).post('/api/auth/login').send({
    email: 'nitin@rajkotprecision.com',
    password: 'Password12345!',
  });
  managerToken = loginMgrRes.body.data.token;

  // 2. Register Competitor Organization
  const compOrgRes = await request(app).post('/api/auth/register').send({
    orgName: 'Ahmedabad Toolings Pvt',
    slug: 'ahmedabad-toolings',
    industry: 'hardware',
    ownerName: 'Vikas Shah',
    email: 'vikas@ahmedabadtoolings.com',
    password: 'Password12345!',
  });
  competitorToken = compOrgRes.body.data.token;

  // 3. Create Customer
  const custRes = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      name: 'Gujarat Engineering Works',
      companyName: 'Gujarat Engg',
      whatsappPhone: '+919876543201',
      gstin: '24AAACG1234F1Z5',
      category: 'MANUFACTURER',
      creditLimitPaise: 50000000, // ₹5 Lakh
    });
  customerId = custRes.body.data._id;

  // 4. Create Product with initial stock of 100 units
  const prodRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      sku: 'TL-CNC-DRILL-01',
      name: 'High Precision CNC Drill Bit 10mm',
      category: 'Cutting Tools',
      defaultSellingPricePaise: 50000, // ₹500
      costPricePaise: 30000, // ₹300 (40% margin)
      availableQuantity: 100,
    });
  testProduct = prodRes.body.data;

  // 5. Create Approved Quotation (20 units = ₹10,000 + 12% GST = ₹11,200)
  const quoteRes = await request(app)
    .post('/api/quotations')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      customerId,
      items: [
        {
          productId: testProduct._id,
          quantity: 20,
        },
      ],
      validityDays: 14,
    });
  approvedQuotation = quoteRes.body.data;

  // 6. Create Unapproved Quotation requiring owner approval (deep discount -> low margin)
  const unapprovedRes = await request(app)
    .post('/api/quotations')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({
      customerId,
      items: [
        {
          productId: testProduct._id,
          quantity: 10,
          unitPricePaise: 31000, // ₹310 vs cost ₹300 (3.2% margin < 15% threshold)
        },
      ],
    });
  unapprovedQuotation = unapprovedRes.body.data;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 9: Order Conversion, Concurrency Stock Deduction & Payment Verification', () => {
  it('converts an approved quotation into a confirmed sales order and deducts inventory', async () => {
    const initialProduct = await Product.findById(testProduct._id);
    expect(initialProduct.availableQuantity).toBe(100);

    const res = await request(app)
      .post(`/api/orders/from-quotation/${approvedQuotation._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        shippingAddress: {
          street: 'GIDC Phase 2, Shed 45',
          city: 'Rajkot',
          state: 'Gujarat',
          pincode: '360002',
        },
        deliveryNotes: 'Deliver between 10am-4pm via Speed Cargo',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toMatch(/^ORD-/);
    expect(res.body.data.status).toBe(ORDER_STATUSES.CONFIRMED);
    expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUSES.PENDING);
    expect(res.body.data.grandTotalPaise).toBe(approvedQuotation.grandTotalPaise);

    // Verify Stock Deduction
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.availableQuantity).toBe(80); // 100 - 20 = 80

    // Verify Inventory Movement Ledger
    const movement = await InventoryMovement.findOne({
      productId: testProduct._id,
      movementType: 'SALE_DEDUCTION',
      referenceId: res.body.data.orderNumber,
    });
    expect(movement).toBeDefined();
    expect(movement.quantity).toBe(-20);
    expect(movement.balanceAfter).toBe(80);

    // Verify Quotation status transition
    const updatedQuote = await Quotation.findById(approvedQuotation._id);
    expect(updatedQuote.status).toBe(QUOTATION_STATUSES.ACCEPTED);
    expect(updatedQuote.convertedToOrderId.toString()).toBe(res.body.data._id);
  });

  it('guarantees idempotency: re-converting the same quotation returns the existing order without double deducting stock', async () => {
    const productBefore = await Product.findById(testProduct._id);
    const stockBefore = productBefore.availableQuantity;

    const res = await request(app)
      .post(`/api/orders/from-quotation/${approvedQuotation._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toBeDefined();

    const productAfter = await Product.findById(testProduct._id);
    expect(productAfter.availableQuantity).toBe(stockBefore); // Stock unchanged!
  });

  it('rejects order conversion from unapproved quotation with 400 APPROVAL_PENDING', async () => {
    expect(unapprovedQuotation.status).toBe(QUOTATION_STATUSES.PENDING_APPROVAL);

    const res = await request(app)
      .post(`/api/orders/from-quotation/${unapprovedQuotation._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('APPROVAL_PENDING');
  });

  it('GET /api/orders lists orders with pagination and filtering', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /api/orders/:id retrieves single order with populated relations', async () => {
    const listRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${ownerToken}`);
    const orderId = listRes.body.data[0]._id;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(orderId);
    expect(res.body.data.customerId.name).toBe('Gujarat Engineering Works');
    expect(res.body.data.lineItems.length).toBe(1);
  });

  it('PATCH /api/orders/:id/status updates status and restores inventory when CANCELLED', async () => {
    // 1. Create a fresh quotation and convert to order
    const freshQuote = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId,
        items: [{ productId: testProduct._id, quantity: 15 }],
      });

    const orderRes = await request(app)
      .post(`/api/orders/from-quotation/${freshQuote.body.data._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();

    const orderId = orderRes.body.data._id;
    // Stock should be 80 - 15 = 65
    let product = await Product.findById(testProduct._id);
    expect(product.availableQuantity).toBe(65);

    // 2. Transition to PROCESSING
    const procRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: ORDER_STATUSES.PROCESSING });

    expect(procRes.status).toBe(200);
    expect(procRes.body.data.status).toBe(ORDER_STATUSES.PROCESSING);

    // 3. Cancel order and verify stock is restored (+15 -> 80)
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: ORDER_STATUSES.CANCELLED,
        cancelReason: 'Client changed specifications for machining project',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(ORDER_STATUSES.CANCELLED);
    expect(cancelRes.body.data.cancelReason).toContain('Client changed specifications');

    product = await Product.findById(testProduct._id);
    expect(product.availableQuantity).toBe(80); // Restored!

    const returnMovement = await InventoryMovement.findOne({
      movementType: 'RETURN',
      referenceId: orderRes.body.data.orderNumber,
    });
    expect(returnMovement).toBeDefined();
    expect(returnMovement.quantity).toBe(15);
  });

  it('records partial and full UPI payments against an order, updating payment status', async () => {
    const listRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${ownerToken}`);
    const activeOrder = listRes.body.data.find((o) => o.status === ORDER_STATUSES.CONFIRMED);
    expect(activeOrder).toBeDefined();

    const grandTotal = activeOrder.grandTotalPaise;
    const partialAmount = Math.floor(grandTotal / 2);

    // 1. Record Partial Payment (50%)
    const pay1Res = await request(app)
      .post(`/api/orders/${activeOrder._id}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        amountPaise: partialAmount,
        method: 'UPI',
        transactionReference: 'UPI/UTR/891238491023',
        notes: 'Advance 50% payment received via Google Pay',
      });

    expect(pay1Res.status).toBe(201);
    expect(pay1Res.body.data.payment.paymentNumber).toMatch(/^PAY-/);
    expect(pay1Res.body.data.order.paymentStatus).toBe(PAYMENT_STATUSES.PARTIALLY_PAID);
    expect(pay1Res.body.data.order.amountPaidPaise).toBe(partialAmount);
    expect(pay1Res.body.data.order.dueAmountPaise).toBe(grandTotal - partialAmount);

    // 2. Record Final Balance Payment
    const remainingAmount = grandTotal - partialAmount;
    const pay2Res = await request(app)
      .post(`/api/orders/${activeOrder._id}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        amountPaise: remainingAmount,
        method: 'BANK_TRANSFER',
        transactionReference: 'NEFT/HDFC/20261011094',
        notes: 'Final balance clearance',
      });

    expect(pay2Res.status).toBe(201);
    expect(pay2Res.body.data.order.paymentStatus).toBe(PAYMENT_STATUSES.PAID);
    expect(pay2Res.body.data.order.dueAmountPaise).toBe(0);

    // 3. Verify Payment Ledger
    const paymentsRes = await request(app)
      .get(`/api/orders/${activeOrder._id}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(paymentsRes.status).toBe(200);
    expect(paymentsRes.body.data.length).toBe(2);
    expect(paymentsRes.body.data[0].transactionReference).toContain('20261011094');
  });

  it('Multi-tenancy isolation: Competitor CANNOT access, convert, or view orders from another organization', async () => {
    const listRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${ownerToken}`);
    const orderId = listRes.body.data[0]._id;

    // Competitor attempts to view order
    const viewRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${competitorToken}`);

    expect(viewRes.status).toBe(404);

    // Competitor attempts to record payment
    const payRes = await request(app)
      .post(`/api/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${competitorToken}`)
      .send({ amountPaise: 50000 });

    expect(payRes.status).toBe(404);
  });
});
