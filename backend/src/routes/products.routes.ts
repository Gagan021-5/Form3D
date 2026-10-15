import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  paginationSchema,
  PRODUCT_CATEGORIES,
  MAX_MODEL_UPLOAD_SIZE_BYTES,
} from '@forma3d/shared';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  uploadImage,
  uploadModel,
  validateImageSignature,
  validateGlbSignature,
} from '../middleware/upload.js';
import { saveUploadedImage, saveModelFile, deleteFile } from '../services/storage.service.js';
import { createAppError } from '../middleware/error-handler.js';
import { config } from '../config/env.js';

const router = Router();

// ─── GET /products ──────────────────────────────────────────────────
router.get(
  '/',
  validateQuery(paginationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize, search, status } = req.query as unknown as {
        page: number;
        pageSize: number;
        search?: string;
        status?: string;
      };

      const where: Record<string, unknown> = {};

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      if (status) {
        if (status === 'SUCCEEDED') {
          where.OR = [
            { generationJobs: { some: { status: 'SUCCEEDED' } } },
            { modelAssets: { some: { sourceType: 'UPLOAD' } } },
          ];
        } else {
          where.generationJobs = {
            some: { status },
          };
        }
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            generationJobs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            modelAssets: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.product.count({ where }),
      ]);

      const formatted = products.map((p) => ({
        ...p,
        latestJob: p.generationJobs[0] || null,
        assets: p.modelAssets,
        generationJobs: undefined,
        modelAssets: undefined,
      }));

      res.json({
        success: true,
        data: formatted,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /products ─────────────────────────────────────────────────
router.post(
  '/',
  validateBody(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, category } = req.body;

      const product = await prisma.product.create({
        data: {
          name: name?.trim() || 'Untitled Product',
          category: category || null,
        },
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /products/:id ─────────────────────────────────────────────
router.get(
  '/:id',
  validateParams(productIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          generationJobs: {
            orderBy: { createdAt: 'desc' },
          },
          modelAssets: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          ...product,
          latestJob: product.generationJobs[0] || null,
          assets: product.modelAssets,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /products/:id ───────────────────────────────────────────
router.patch(
  '/:id',
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { name, category } = req.body;

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() || 'Untitled Product' }),
          ...(category !== undefined && { category }),
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /products/:id ───────────────────────────────────────────
router.delete(
  '/:id',
  validateParams(productIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          modelAssets: true,
        },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      // Delete associated files
      if (product.sourceImagePath) {
        await deleteFile(product.sourceImagePath);
      }

      for (const asset of product.modelAssets) {
        await deleteFile(asset.localFilePath);
      }

      // Delete from database (cascades to jobs and assets)
      await prisma.product.delete({
        where: { id },
      });

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /products/:id/upload ──────────────────────────────────────
router.post(
  '/:id/upload',
  validateParams(productIdParamSchema),
  uploadImage.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      if (!req.file) {
        throw createAppError('No image file provided', 400, 'NO_FILE');
      }

      // Validate file signature (magic bytes)
      const { valid, detectedType } = validateImageSignature(req.file.buffer);
      if (!valid) {
        throw createAppError(
          'Invalid image file. The file does not appear to be a valid image.',
          400,
          'INVALID_FILE_SIGNATURE'
        );
      }

      // Delete old image if exists
      if (product.sourceImagePath) {
        await deleteFile(product.sourceImagePath);
      }

      // Save new image
      const { relativePath, fileSize } = await saveUploadedImage(
        req.file.buffer,
        req.file.originalname
      );

      // Update product with image info
      const updated = await prisma.product.update({
        where: { id },
        data: {
          sourceImagePath: relativePath,
          sourceImageMimeType: detectedType || req.file.mimetype,
          sourceImageSize: fileSize,
        },
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      // Handle multer errors
      if (err instanceof Error && err.message.includes('File too large')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Image file exceeds the 10 MB size limit.',
          },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── GET /products/:id/assets ───────────────────────────────────────
router.get(
  '/:id/assets',
  validateParams(productIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      const assets = await prisma.modelAsset.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: assets,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /products/upload-model ────────────────────────────────────
// Direct 3D model (.glb) upload without calling Tripo or requiring product photo
router.post(
  '/upload-model',
  uploadModel.single('model'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw createAppError('No 3D model file provided', 400, 'NO_FILE');
      }

      // Validate GLB binary signature (glTF magic header)
      const sig = validateGlbSignature(req.file.buffer);
      if (!sig.valid) {
        throw createAppError(
          'Invalid 3D model file. The uploaded file does not match the binary glTF (.glb) specification.',
          400,
          'INVALID_GLB_SIGNATURE'
        );
      }

      const rawName = (req.body.name as string | undefined)?.trim();
      const rawCategory = (req.body.category as string | undefined)?.trim();
      const validCategory = (PRODUCT_CATEGORIES as readonly string[]).includes(rawCategory || '')
        ? rawCategory
        : null;

      // Clean default model name from filename if not explicitly provided
      const defaultName = req.file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      const finalName =
        rawName ||
        (defaultName
          ? defaultName.charAt(0).toUpperCase() + defaultName.slice(1)
          : 'Untitled 3D Model');

      // 1. Save model binary into storage
      const { relativePath, fileSize } = await saveModelFile(req.file.buffer, 'glb');

      // 2. Create Product record
      const product = await prisma.product.create({
        data: {
          name: finalName,
          category: validCategory,
        },
      });

      // 3. Create ModelAsset record linked directly to product (no generation job)
      const asset = await prisma.modelAsset.create({
        data: {
          productId: product.id,
          generationJobId: null,
          sourceType: 'UPLOAD',
          localFilePath: relativePath,
          format: 'glb',
          mimeType: 'model/gltf-binary',
          fileSize,
        },
      });

      console.log(
        `✓ Direct 3D model uploaded: "${finalName}" (${(fileSize / (1024 * 1024)).toFixed(
          2
        )} MB) -> asset ${asset.id}`
      );

      res.status(201).json({
        success: true,
        data: {
          ...product,
          latestJob: null,
          assets: [asset],
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('File too large')) {
        const maxMb = Math.round((config.upload.maxModelSizeBytes || MAX_MODEL_UPLOAD_SIZE_BYTES) / (1024 * 1024));
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `3D model exceeds the ${maxMb} MB upload limit.`,
          },
        });
        return;
      }
      if (err instanceof Error && err.message.includes('Only .glb')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }
);

// ─── POST /products/:id/upload-model ────────────────────────────────
router.post(
  '/:id/upload-model',
  validateParams(productIdParamSchema),
  uploadModel.single('model'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
        include: { modelAssets: true },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      if (!req.file) {
        throw createAppError('No 3D model file provided', 400, 'NO_FILE');
      }

      const sig = validateGlbSignature(req.file.buffer);
      if (!sig.valid) {
        throw createAppError(
          'Invalid 3D model file. The uploaded file does not match the binary glTF (.glb) specification.',
          400,
          'INVALID_GLB_SIGNATURE'
        );
      }

      // Save new model binary
      const { relativePath, fileSize } = await saveModelFile(req.file.buffer, 'glb');

      // Create ModelAsset record
      const asset = await prisma.modelAsset.create({
        data: {
          productId: id,
          generationJobId: null,
          sourceType: 'UPLOAD',
          localFilePath: relativePath,
          format: 'glb',
          mimeType: 'model/gltf-binary',
          fileSize,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...product,
          assets: [asset, ...product.modelAssets],
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('File too large')) {
        const maxMb = Math.round((config.upload.maxModelSizeBytes || MAX_MODEL_UPLOAD_SIZE_BYTES) / (1024 * 1024));
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `3D model exceeds the ${maxMb} MB upload limit.`,
          },
        });
        return;
      }
      if (err instanceof Error && err.message.includes('Only .glb')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
