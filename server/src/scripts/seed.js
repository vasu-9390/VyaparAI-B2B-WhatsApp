import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Organization } from '../models/Organization.js';
import { User, USER_ROLES } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Lead, LEAD_STATUSES } from '../models/Lead.js';
import { Quotation, QUOTATION_STATUSES } from '../models/Quotation.js';
import { Order, ORDER_STATUSES, PAYMENT_STATUSES } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { InventoryMovement, MOVEMENT_TYPES } from '../models/InventoryMovement.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

async function seedDatabase() {
  try {
    logger.info('Connecting to MongoDB database for seeding...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB. Beginning database initialization...');

    // 1. Create or Find Organization
    let org = await Organization.findOne({ slug: 'surat-texfab' });
    if (!org) {
      org = await Organization.create({
        name: 'Surat TexFab Wholesalers Ltd',
        slug: 'surat-texfab',
        industry: 'textiles',
        gstin: '24AABCS1429B1Z2',
        email: 'info@surattexfab.com',
        phone: '+919879001122',
        address: {
          street: 'Shop 104-106, Millennium Textile Market 2, Ring Road',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395002',
          country: 'India',
        },
        currency: 'INR',
        settings: {
          minMarginPercent: 15,
          maxDiscountPercentWithoutApproval: 10,
          quotePrefix: 'QT-',
          orderPrefix: 'ORD-',
          defaultQuoteValidityDays: 14,
          upiVpa: 'surattexfab@okaxis',
          autoApproveQuotes: false,
        },
        whatsappConfig: {
          phoneNumberId: 'PNID_SURAT_DEMO_01',
          wabaId: 'WABA_SURAT_DEMO_01',
          verifyToken: env.WHATSAPP_VERIFY_TOKEN,
          isConnected: true,
        },
        status: 'active',
      });
      logger.info(`Created Organization: ${org.name}`);
    }

    const orgId = org._id;

    // 2. Create Users
    const usersData = [
      {
        name: 'Harish Choksi',
        email: 'owner@surattexfab.com',
        passwordHash: 'Password12345!',
        role: USER_ROLES.BUSINESS_OWNER,
        phone: '+919879001122',
      },
      {
        name: 'Nitin Dave',
        email: 'manager@surattexfab.com',
        passwordHash: 'Password12345!',
        role: USER_ROLES.SALES_MANAGER,
        phone: '+919879001133',
      },
      {
        name: 'Pravin Joshi',
        email: 'sales@surattexfab.com',
        passwordHash: 'Password12345!',
        role: USER_ROLES.SALES_REP,
        phone: '+919879001144',
      },
      {
        name: 'Manoj Rathod',
        email: 'inventory@surattexfab.com',
        passwordHash: 'Password12345!',
        role: USER_ROLES.INVENTORY_MANAGER,
        phone: '+919879001155',
      },
    ];

    const users = [];
    for (const u of usersData) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({ ...u, organizationId: orgId });
        logger.info(`Created user: ${user.name} (${user.role})`);
      }
      users.push(user);
    }
    const owner = users[0];

    // 3. Create 15 Realistic Textile Products with Variants
    const productsData = [
      {
        sku: 'TX-DNM-01',
        name: 'Surat Heavy Indigo Denim Fabric 12oz',
        category: 'Denim Fabrics',
        description: 'Premium ring-spun indigo dyed denim fabric suitable for jeans and jackets',
        hsnCode: '52094200',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 16000, // ₹160
        defaultSellingPricePaise: 24000, // ₹240 (33.3% margin)
        minSellingPricePaise: 19000,
        availableQuantity: 2500,
        variants: [
          { sku: 'TX-DNM-01-NAV-40', name: 'Navy Blue / 40 inch', attributes: { color: 'navy', size: '40' }, costPricePaise: 16000, sellingPricePaise: 24000, availableQuantity: 1000 },
          { sku: 'TX-DNM-01-IND-40', name: 'Deep Indigo / 40 inch', attributes: { color: 'indigo', size: '40' }, costPricePaise: 16000, sellingPricePaise: 24000, availableQuantity: 800 },
          { sku: 'TX-DNM-01-BLK-40', name: 'Jet Black / 40 inch', attributes: { color: 'black', size: '40' }, costPricePaise: 17000, sellingPricePaise: 25000, availableQuantity: 700 },
        ],
      },
      {
        sku: 'TX-SLK-02',
        name: 'Banarasi Zari Jacquard Silk Saree',
        category: 'Silk Sarees',
        description: 'Handloom finish pure silk saree with antique golden zari weaving',
        hsnCode: '50072010',
        uom: 'piece',
        taxRatePercent: 12,
        costPricePaise: 120000, // ₹1,200
        defaultSellingPricePaise: 185000, // ₹1,850
        minSellingPricePaise: 140000,
        availableQuantity: 350,
        variants: [
          { sku: 'TX-SLK-02-RED', name: 'Royal Crimson Red', attributes: { color: 'red' }, costPricePaise: 120000, sellingPricePaise: 185000, availableQuantity: 180 },
          { sku: 'TX-SLK-02-BLU', name: 'Peacock Royal Blue', attributes: { color: 'blue' }, costPricePaise: 120000, sellingPricePaise: 185000, availableQuantity: 170 },
        ],
      },
      {
        sku: 'TX-COT-03',
        name: '100% Combed Cotton Shirting 60s Count',
        category: 'Cotton Fabrics',
        description: 'Breathable Giza cotton shirting fabric with satin luster',
        hsnCode: '52085200',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 11000, // ₹110
        defaultSellingPricePaise: 16500, // ₹165
        minSellingPricePaise: 13000,
        availableQuantity: 4000,
        variants: [
          { sku: 'TX-COT-03-WHT', name: 'Classic Pure White', attributes: { color: 'white' }, costPricePaise: 11000, sellingPricePaise: 16500, availableQuantity: 2500 },
          { sku: 'TX-COT-03-SKY', name: 'Executive Sky Blue', attributes: { color: 'blue' }, costPricePaise: 11000, sellingPricePaise: 16500, availableQuantity: 1500 },
        ],
      },
      {
        sku: 'TX-CHN-04',
        name: 'Chanderi Zari Border Dupatta 2.5m',
        category: 'Dupattas',
        description: 'Lightweight gossamer Chanderi silk cotton dupatta with temple border',
        hsnCode: '50079090',
        uom: 'piece',
        taxRatePercent: 5,
        costPricePaise: 25000,
        defaultSellingPricePaise: 38000,
        minSellingPricePaise: 29000,
        availableQuantity: 800,
      },
      {
        sku: 'TX-RYN-05',
        name: '14kg Heavy Rayon Digital Print Fabric',
        category: 'Rayon Prints',
        description: 'High-density spun rayon for kurtis, dresses, and ethnic tunics',
        hsnCode: '54082210',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 6500,
        defaultSellingPricePaise: 9800,
        minSellingPricePaise: 7500,
        availableQuantity: 6000,
      },
      {
        sku: 'TX-GEO-06',
        name: 'Fox Georgette Thread & Sequin Embroidered',
        category: 'Fancy Fabrics',
        description: 'All-over coding embroidery with matching tone-to-tone sequins',
        hsnCode: '54075400',
        uom: 'meter',
        taxRatePercent: 12,
        costPricePaise: 18000,
        defaultSellingPricePaise: 27500,
        minSellingPricePaise: 21000,
        availableQuantity: 1200,
      },
      {
        sku: 'TX-ORG-07',
        name: 'Glass Organza Tissue Floral Saree',
        category: 'Silk Sarees',
        description: 'Crisp transparent organza saree with digital pastel floral prints',
        hsnCode: '50072090',
        uom: 'piece',
        taxRatePercent: 12,
        costPricePaise: 75000,
        defaultSellingPricePaise: 115000,
        minSellingPricePaise: 88000,
        availableQuantity: 450,
      },
      {
        sku: 'TX-KHD-08',
        name: 'Organic Handspun Khadi Linen Blend',
        category: 'Linen Fabrics',
        description: 'Eco-friendly breathable linen-khadi fabric for summer kurtas',
        hsnCode: '53091900',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 19000,
        defaultSellingPricePaise: 29000,
        minSellingPricePaise: 22500,
        availableQuantity: 1500,
      },
      {
        sku: 'TX-SAT-09',
        name: 'Ultra Gloss Satin Silk 80GSM',
        category: 'Satin Fabrics',
        description: 'High drape glossy satin for partywear gowns and linings',
        hsnCode: '54076190',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 5200,
        defaultSellingPricePaise: 7900,
        minSellingPricePaise: 6000,
        availableQuantity: 5000,
      },
      {
        sku: 'TX-VLV-10',
        name: 'Micro Velvet 9000 Royal Quality',
        category: 'Velvet Fabrics',
        description: 'Plush heavy velvet for bridal lehengas and winter sherwanis',
        hsnCode: '58013200',
        uom: 'meter',
        taxRatePercent: 12,
        costPricePaise: 24000,
        defaultSellingPricePaise: 36000,
        minSellingPricePaise: 28000,
        availableQuantity: 900,
      },
      {
        sku: 'TX-PLY-11',
        name: 'Polyester Taffeta Lining Fabric 44 inch',
        category: 'Lining Fabrics',
        description: 'Cost-effective durable inner lining fabric for garments',
        hsnCode: '54072000',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 2100,
        defaultSellingPricePaise: 3200,
        minSellingPricePaise: 2500,
        availableQuantity: 10000,
      },
      {
        sku: 'TX-MSL-12',
        name: 'Malmal Pure Muslin Cotton Fabric',
        category: 'Cotton Fabrics',
        description: 'Feather-light pure cotton muslin fabric with soft touch finish',
        hsnCode: '52081190',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 7200,
        defaultSellingPricePaise: 11000,
        minSellingPricePaise: 8500,
        availableQuantity: 3200,
      },
      {
        sku: 'TX-LYC-13',
        name: '4-Way Cotton Lycra Stretch Denim 10.5oz',
        category: 'Denim Fabrics',
        description: 'Flex-fit 4-way stretch denim with 3% elastane for modern trousers',
        hsnCode: '52094200',
        uom: 'meter',
        taxRatePercent: 5,
        costPricePaise: 19500,
        defaultSellingPricePaise: 29500,
        minSellingPricePaise: 23000,
        availableQuantity: 1800,
      },
      {
        sku: 'TX-TSR-14',
        name: 'Bhagalpuri Tussar Ghicha Silk Saree',
        category: 'Silk Sarees',
        description: 'Natural rustic textured wild silk saree with kantha stitch work',
        hsnCode: '50072010',
        uom: 'piece',
        taxRatePercent: 12,
        costPricePaise: 140000,
        defaultSellingPricePaise: 215000,
        minSellingPricePaise: 165000,
        availableQuantity: 280,
      },
      {
        sku: 'TX-BRO-15',
        name: 'Kanjivaram Zari Brocade Blouse Piece 1m',
        category: 'Fancy Fabrics',
        description: 'Heavy gold and silver zari brocade cut pieces for designer blouses',
        hsnCode: '50079090',
        uom: 'piece',
        taxRatePercent: 12,
        costPricePaise: 18000,
        defaultSellingPricePaise: 28000,
        minSellingPricePaise: 21000,
        availableQuantity: 1400,
      },
    ];

    const products = [];
    for (const p of productsData) {
      let prod = await Product.findOne({ sku: p.sku, organizationId: orgId });
      if (!prod) {
        prod = await Product.create({ ...p, organizationId: orgId });
      }
      products.push(prod);
    }
    logger.info(`Seeded ${products.length} products with variants & GST slabs.`);

    // 4. Create 10 Wholesale Customers
    const customersData = [
      {
        name: 'Singhania Silk Stores',
        companyName: 'Singhania Silk Stores Ahmedabad',
        whatsappPhone: '+919876501234',
        email: 'singhania@ahmedabadsilk.com',
        gstin: '24AAACS1111A1Z1',
        category: 'WHOLESALER',
        creditLimitPaise: 100000000, // ₹10 Lakh
        currentOutstandingPaise: 24500000, // ₹2.45 Lakh
        shippingAddress: { street: 'Maskati Market, Sakar Bazar', city: 'Ahmedabad', state: 'Gujarat', pincode: '380002' },
      },
      {
        name: 'Kanti & Sons Retail',
        companyName: 'Kanti Cloth Stores Rajkot',
        whatsappPhone: '+919876502345',
        email: 'kantibhai@kantycloth.com',
        gstin: '24AAACK2222B1Z2',
        category: 'RETAILER',
        creditLimitPaise: 50000000,
        currentOutstandingPaise: 12000000,
        shippingAddress: { street: 'Dharmendra Road', city: 'Rajkot', state: 'Gujarat', pincode: '360001' },
      },
      {
        name: 'Bombay Cloth Emporium',
        companyName: 'Bombay Cloth Emporium Mumbai',
        whatsappPhone: '+919876503456',
        email: 'orders@bombaycloth.com',
        gstin: '27AAACB3333C1Z3',
        category: 'DISTRIBUTOR',
        creditLimitPaise: 250000000,
        currentOutstandingPaise: 58000000,
        shippingAddress: { street: 'Mangaldas Market, Kalbadevi', city: 'Mumbai', state: 'Maharashtra', pincode: '400002' },
      },
      {
        name: 'Royal Garments Surat',
        companyName: 'Royal Garment Manufacturers',
        whatsappPhone: '+919876504567',
        email: 'purchase@royalgarments.in',
        gstin: '24AAACR4444D1Z4',
        category: 'MANUFACTURER',
        creditLimitPaise: 80000000,
        currentOutstandingPaise: 0,
        shippingAddress: { street: 'Pandesara GIDC', city: 'Surat', state: 'Gujarat', pincode: '394221' },
      },
      {
        name: 'Tirupati Textiles',
        companyName: 'Tirupati Wholesale Textiles Secunderabad',
        whatsappPhone: '+919876505678',
        email: 'tirupati@hydtextiles.com',
        gstin: '36AAACT5555E1Z5',
        category: 'WHOLESALER',
        creditLimitPaise: 120000000,
        currentOutstandingPaise: 34000000,
        shippingAddress: { street: 'General Bazar', city: 'Secunderabad', state: 'Telangana', pincode: '500003' },
      },
      {
        name: 'Jaipur Saree Palace',
        companyName: 'Jaipur Saree Palace & Embellishments',
        whatsappPhone: '+919876506789',
        email: 'jaipur@sareepalace.com',
        gstin: '08AAACJ6666F1Z6',
        category: 'RETAILER',
        creditLimitPaise: 40000000,
        currentOutstandingPaise: 8500000,
        shippingAddress: { street: 'Johari Bazar', city: 'Jaipur', state: 'Rajasthan', pincode: '302003' },
      },
      {
        name: 'Chennai Weaves Hub',
        companyName: 'Chennai Weaves Wholesalers',
        whatsappPhone: '+919876507890',
        email: 'sales@chennaiweaves.in',
        gstin: '33AAACC7777G1Z7',
        category: 'DISTRIBUTOR',
        creditLimitPaise: 90000000,
        currentOutstandingPaise: 15000000,
        shippingAddress: { street: 'Sowcarpet', city: 'Chennai', state: 'Tamil Nadu', pincode: '600079' },
      },
      {
        name: 'Delhi Wholesalers',
        companyName: 'Delhi Cloth Agency Chandni Chowk',
        whatsappPhone: '+919876508901',
        email: 'delhi@clothagency.com',
        gstin: '07AAACD8888H1Z8',
        category: 'WHOLESALER',
        creditLimitPaise: 150000000,
        currentOutstandingPaise: 42000000,
        shippingAddress: { street: 'Katra Neel, Chandni Chowk', city: 'Delhi', state: 'Delhi', pincode: '110006' },
      },
      {
        name: 'Bangalore Fashion Hub',
        companyName: 'Bangalore Garment Hub Chickpet',
        whatsappPhone: '+919876509012',
        email: 'blrfashion@hub.in',
        gstin: '29AAACB9999I1Z9',
        category: 'RETAILER',
        creditLimitPaise: 60000000,
        currentOutstandingPaise: 19000000,
        shippingAddress: { street: 'Chickpet Main Road', city: 'Bangalore', state: 'Karnataka', pincode: '560053' },
      },
      {
        name: 'Indore Cotton House',
        companyName: 'Indore Cotton House Wholesalers',
        whatsappPhone: '+919876500123',
        email: 'indore@cottonhouse.com',
        gstin: '23AAACI0000J1Z0',
        category: 'WHOLESALER',
        creditLimitPaise: 75000000,
        currentOutstandingPaise: 0,
        shippingAddress: { street: 'Cloth Market, Rajwada', city: 'Indore', state: 'Madhya Pradesh', pincode: '452002' },
      },
    ];

    const customers = [];
    for (const c of customersData) {
      let cust = await Customer.findOne({ whatsappPhone: c.whatsappPhone, organizationId: orgId });
      if (!cust) {
        cust = await Customer.create({ ...c, organizationId: orgId });
      }
      customers.push(cust);
    }
    logger.info(`Seeded ${customers.length} B2B wholesale customers.`);

    // 5. Create Leads & Enquiries
    const leadsData = [
      {
        organizationId: orgId,
        customerId: customers[0]._id,
        source: 'WHATSAPP',
        status: LEAD_STATUSES.CONTACTED,
        priority: 'HIGH',
        notes: [
          {
            text: 'Requested bulk quotation for 1,000 meters Indigo Denim 12oz for festival collection',
            authorId: owner._id,
            authorName: owner.name,
          },
        ],
        requestedProducts: [
          {
            query: 'Indigo Denim 12oz',
            productId: products[0]._id,
            quantity: 1000,
            estimatedBudgetPaise: 24000000,
          },
        ],
      },
      {
        organizationId: orgId,
        customerId: customers[1]._id,
        source: 'WHATSAPP',
        status: LEAD_STATUSES.CONTACTED,
        priority: 'MEDIUM',
        notes: [
          {
            text: 'Inquired about Banarasi Zari Silk Sarees in Red and Blue',
            authorId: owner._id,
            authorName: owner.name,
          },
        ],
        requestedProducts: [
          {
            query: 'Banarasi Zari Silk Sarees',
            productId: products[1]._id,
            quantity: 100,
            estimatedBudgetPaise: 18500000,
          },
        ],
      },
      {
        organizationId: orgId,
        customerId: customers[2]._id,
        source: 'REFERRAL',
        status: LEAD_STATUSES.NEW,
        priority: 'LOW',
        notes: [
          {
            text: 'Wants sample swatches of 14kg Rayon Digital Prints',
            authorId: owner._id,
            authorName: owner.name,
          },
        ],
        requestedProducts: [
          {
            query: '14kg Rayon Digital Prints',
            productId: products[4]._id,
            quantity: 50,
            estimatedBudgetPaise: 9800000,
          },
        ],
      },
    ];

    for (const ld of leadsData) {
      const existing = await Lead.findOne({ organizationId: orgId, customerId: ld.customerId });
      if (!existing) {
        await Lead.create(ld);
      }
    }
    logger.info('Seeded sample B2B leads.');

    // 6. Create Realistic Quotations
    const quote1 = await Quotation.findOneAndUpdate(
      { organizationId: orgId, quotationNumber: 'QT-2026-0001' },
      {
        organizationId: orgId,
        customerId: customers[0]._id,
        quotationNumber: 'QT-2026-0001',
        version: 1,
        status: QUOTATION_STATUSES.ACCEPTED,
        approvalRequired: false,
        lineItems: [
          {
            productId: products[0]._id,
            variantSku: 'TX-DNM-01-NAV-40',
            productName: 'Surat Heavy Indigo Denim Fabric 12oz - Navy Blue / 40 inch',
            sku: 'TX-DNM-01-NAV-40',
            hsnCode: '52094200',
            uom: 'meter',
            quantity: 500,
            unitPricePaise: 24000,
            unitCostPricePaise: 16000,
            discountPercent: 5,
            discountAmountPaise: 600000,
            taxRatePercent: 5,
            taxAmountPaise: 570000,
            lineTotalPaise: 11970000, // ₹1,19,700
            lineCostPaise: 8000000,
          },
        ],
        subtotalPaise: 12000000,
        discountTotalPaise: 600000,
        taxTotalPaise: 570000,
        shippingPaise: 150000,
        grandTotalPaise: 12120000, // ₹1,21,200
        totalCostPaise: 8000000,
        overallMarginPercent: 33.3,
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    const quote2 = await Quotation.findOneAndUpdate(
      { organizationId: orgId, quotationNumber: 'QT-2026-0002' },
      {
        organizationId: orgId,
        customerId: customers[1]._id,
        quotationNumber: 'QT-2026-0002',
        version: 1,
        status: QUOTATION_STATUSES.APPROVED,
        approvalRequired: false,
        lineItems: [
          {
            productId: products[1]._id,
            variantSku: 'TX-SLK-02-RED',
            productName: 'Banarasi Zari Jacquard Silk Saree - Royal Crimson Red',
            sku: 'TX-SLK-02-RED',
            hsnCode: '50072010',
            uom: 'piece',
            quantity: 50,
            unitPricePaise: 185000,
            unitCostPricePaise: 120000,
            discountPercent: 0,
            discountAmountPaise: 0,
            taxRatePercent: 12,
            taxAmountPaise: 1110000,
            lineTotalPaise: 10360000, // ₹1,03,600
            lineCostPaise: 6000000,
          },
        ],
        subtotalPaise: 9250000,
        discountTotalPaise: 0,
        taxTotalPaise: 1110000,
        shippingPaise: 0,
        grandTotalPaise: 10360000,
        totalCostPaise: 6000000,
        overallMarginPercent: 35.1,
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // 7. Create Confirmed Sales Order from quote1
    const order1 = await Order.findOneAndUpdate(
      { organizationId: orgId, orderNumber: 'ORD-2026-0001' },
      {
        organizationId: orgId,
        customerId: customers[0]._id,
        quotationId: quote1._id,
        orderNumber: 'ORD-2026-0001',
        status: ORDER_STATUSES.DELIVERED,
        paymentStatus: PAYMENT_STATUSES.PAID,
        lineItems: quote1.lineItems,
        subtotalPaise: quote1.subtotalPaise,
        discountTotalPaise: quote1.discountTotalPaise,
        taxTotalPaise: quote1.taxTotalPaise,
        shippingPaise: quote1.shippingPaise,
        grandTotalPaise: quote1.grandTotalPaise,
        amountPaidPaise: quote1.grandTotalPaise,
        dueAmountPaise: 0,
        deliveredAt: new Date(),
        shippingAddress: customers[0].shippingAddress,
        deliveryNotes: 'Dispatched via V-Trans Surat to Maskati Market Ahmedabad',
      },
      { upsert: true, new: true }
    );

    quote1.convertedToOrderId = order1._id;
    await quote1.save();

    // 8. Create Recorded UPI Payment for Order 1
    await Payment.findOneAndUpdate(
      { organizationId: orgId, paymentNumber: 'PAY-2026-0001' },
      {
        organizationId: orgId,
        orderId: order1._id,
        customerId: customers[0]._id,
        paymentNumber: 'PAY-2026-0001',
        amountPaise: order1.grandTotalPaise,
        method: 'UPI',
        status: 'SUCCESS',
        transactionReference: 'UPI/UTR/429104819201',
        verifiedBy: owner._id,
        verifiedAt: new Date(),
        notes: 'Full payment received through Bharat UPI QR',
      },
      { upsert: true }
    );

    // 9. Create WhatsApp Conversation with Inbound & Outbound History
    const conv1 = await Conversation.findOneAndUpdate(
      { organizationId: orgId, whatsappPhone: customers[0].whatsappPhone },
      {
        organizationId: orgId,
        customerId: customers[0]._id,
        whatsappPhone: customers[0].whatsappPhone,
        status: 'ACTIVE',
        lastMessageText: 'Namaste Singhania bhai, aapka quote QT-2026-0001 ready hai.',
        lastMessageAt: new Date(),
        activeQuotationId: quote1._id,
        latestAiIntent: 'quotation_request',
        unreadCount: 0,
      },
      { upsert: true, new: true }
    );

    await Message.create({
      organizationId: orgId,
      conversationId: conv1._id,
      customerId: customers[0]._id,
      whatsappMessageId: `wamid.SEED_IN_${Date.now()}`,
      direction: 'INBOUND',
      type: 'TEXT',
      text: 'Bhai 500 meter navy blue denim 40 size chahiye, jaldi quotation bhejo',
      deliveryStatus: 'READ',
      sentAt: new Date(Date.now() - 3600000),
      aiExtractedData: {
        intent: 'quotation_request',
        language: 'hi',
        items: [{ product_query: 'denim', color: 'navy', size: '40', quantity: 500, unit: 'meter' }],
      },
    });

    await Message.create({
      organizationId: orgId,
      conversationId: conv1._id,
      customerId: customers[0]._id,
      whatsappMessageId: `wamid.SEED_OUT_${Date.now()}`,
      direction: 'OUTBOUND',
      type: 'TEXT',
      text: 'Namaste Singhania bhai, aapka quote QT-2026-0001 ready hai. 500m Navy Denim at ₹228.00/m + 5% GST = ₹1,21,200 total.',
      deliveryStatus: 'DELIVERED',
      sentAt: new Date(Date.now() - 1800000),
    });

    logger.info('=== VYAPARAI DATABASE SEED COMPLETED SUCCESSFULLY ===');
    logger.info('Organization: Surat TexFab Wholesalers Ltd (slug: surat-texfab)');
    logger.info('Credentials:');
    logger.info('  - Owner: owner@surattexfab.com / Password12345!');
    logger.info('  - Manager: manager@surattexfab.com / Password12345!');
    logger.info('  - Sales Rep: sales@surattexfab.com / Password12345!');
    logger.info('  - Inventory: inventory@surattexfab.com / Password12345!');
    logger.info('======================================================');

    process.exit(0);
  } catch (err) {
    logger.error('Error during database seed', err);
    process.exit(1);
  }
}

seedDatabase();
