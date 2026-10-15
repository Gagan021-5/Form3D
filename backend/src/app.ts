import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { API_PREFIX } from '@forma3d/shared';
import productRoutes from './routes/products.routes.js';
import generationRoutes from './routes/generations.routes.js';
import assetRoutes from './routes/assets.routes.js';
import imageRoutes from './routes/images.routes.js';
import shopifyRoutes from './routes/shopify.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  // ─── Middleware ──────────────────────────────────────────────
  const allowedOrigins = config.webUrl
    ? config.webUrl.split(',').map((u) => u.trim())
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server, mobile apps, or matching configured origins
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || config.isDev) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── Health Check ───────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tripoConfigured: config.tripo.isConfigured,
    });
  });

  // ─── API Routes ─────────────────────────────────────────────
  app.use(`${API_PREFIX}/products`, productRoutes);
  app.use(`${API_PREFIX}`, generationRoutes);
  app.use(`${API_PREFIX}/assets`, assetRoutes);
  app.use(`${API_PREFIX}/products`, imageRoutes);
  app.use(`${API_PREFIX}/shopify`, shopifyRoutes);

  // ─── Error Handling ─────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
