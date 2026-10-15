import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { shopifyResolveSchema, shopifyGenerateSchema, TRIPO_PROVIDER_NAME } from '@forma3d/shared';
import { validateBody } from '../middleware/validation.js';
import { createAppError } from '../middleware/error-handler.js';
import { downloadRemoteImage, validateReturnUrl, validateSafeImageUrl } from '../services/ssrf.service.js';
import { saveUploadedImage } from '../services/storage.service.js';
import { startGenerationJob } from '../jobs/generation.processor.js';
import { shopifyGenerationLimiter } from '../middleware/rate-limiter.js';

const router = Router();

/**
 * POST /api/v1/shopify/resolve
 * Resolves a Shopify product by its shopifyProductId.
 * If already generated or in progress, returns existing product and job to avoid duplicate work.
 */
router.post(
  '/resolve',
  validateBody(shopifyResolveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shopifyProductId, title, imageUrl, shopDomain, returnUrl } = req.body;

      // Validate image URL against SSRF
      validateSafeImageUrl(imageUrl);

      // Validate return URL against open redirects
      const safeReturnUrl = validateReturnUrl(returnUrl, shopDomain);

      // Look for an existing product mapping
      const existingProduct = await prisma.product.findFirst({
        where: { shopifyProductId },
        include: {
          generationJobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          modelAssets: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (existingProduct) {
        const latestJob = existingProduct.generationJobs[0] || null;
        const assets = existingProduct.modelAssets;

        res.json({
          success: true,
          status: 'existing',
          data: {
            productId: existingProduct.id,
            shopifyProductId,
            title: existingProduct.name,
            imageUrl: existingProduct.sourceImagePath
              ? `/api/v1/images/${existingProduct.sourceImagePath}`
              : imageUrl,
            latestJob,
            assets,
            safeReturnUrl,
          },
        });
        return;
      }

      // No existing record found - ready for generation
      res.json({
        success: true,
        status: 'new',
        data: {
          shopifyProductId,
          title: title?.trim() || 'Shopify Product',
          imageUrl,
          shopDomain: shopDomain || null,
          safeReturnUrl,
          canGenerate: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/shopify/generate
 * Initiates 3D generation from a validated Shopify product image.
 * Protected by IP rate limiting, SSRF filters, file-signature checks, and duplicate guards.
 */
router.post(
  '/generate',
  shopifyGenerationLimiter,
  validateBody(shopifyGenerateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shopifyProductId, title, imageUrl, shopDomain } = req.body;

      // Check if product already exists to prevent duplicate generation jobs on double-click
      const existingProduct = await prisma.product.findFirst({
        where: { shopifyProductId },
        include: {
          generationJobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          modelAssets: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (existingProduct) {
        const latestJob = existingProduct.generationJobs[0];
        // If already active or finished, return existing job
        if (latestJob && ['QUEUED', 'PROCESSING', 'DOWNLOADING', 'SUCCEEDED'].includes(latestJob.status)) {
          res.status(200).json({
            success: true,
            status: 'existing_in_progress',
            data: {
              productId: existingProduct.id,
              job: latestJob,
              assets: existingProduct.modelAssets,
            },
          });
          return;
        }
      }

      // Download and validate the remote image securely
      const { buffer, detectedType, size, filename } = await downloadRemoteImage(imageUrl);

      // Save to local storage
      const { relativePath } = await saveUploadedImage(buffer, filename);

      let product;
      if (existingProduct) {
        // Update existing record
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: title?.trim() || existingProduct.name,
            sourceImagePath: relativePath,
            sourceImageMimeType: detectedType,
            sourceImageSize: size,
          },
        });
      } else {
        // Create new mapped product
        product = await prisma.product.create({
          data: {
            name: title?.trim() || 'Shopify Product',
            shopifyProductId,
            shopifyShopDomain: shopDomain || null,
            sourceImagePath: relativePath,
            sourceImageMimeType: detectedType,
            sourceImageSize: size,
          },
        });
      }

      // Create new generation job
      const job = await prisma.generationJob.create({
        data: {
          productId: product.id,
          providerName: TRIPO_PROVIDER_NAME,
          status: 'QUEUED',
        },
      });

      // Start the generation job asynchronously
      startGenerationJob(job.id).catch((err) => {
        console.error(`[ShopifyRoutes] Failed to start job ${job.id}:`, err);
      });

      res.status(202).json({
        success: true,
        status: 'queued',
        data: {
          productId: product.id,
          job,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
