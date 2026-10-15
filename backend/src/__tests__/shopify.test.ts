import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../config/database.js';
import { validateSafeImageUrl, validateReturnUrl } from '../services/ssrf.service.js';

describe('Shopify Integration & Security Tests', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SSRF Protection (validateSafeImageUrl)', () => {
    it('should allow valid public HTTPS and HTTP URLs', () => {
      expect(() =>
        validateSafeImageUrl('https://cdn.shopify.com/s/files/1/00/products/sneaker.jpg')
      ).not.toThrow();

      expect(() =>
        validateSafeImageUrl('http://example.com/images/chair.png')
      ).not.toThrow();
    });

    it('should reject unsupported protocols', () => {
      expect(() => validateSafeImageUrl('ftp://example.com/image.jpg')).toThrowError(
        /Only HTTP and HTTPS/
      );
      expect(() => validateSafeImageUrl('file:///etc/passwd')).toThrowError(
        /Only HTTP and HTTPS/
      );
      expect(() => validateSafeImageUrl('javascript:alert(1)')).toThrowError(
        /Only HTTP and HTTPS/
      );
    });

    it('should reject localhost and loopback addresses', () => {
      expect(() => validateSafeImageUrl('http://localhost:4000/image.jpg')).toThrowError(
        /SSRF_PROHIBITED|cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://127.0.0.1:8080/image.jpg')).toThrowError(
        /SSRF_PROHIBITED|cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://0.0.0.0/test.png')).toThrowError(
        /SSRF_PROHIBITED|cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://[::1]/test.png')).toThrowError(
        /SSRF_PROHIBITED|cannot point to internal/
      );
    });

    it('should reject private RFC1918 and link-local IP addresses', () => {
      expect(() => validateSafeImageUrl('http://10.0.0.1/image.png')).toThrowError(
        /cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://192.168.1.50/photo.jpg')).toThrowError(
        /cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://172.16.0.1/photo.jpg')).toThrowError(
        /cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://169.254.169.254/latest/meta-data/')).toThrowError(
        /cannot point to internal/
      );
      expect(() => validateSafeImageUrl('http://internal.service.local/image.png')).toThrowError(
        /cannot point to internal/
      );
    });
  });

  describe('Open Redirect Prevention (validateReturnUrl)', () => {
    it('should allow valid relative return URLs', () => {
      expect(validateReturnUrl('/products/modern-sneaker')).toBe('/products/modern-sneaker');
      expect(validateReturnUrl('/collections/all')).toBe('/collections/all');
    });

    it('should reject protocol-relative and malformed open redirects', () => {
      expect(validateReturnUrl('//evil.com/phish')).toBeNull();
      expect(validateReturnUrl('/\\evil.com')).toBeNull();
    });

    it('should allow verified myshopify.com domains', () => {
      expect(
        validateReturnUrl('https://my-store.myshopify.com/products/test', 'my-store.myshopify.com')
      ).toBe('https://my-store.myshopify.com/products/test');
    });

    it('should reject arbitrary untrusted third-party domains', () => {
      expect(
        validateReturnUrl('https://malicious-site.com/steal-data', 'my-store.myshopify.com')
      ).toBeNull();
      expect(validateReturnUrl('https://google.com')).toBeNull();
    });
  });

  describe('POST /api/v1/shopify/resolve', () => {
    it('should reject requests with missing parameters or invalid URLs', async () => {
      const res = await request(app)
        .post('/api/v1/shopify/resolve')
        .send({
          shopifyProductId: '',
          imageUrl: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject SSRF attempts in resolve', async () => {
      const res = await request(app)
        .post('/api/v1/shopify/resolve')
        .send({
          shopifyProductId: 'gid://shopify/Product/12345',
          imageUrl: 'http://127.0.0.1:4000/secret.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SSRF_PROHIBITED');
    });

    it('should return status "new" when no mapping exists yet', async () => {
      vi.mocked(prisma.product.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/shopify/resolve')
        .send({
          shopifyProductId: 'shopify-prod-100',
          title: 'Ergonomic Desk Chair',
          imageUrl: 'https://cdn.shopify.com/chair.jpg',
          returnUrl: '/products/chair',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('new');
      expect(res.body.data.canGenerate).toBe(true);
      expect(res.body.data.safeReturnUrl).toBe('/products/chair');
    });

    it('should return status "existing" and reuse product/job without duplicates', async () => {
      const mockProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Seeded Sneaker',
        category: null,
        sourceImagePath: 'seeded-sneaker.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 1234,
        shopifyProductId: 'shopify-prod-200',
        shopifyShopDomain: 'test-store.myshopify.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [
          {
            id: 'job-123',
            productId: '123e4567-e89b-12d3-a456-426614174000',
            providerName: 'tripo',
            providerTaskId: 'task-123',
            status: 'SUCCEEDED',
            providerStatus: 'success',
            progress: 100,
            errorCode: null,
            errorMessage: null,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: new Date(),
          },
        ],
        modelAssets: [
          {
            id: 'asset-123',
            productId: '123e4567-e89b-12d3-a456-426614174000',
            generationJobId: 'job-123',
            localFilePath: 'models/test.glb',
            format: 'glb',
            mimeType: 'model/gltf-binary',
            fileSize: 1024,
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as any);

      const res = await request(app)
        .post('/api/v1/shopify/resolve')
        .send({
          shopifyProductId: 'shopify-prod-200',
          title: 'Seeded Sneaker',
          imageUrl: 'https://cdn.shopify.com/seeded.jpg',
          returnUrl: '/products/seeded-sneaker',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('existing');
      expect(res.body.data.productId).toBe(mockProduct.id);
      expect(res.body.data.latestJob.id).toBe('job-123');
      expect(res.body.data.assets.length).toBe(1);
      expect(res.body.data.assets[0].id).toBe('asset-123');
    });
  });

  describe('Duplicate-Job Guards', () => {
    it('should return existing job if generation is already active for this shopify product', async () => {
      const activeJob = {
        id: 'job-active-456',
        productId: 'prod-active-123',
        providerName: 'tripo',
        providerTaskId: 'task-active',
        status: 'PROCESSING',
        providerStatus: 'processing',
        progress: 45,
        errorCode: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      const existingProduct = {
        id: 'prod-active-123',
        name: 'Active Processing Sneaker',
        category: null,
        sourceImagePath: 'active.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 1234,
        shopifyProductId: 'shopify-prod-in-progress',
        shopifyShopDomain: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [activeJob],
        modelAssets: [],
      };

      vi.mocked(prisma.product.findFirst).mockResolvedValue(existingProduct as any);

      const res = await request(app)
        .post('/api/v1/shopify/generate')
        .set('x-bypass-rate-limit', 'true')
        .send({
          shopifyProductId: 'shopify-prod-in-progress',
          title: 'Active Processing Sneaker',
          imageUrl: 'https://cdn.shopify.com/active.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('existing_in_progress');
      expect(res.body.data.job.id).toBe(activeJob.id);

      // Verify no new product or job was created
      expect(prisma.generationJob.create).not.toHaveBeenCalled();
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });
});
