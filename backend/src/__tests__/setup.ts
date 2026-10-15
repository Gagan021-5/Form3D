import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/forma3d_test';
process.env.TRIPO_API_KEY = process.env.TRIPO_API_KEY || 'test-tripo-key';

// Mock Prisma
vi.mock('../config/database.js', () => {
  return {
    default: {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      generationJob: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      modelAsset: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

// Mock storage service
vi.mock('../services/storage.service.js', () => ({
  initStorage: vi.fn(),
  saveUploadedImage: vi.fn().mockResolvedValue({
    relativePath: 'uploads/test-uuid.jpg',
    absolutePath: '/data/uploads/test-uuid.jpg',
    fileSize: 12345,
  }),
  saveModelFile: vi.fn().mockResolvedValue({
    relativePath: 'models/test-uuid.glb',
    absolutePath: '/data/models/test-uuid.glb',
    fileSize: 67890,
  }),
  getAbsolutePath: vi.fn((rel: string) => `/data/${rel}`),
  fileExists: vi.fn().mockResolvedValue(true),
  deleteFile: vi.fn(),
}));

// Mock job processor
vi.mock('../jobs/generation.processor.js', () => ({
  startGenerationJob: vi.fn().mockResolvedValue(undefined),
  resumeIncompleteJobs: vi.fn(),
  shutdownJobProcessor: vi.fn(),
}));
