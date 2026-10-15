import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { productIdParamSchema, generationIdParamSchema } from '@forma3d/shared';
import { validateParams } from '../middleware/validation.js';
import { createAppError } from '../middleware/error-handler.js';
import { startGenerationJob } from '../jobs/generation.processor.js';
import { TRIPO_PROVIDER_NAME } from '@forma3d/shared';

const router = Router();

// ─── POST /products/:id/generations ─────────────────────────────────
router.post(
  '/products/:id/generations',
  validateParams(productIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          generationJobs: {
            where: {
              status: { in: ['QUEUED', 'PROCESSING', 'DOWNLOADING'] },
            },
          },
        },
      });

      if (!product) {
        throw createAppError('Product not found', 404, 'NOT_FOUND');
      }

      if (!product.sourceImagePath) {
        throw createAppError(
          'Please upload an image before generating a 3D model.',
          400,
          'NO_IMAGE'
        );
      }

      // Prevent duplicate submissions
      if (product.generationJobs.length > 0) {
        throw createAppError(
          'A generation is already in progress for this product.',
          409,
          'GENERATION_IN_PROGRESS'
        );
      }

      // Create the job record
      const job = await prisma.generationJob.create({
        data: {
          productId: product.id,
          providerName: TRIPO_PROVIDER_NAME,
          status: 'QUEUED',
        },
      });

      // Start the job asynchronously (don't await)
      startGenerationJob(job.id).catch((err) => {
        console.error(`[Routes] Failed to start job ${job.id}:`, err);
      });

      res.status(202).json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /generations/:id ───────────────────────────────────────────
router.get(
  '/generations/:id',
  validateParams(generationIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const job = await prisma.generationJob.findUnique({
        where: { id },
        include: {
          modelAssets: true,
        },
      });

      if (!job) {
        throw createAppError('Generation job not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          ...job,
          assets: job.modelAssets,
          modelAssets: undefined,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /generations/:id/retry ────────────────────────────────────
router.post(
  '/generations/:id/retry',
  validateParams(generationIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existingJob = await prisma.generationJob.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!existingJob) {
        throw createAppError('Generation job not found', 404, 'NOT_FOUND');
      }

      if (existingJob.status !== 'FAILED') {
        throw createAppError(
          'Only failed jobs can be retried.',
          400,
          'INVALID_STATUS'
        );
      }

      // Create a new job instead of reusing old one (safe retry)
      const newJob = await prisma.generationJob.create({
        data: {
          productId: existingJob.productId,
          providerName: TRIPO_PROVIDER_NAME,
          status: 'QUEUED',
          retryCount: existingJob.retryCount + 1,
        },
      });

      // Start the job asynchronously
      startGenerationJob(newJob.id).catch((err) => {
        console.error(`[Routes] Failed to start retry job ${newJob.id}:`, err);
      });

      res.status(202).json({
        success: true,
        data: newJob,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
