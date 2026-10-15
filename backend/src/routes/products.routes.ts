import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { createProductSchema, updateProductSchema, productIdParamSchema, paginationSchema } from '@forma3d/shared';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { uploadImage, validateImageSignature } from '../middleware/upload.js';
import { saveUploadedImage, deleteFile } from '../services/storage.service.js';
import { createAppError } from '../middleware/error-handler.js';

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
        where.generationJobs = {
          some: { status },
        };
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

export default router;
