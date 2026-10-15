import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { assetIdParamSchema } from '@forma3d/shared';
import { validateParams } from '../middleware/validation.js';
import { createAppError } from '../middleware/error-handler.js';
import { getAbsolutePath, fileExists, deleteFile } from '../services/storage.service.js';
import path from 'path';

const router = Router();

// ─── GET /assets/:id/download ───────────────────────────────────────
router.get(
  '/:id/download',
  validateParams(assetIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const asset = await prisma.modelAsset.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!asset) {
        throw createAppError('Asset not found', 404, 'NOT_FOUND');
      }

      // Check file exists
      const exists = await fileExists(asset.localFilePath);
      if (!exists) {
        throw createAppError(
          'Model file not found on disk. It may have been deleted.',
          404,
          'FILE_NOT_FOUND'
        );
      }

      const absolutePath = getAbsolutePath(asset.localFilePath);
      const downloadName = `${asset.product.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${asset.format}`;

      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadName}"`
      );
      res.setHeader('Content-Length', asset.fileSize);

      res.sendFile(absolutePath, (err) => {
        if (err) {
          console.error('[Assets] Error sending file:', err);
          // Only send error if headers haven't been sent
          if (!res.headersSent) {
            next(
              createAppError(
                'Error downloading file',
                500,
                'DOWNLOAD_ERROR'
              )
            );
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /assets/:id/serve ──────────────────────────────────────────
// Serves the file inline (for the 3D viewer)
router.get(
  '/:id/serve',
  validateParams(assetIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const asset = await prisma.modelAsset.findUnique({
        where: { id },
      });

      if (!asset) {
        throw createAppError('Asset not found', 404, 'NOT_FOUND');
      }

      const exists = await fileExists(asset.localFilePath);
      if (!exists) {
        throw createAppError(
          'Model file not found on disk.',
          404,
          'FILE_NOT_FOUND'
        );
      }

      const absolutePath = getAbsolutePath(asset.localFilePath);

      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      res.setHeader('Content-Length', asset.fileSize);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) {
          next(createAppError('Error serving file', 500, 'SERVE_ERROR'));
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /assets/:id ─────────────────────────────────────────────
router.delete(
  '/:id',
  validateParams(assetIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const asset = await prisma.modelAsset.findUnique({
        where: { id },
      });

      if (!asset) {
        throw createAppError('Asset not found', 404, 'NOT_FOUND');
      }

      // Delete file from storage
      await deleteFile(asset.localFilePath);

      // Delete asset record
      await prisma.modelAsset.delete({
        where: { id },
      });

      res.json({
        success: true,
        data: { deleted: true, assetId: id },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
