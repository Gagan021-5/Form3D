import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../config/database.js';
import * as storageService from '../services/storage.service.js';
import * as jobProcessor from '../jobs/generation.processor.js';

const app = createApp();

/**
 * Helper to construct a valid 12-byte GLB binary header:
 * Magic: 0x46546C67 (ASCII 'glTF')
 * Version: 2 (0x00000002)
 * Total Length: 12 (0x0000000c)
 */
function createValidGlbBuffer(): Buffer {
  const buf = Buffer.alloc(12);
  buf[0] = 0x67; // 'g'
  buf[1] = 0x6c; // 'l'
  buf[2] = 0x54; // 'T'
  buf[3] = 0x46; // 'F'
  buf.writeUInt32LE(2, 4); // version 2
  buf.writeUInt32LE(12, 8); // declared length 12
  return buf;
}

describe('Direct 3D Model (.GLB) Upload & Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/products/upload-model', () => {
    it('should successfully upload a valid GLB model, persist it, and never invoke Tripo AI', async () => {
      const mockProduct = {
        id: '11111111-2222-3333-4444-555555555555',
        name: 'Scandinavian Wooden Chair',
        category: 'furniture',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAsset = {
        id: '99999999-8888-7777-6666-555555555555',
        productId: mockProduct.id,
        generationJobId: null,
        sourceType: 'UPLOAD',
        localFilePath: 'models/scandinavian-chair.glb',
        format: 'glb',
        mimeType: 'model/gltf-binary',
        fileSize: 12,
        createdAt: new Date(),
      };

      vi.mocked(storageService.saveModelFile).mockResolvedValue({
        relativePath: 'models/scandinavian-chair.glb',
        absolutePath: '/data/models/scandinavian-chair.glb',
        fileSize: 12,
      });

      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as any);
      vi.mocked(prisma.modelAsset.create).mockResolvedValue(mockAsset as any);

      const glbBuffer = createValidGlbBuffer();

      const res = await request(app)
        .post('/api/v1/products/upload-model')
        .field('name', 'Scandinavian Wooden Chair')
        .field('category', 'furniture')
        .attach('model', glbBuffer, 'scandinavian-chair.glb');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Scandinavian Wooden Chair');
      expect(res.body.data.assets).toHaveLength(1);
      expect(res.body.data.assets[0].sourceType).toBe('UPLOAD');
      expect(res.body.data.assets[0].generationJobId).toBeNull();

      // Verify DB records created
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Scandinavian Wooden Chair',
          category: 'furniture',
        },
      });

      expect(prisma.modelAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: mockProduct.id,
          generationJobId: null,
          sourceType: 'UPLOAD',
          format: 'glb',
        }),
      });

      // Verify Tripo or generation jobs were NEVER called
      expect(jobProcessor.startGenerationJob).not.toHaveBeenCalled();
      expect(prisma.generationJob.create).not.toHaveBeenCalled();
    });

    it('should reject upload when no model file is attached', async () => {
      const res = await request(app)
        .post('/api/v1/products/upload-model')
        .field('name', 'Empty Model');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_FILE');
    });

    it('should reject fake GLB files with invalid binary magic headers', async () => {
      const fakeCorruptGlb = Buffer.from('NOT_A_REAL_GLB_FILE_JUST_PLAIN_TEXT');

      const res = await request(app)
        .post('/api/v1/products/upload-model')
        .attach('model', fakeCorruptGlb, 'fake.glb');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_GLB_SIGNATURE');
      expect(res.body.error.message).toContain('does not match the binary glTF (.glb) specification');
    });

    it('should reject non-glb file extensions', async () => {
      const textBuffer = Buffer.from('some text');

      const res = await request(app)
        .post('/api/v1/products/upload-model')
        .attach('model', textBuffer, 'document.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
      expect(res.body.error.message).toContain('Only .glb 3D model files are currently supported');
    });

    it('should auto-derive clean model name from original filename when not provided', async () => {
      const mockProduct = {
        id: '22222222-3333-4444-5555-666666666666',
        name: 'Modern Velvet Sofa',
        category: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storageService.saveModelFile).mockResolvedValue({
        relativePath: 'models/modern-velvet-sofa.glb',
        absolutePath: '/data/models/modern-velvet-sofa.glb',
        fileSize: 12,
      });

      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as any);
      vi.mocked(prisma.modelAsset.create).mockResolvedValue({
        id: 'asset-123',
        productId: mockProduct.id,
      } as any);

      const glbBuffer = createValidGlbBuffer();

      const res = await request(app)
        .post('/api/v1/products/upload-model')
        .attach('model', glbBuffer, 'modern_velvet_sofa.glb');

      expect(res.status).toBe(201);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Modern velvet sofa',
          category: null,
        },
      });
    });
  });

  describe('POST /api/v1/products/:id/upload-model', () => {
    it('should attach a direct GLB model to an existing product', async () => {
      const productId = '33333333-4444-5555-6666-777777777777';
      const existingProduct = {
        id: productId,
        name: 'Existing Product',
        category: 'furniture',
        modelAssets: [],
      };

      vi.mocked(prisma.product.findUnique).mockResolvedValue(existingProduct as any);
      vi.mocked(storageService.saveModelFile).mockResolvedValue({
        relativePath: 'models/attached-model.glb',
        absolutePath: '/data/models/attached-model.glb',
        fileSize: 12,
      });

      vi.mocked(prisma.modelAsset.create).mockResolvedValue({
        id: 'asset-attached',
        productId,
        generationJobId: null,
        sourceType: 'UPLOAD',
        localFilePath: 'models/attached-model.glb',
        format: 'glb',
        mimeType: 'model/gltf-binary',
        fileSize: 12,
      } as any);

      const glbBuffer = createValidGlbBuffer();

      const res = await request(app)
        .post(`/api/v1/products/${productId}/upload-model`)
        .attach('model', glbBuffer, 'attached-model.glb');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assets).toHaveLength(1);
    });

    it('should return 404 when attaching to a non-existent product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const glbBuffer = createValidGlbBuffer();
      const res = await request(app)
        .post('/api/v1/products/33333333-4444-5555-6666-777777777777/upload-model')
        .attach('model', glbBuffer, 'test.glb');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
