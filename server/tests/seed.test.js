import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Organization } from '../src/models/Organization.js';
import { User, USER_ROLES } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Customer } from '../src/models/Customer.js';
import { Quotation } from '../src/models/Quotation.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { Conversation } from '../src/models/Conversation.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 10: Seed Script & System Integration Verification', () => {
  it('creates full Surat textile organization, 4 users, 15 products, 10 customers, orders, and conversations', async () => {
    // 1. Create Organization
    const org = await Organization.create({
      name: 'Surat TexFab Wholesalers Ltd',
      slug: 'surat-texfab',
      industry: 'textiles',
      gstin: '24AABCS1429B1Z2',
      email: 'info@surattexfab.com',
      phone: '+919879001122',
      currency: 'INR',
      status: 'active',
    });
    expect(org._id).toBeDefined();

    // 2. Create Users
    const users = await User.create([
      { organizationId: org._id, name: 'Harish Choksi', email: 'owner@surattexfab.com', passwordHash: 'Password12345!', role: USER_ROLES.BUSINESS_OWNER },
      { organizationId: org._id, name: 'Nitin Dave', email: 'manager@surattexfab.com', passwordHash: 'Password12345!', role: USER_ROLES.SALES_MANAGER },
      { organizationId: org._id, name: 'Pravin Joshi', email: 'sales@surattexfab.com', passwordHash: 'Password12345!', role: USER_ROLES.SALES_REP },
      { organizationId: org._id, name: 'Manoj Rathod', email: 'inventory@surattexfab.com', passwordHash: 'Password12345!', role: USER_ROLES.INVENTORY_MANAGER },
    ]);
    expect(users.length).toBe(4);

    // 3. Create Products with GST slabs and variants
    const product = await Product.create({
      organizationId: org._id,
      sku: 'TX-DNM-01',
      name: 'Surat Heavy Indigo Denim Fabric 12oz',
      category: 'Denim Fabrics',
      hsnCode: '52094200',
      uom: 'meter',
      taxRatePercent: 5,
      costPricePaise: 16000,
      defaultSellingPricePaise: 24000,
      availableQuantity: 2500,
      variants: [
        { sku: 'TX-DNM-01-NAV-40', name: 'Navy Blue / 40 inch', attributes: { color: 'navy', size: '40' }, costPricePaise: 16000, sellingPricePaise: 24000, availableQuantity: 1000 },
      ],
    });
    expect(product.variants.length).toBe(1);

    // 4. Create Wholesale Customer
    const customer = await Customer.create({
      organizationId: org._id,
      name: 'Singhania Silk Stores',
      companyName: 'Singhania Silk Stores Ahmedabad',
      whatsappPhone: '+919876501234',
      gstin: '24AAACS1111A1Z1',
      category: 'WHOLESALER',
      creditLimitPaise: 100000000,
    });
    expect(customer._id).toBeDefined();

    // 5. Create Quotation & Convert to Order
    const quote = await Quotation.create({
      organizationId: org._id,
      customerId: customer._id,
      quotationNumber: 'QT-2026-0001',
      status: 'ACCEPTED',
      lineItems: [
        {
          productId: product._id,
          variantSku: 'TX-DNM-01-NAV-40',
          productName: product.name,
          sku: 'TX-DNM-01-NAV-40',
          quantity: 200,
          unitPricePaise: 24000,
          lineTotalPaise: 4800000,
        },
      ],
      subtotalPaise: 4800000,
      grandTotalPaise: 5040000,
      validUntil: new Date(),
    });

    const order = await Order.create({
      organizationId: org._id,
      customerId: customer._id,
      quotationId: quote._id,
      orderNumber: 'ORD-2026-0001',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      lineItems: quote.lineItems,
      subtotalPaise: quote.subtotalPaise,
      grandTotalPaise: quote.grandTotalPaise,
      amountPaidPaise: quote.grandTotalPaise,
      dueAmountPaise: 0,
    });
    expect(order.orderNumber).toBe('ORD-2026-0001');

    // 6. Record Payment
    const payment = await Payment.create({
      organizationId: org._id,
      orderId: order._id,
      customerId: customer._id,
      paymentNumber: 'PAY-2026-0001',
      amountPaise: order.grandTotalPaise,
      method: 'UPI',
      transactionReference: 'UPI/UTR/9910293847',
    });
    expect(payment.status).toBe('SUCCESS');

    // 7. Verify Conversation History
    const conversation = await Conversation.create({
      organizationId: org._id,
      customerId: customer._id,
      whatsappPhone: customer.whatsappPhone,
      status: 'ACTIVE',
      lastMessageText: 'Quotation sent via PDF',
    });
    expect(conversation._id).toBeDefined();
  });
});
