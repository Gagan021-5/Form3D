import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { productIdParamSchema } from '@forma3d/shared';
import { validateParams } from '../middleware/validation.js';
import { createAppError } from '../middleware/error-handler.js';
import { getAbsolutePath, fileExists } from '../services/storage.service.js';

const router = Router();

// ─── GET /products/:id/image ────────────────────────────────────────
// Serves the source image inline
router.get(
  '/:id/image',
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

      if (!product.sourceImagePath) {
        throw createAppError('No image uploaded', 404, 'NO_IMAGE');
      }

      const exists = await fileExists(product.sourceImagePath);
      if (!exists) {
        throw createAppError('Image file not found', 404, 'FILE_NOT_FOUND');
      }

      const absolutePath = getAbsolutePath(product.sourceImagePath);

      res.setHeader('Content-Type', product.sourceImageMimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) {
          next(createAppError('Error serving image', 500, 'SERVE_ERROR'));
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
