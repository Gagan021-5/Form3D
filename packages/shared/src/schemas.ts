import { z } from 'zod';

export const PRODUCT_CATEGORIES = [
  'furniture',
  'electronics',
  'apparel',
  'jewelry',
  'footwear',
  'packaging',
  'toys',
  'automotive',
  'food',
  'other',
] as const;

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Zod Schemas ────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z
    .string()
    .max(200, 'Product name must be 200 characters or fewer')
    .trim()
    .optional(),
  category: z.enum(PRODUCT_CATEGORIES).nullable().optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .max(200, 'Product name must be 200 characters or fewer')
    .trim()
    .optional(),
  category: z.enum(PRODUCT_CATEGORIES).nullable().optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export const generationIdParamSchema = z.object({
  id: z.string().uuid('Invalid generation ID'),
});

export const assetIdParamSchema = z.object({
  id: z.string().uuid('Invalid asset ID'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['QUEUED', 'PROCESSING', 'DOWNLOADING', 'SUCCEEDED', 'FAILED']).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
