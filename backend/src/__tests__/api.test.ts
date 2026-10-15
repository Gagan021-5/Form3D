import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../config/database.js';

const app = createApp();

describe('Product Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/products', () => {
    it('should create a product with valid data', async () => {
      const mockProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        category: 'furniture',
        sourceImagePath: null,
        sourceImageMimeType: null,
        sourceImageSize: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct);

      const res = await request(app)
        .post('/api/v1/products')
        .send({ name: 'Test Product', category: 'furniture' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Product');
    });

    it('should allow optional product name and default to Untitled Product', async () => {
      vi.mocked(prisma.product.create).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Untitled Product',
        category: null,
        sourceImagePath: null,
        sourceImageMimeType: null,
        sourceImageSize: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/products')
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Untitled Product');
    });

    it('should update product category and name via PATCH /api/v1/products/:id', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: mockId,
        name: 'Untitled Product',
        category: null,
        sourceImagePath: null,
        sourceImageMimeType: null,
        sourceImageSize: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: mockId,
        name: 'Updated Chair',
        category: 'furniture',
        sourceImagePath: null,
        sourceImageMimeType: null,
        sourceImageSize: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch(`/api/v1/products/${mockId}`)
        .send({ name: 'Updated Chair', category: 'furniture' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('furniture');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return 404 for non-existent product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/products/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/products/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return product with jobs and assets', async () => {
      const mockProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        category: null,
        sourceImagePath: 'uploads/test.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            productId: '123e4567-e89b-12d3-a456-426614174000',
            providerName: 'tripo',
            providerTaskId: 'task-abc',
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
            id: '323e4567-e89b-12d3-a456-426614174000',
            productId: '123e4567-e89b-12d3-a456-426614174000',
            generationJobId: '223e4567-e89b-12d3-a456-426614174000',
            localFilePath: 'models/test.glb',
            format: 'glb',
            mimeType: 'model/gltf-binary',
            fileSize: 50000,
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);

      const res = await request(app)
        .get('/api/v1/products/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.latestJob.status).toBe('SUCCEEDED');
      expect(res.body.data.assets).toHaveLength(1);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should return paginated products', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.product.count).mockResolvedValue(0);

      const res = await request(app).get('/api/v1/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should delete product and clean up files', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        category: null,
        sourceImagePath: 'uploads/test.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
        modelAssets: [
          {
            localFilePath: 'models/test.glb',
          },
        ],
      } as any);
      vi.mocked(prisma.product.delete).mockResolvedValue({} as any);

      const res = await request(app)
        .delete('/api/v1/products/123e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});

describe('Generation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/products/:id/generations', () => {
    it('should reject generation without image', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        category: null,
        sourceImagePath: null,
        sourceImageMimeType: null,
        sourceImageSize: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [],
      } as any);

      const res = await request(app)
        .post('/api/v1/products/123e4567-e89b-12d3-a456-426614174000/generations');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_IMAGE');
    });

    it('should prevent duplicate generation', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        category: null,
        sourceImagePath: 'uploads/test.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            status: 'PROCESSING',
          },
        ],
      } as any);

      const res = await request(app)
        .post('/api/v1/products/123e4567-e89b-12d3-a456-426614174000/generations');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('GENERATION_IN_PROGRESS');
    });

    it('should create generation job for valid product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        category: null,
        sourceImagePath: 'uploads/test.jpg',
        sourceImageMimeType: 'image/jpeg',
        sourceImageSize: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
        generationJobs: [],
      } as any);

      const mockJob = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        productId: '123e4567-e89b-12d3-a456-426614174000',
        providerName: 'tripo',
        providerTaskId: null,
        status: 'QUEUED',
        providerStatus: null,
        progress: null,
        errorCode: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      vi.mocked(prisma.generationJob.create).mockResolvedValue(mockJob);

      const res = await request(app)
        .post('/api/v1/products/123e4567-e89b-12d3-a456-426614174000/generations');

      expect(res.status).toBe(202);
      expect(res.body.data.status).toBe('QUEUED');
    });
  });

  describe('GET /api/v1/generations/:id', () => {
    it('should return generation job with assets', async () => {
      vi.mocked(prisma.generationJob.findUnique).mockResolvedValue({
        id: '223e4567-e89b-12d3-a456-426614174000',
        productId: '123e4567-e89b-12d3-a456-426614174000',
        providerName: 'tripo',
        providerTaskId: 'task-abc',
        status: 'SUCCEEDED',
        providerStatus: 'success',
        progress: 100,
        errorCode: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        modelAssets: [],
      } as any);

      const res = await request(app)
        .get('/api/v1/generations/223e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUCCEEDED');
    });

    it('should return 404 for non-existent job', async () => {
      vi.mocked(prisma.generationJob.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/generations/223e4567-e89b-12d3-a456-426614174000');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/generations/:id/retry', () => {
    it('should only allow retrying failed jobs', async () => {
      vi.mocked(prisma.generationJob.findUnique).mockResolvedValue({
        id: '223e4567-e89b-12d3-a456-426614174000',
        status: 'PROCESSING',
        product: { id: '123e4567-e89b-12d3-a456-426614174000' },
      } as any);

      const res = await request(app)
        .post('/api/v1/generations/223e4567-e89b-12d3-a456-426614174000/retry');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS');
    });
  });
});

describe('Image Validation', () => {
  describe('validateImageSignature', () => {
    it('should validate JPEG magic bytes', async () => {
      const { validateImageSignature } = await import('../middleware/upload.js');
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const result = validateImageSignature(jpegBuffer);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/jpeg');
    });

    it('should validate PNG magic bytes', async () => {
      const { validateImageSignature } = await import('../middleware/upload.js');
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
      const result = validateImageSignature(pngBuffer);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('should validate WebP magic bytes', async () => {
      const { validateImageSignature } = await import('../middleware/upload.js');
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
        0x50,
      ]);
      const result = validateImageSignature(webpBuffer);
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/webp');
    });

    it('should reject invalid file signatures', async () => {
      const { validateImageSignature } = await import('../middleware/upload.js');
      const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = validateImageSignature(invalidBuffer);
      expect(result.valid).toBe(false);
    });

    it('should reject buffer too small', async () => {
      const { validateImageSignature } = await import('../middleware/upload.js');
      const tinyBuffer = Buffer.from([0xff, 0xd8]);
      const result = validateImageSignature(tinyBuffer);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Provider Response Normalization', () => {
  it('should normalize Tripo statuses', async () => {
    const { TripoProvider } = await import('../providers/tripo.provider.js');
    const provider = new TripoProvider('fake-key');

    // Access private method via prototype
    const normalize = (provider as any).normalizeStatus.bind(provider);

    expect(normalize('queued')).toBe('queued');
    expect(normalize('running')).toBe('running');
    expect(normalize('success')).toBe('success');
    expect(normalize('failed')).toBe('failed');
    expect(normalize('banned')).toBe('banned');
    expect(normalize('expired')).toBe('expired');
    expect(normalize('unknown_status')).toBe('unknown');
  });
});

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
