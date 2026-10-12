import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Organization } from '../src/models/Organization.js';
import { User, USER_ROLES } from '../src/models/User.js';

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

describe('Phase 1 & Phase 2 API Verification', () => {
  it('GET /api/health returns healthy service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.service).toContain('VyaparAI');
  });

  describe('Organization Onboarding & Authentication', () => {
    let orgAToken = '';
    let orgAOwner = null;
    let orgAId = null;

    it('POST /api/auth/register successfully onboards a Surat textile business and owner', async () => {
      const payload = {
        orgName: 'Surat Silk Mills Pvt Ltd',
        slug: 'surat-silk-mills',
        industry: 'textiles',
        gstin: '24AAACS1234D1Z5',
        ownerName: 'Rajesh Shah',
        email: 'rajesh@suratsilk.com',
        password: 'SecurePassword123!',
        phone: '+919876543210',
      };

      const res = await request(app).post('/api/auth/register').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('rajesh@suratsilk.com');
      expect(res.body.data.user.role).toBe(USER_ROLES.BUSINESS_OWNER);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Sensitive data stripped
      expect(res.body.data.organization.name).toBe('Surat Silk Mills Pvt Ltd');
      expect(res.body.data.token).toBeDefined();

      // Check HttpOnly cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
      expect(cookies[0]).toContain('HttpOnly');

      orgAToken = res.body.data.token;
      orgAOwner = res.body.data.user;
      orgAId = res.body.data.organization._id;
    });

    it('POST /api/auth/register rejects duplicate organization slug or email with 409', async () => {
      const duplicatePayload = {
        orgName: 'Surat Silk Duplicate',
        slug: 'surat-silk-mills', // Duplicate slug
        industry: 'textiles',
        ownerName: 'Amit Shah',
        email: 'rajesh@suratsilk.com', // Duplicate email
        password: 'AnotherPassword123!',
      };

      const res = await request(app).post('/api/auth/register').send(duplicatePayload);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SLUG_TAKEN');
    });

    it('POST /api/auth/register rejects invalid email or short password with 422', async () => {
      const invalidPayload = {
        orgName: 'Morbi Tiles',
        slug: 'morbi-tiles',
        ownerName: 'Pravin Patel',
        email: 'not-an-email',
        password: 'short', // less than 8 chars
      };

      const res = await request(app).post('/api/auth/register').send(invalidPayload);
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/login authenticates with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rajesh@suratsilk.com', password: 'SecurePassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.name).toBe('Rajesh Shah');
    });

    it('POST /api/auth/login rejects incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rajesh@suratsilk.com', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /api/auth/me returns authenticated profile using Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${orgAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('rajesh@suratsilk.com');
      expect(res.body.data.organization._id.toString()).toBe(orgAId.toString());
    });

    it('GET /api/auth/me rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role-Based Access Control & Organization Isolation', () => {
    let ownerToken = '';
    let salesRepToken = '';
    let orgAId = '';

    beforeAll(async () => {
      // Register Organization 1
      const org1Res = await request(app).post('/api/auth/register').send({
        orgName: 'Morbi Ceramics Hub',
        slug: 'morbi-ceramics-hub',
        industry: 'ceramics',
        ownerName: 'Ketan Patel',
        email: 'ketan@morbiceramics.com',
        password: 'Password12345!',
      });
      ownerToken = org1Res.body.data.token;
      orgAId = org1Res.body.data.organization._id;

      // Register Organization 2 (to test cross-tenant isolation)
      await request(app).post('/api/auth/register').send({
        orgName: 'Rajkot Hardware Wholesalers',
        slug: 'rajkot-hardware',
        industry: 'hardware',
        ownerName: 'Bhavin Mehta',
        email: 'bhavin@rajkothardware.com',
        password: 'Password12345!',
      });
    });

    it('Business Owner can add a Sales Representative to their organization', async () => {
      const res = await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Nitin Sharma',
          email: 'nitin@morbiceramics.com',
          password: 'RepPassword123!',
          role: USER_ROLES.SALES_REP,
          phone: '+919988776655',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(USER_ROLES.SALES_REP);
      expect(res.body.data.user.organizationId.toString()).toBe(orgAId.toString());

      // Login as Sales Rep to get rep token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nitin@morbiceramics.com', password: 'RepPassword123!' });

      salesRepToken = loginRes.body.data.token;
    });

    it('Sales Rep is FORBIDDEN (403) from creating other users (RBAC enforced)', async () => {
      const res = await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${salesRepToken}`)
        .send({
          name: 'Unauthorized User',
          email: 'unauth@morbiceramics.com',
          password: 'Password12345!',
          role: USER_ROLES.SALES_REP,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Users query returns ONLY team members belonging to the requester organization', async () => {
      const res = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBe(2); // Ketan (Owner) + Nitin (Sales Rep)

      // Ensure no users from Rajkot Hardware leaked into Morbi Ceramics
      const allBelongToOrgA = res.body.data.users.every(
        (u) => u.organizationId.toString() === orgAId.toString()
      );
      expect(allBelongToOrgA).toBe(true);
    });
  });
});
