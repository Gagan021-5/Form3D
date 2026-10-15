import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../config/database.js';
import * as storageService from '../services/storage.service.js';

const app = createApp();

describe('Asset Routes & Path Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/assets/:id/download', () => {
    it('should return 404 for non-existent asset record', async () => {
      vi.mocked(prisma.modelAsset.findUnique).mockResolvedValue(null);

      const res = await request(app).get(
        '/api/v1/assets/123e4567-e89b-12d3-a456-426614174000/download'
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 if model file is missing from disk', async () => {
      vi.mocked(prisma.modelAsset.findUnique).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '223e4567-e89b-12d3-a456-426614174000',
        generationJobId: '323e4567-e89b-12d3-a456-426614174000',
        localFilePath: 'models/missing.glb',
        format: 'glb',
        mimeType: 'model/gltf-binary',
        fileSize: 1000,
        createdAt: new Date(),
        product: { name: 'Test Product' },
      } as any);

      vi.mocked(storageService.fileExists).mockResolvedValue(false);

      const res = await request(app).get(
        '/api/v1/assets/123e4567-e89b-12d3-a456-426614174000/download'
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should reject invalid UUID asset ID', async () => {
      const res = await request(app).get('/api/v1/assets/bad-id/download');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should throw an error on path traversal attempts in getAbsolutePath', async () => {
      const actualStorage = await vi.importActual<typeof import('../services/storage.service.js')>(
        '../services/storage.service.js'
      );
      expect(() => {
        actualStorage.getAbsolutePath('../../../etc/passwd');
      }).toThrow('path traversal detected');
    });
  });
});
