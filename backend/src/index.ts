import { createApp } from './app.js';
import { config, validateConfig } from './config/env.js';
import { initStorage } from './services/storage.service.js';
import { resumeIncompleteJobs, shutdownJobProcessor } from './jobs/generation.processor.js';
import prisma from './config/database.js';

async function main() {
  try {
    // 1. Validate configuration
    validateConfig();

    // 2. Initialize storage directories
    await initStorage();

    // 3. Connect to database gracefully
    let isDbConnected = false;
    try {
      await prisma.$connect();
      isDbConnected = true;
      console.log('✓ Database connected');

      // Auto-sync PostgreSQL schema: ensure tables & columns exist even on fresh Render deployments
      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            CREATE TABLE IF NOT EXISTS "products" (
              "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "name" VARCHAR(200) NOT NULL,
              "category" VARCHAR(50),
              "source_image_path" TEXT,
              "source_image_mime_type" VARCHAR(100),
              "source_image_size" INTEGER,
              "shopify_product_id" VARCHAR(100),
              "shopify_shop_domain" VARCHAR(200),
              "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "generation_jobs" (
              "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
              "provider_name" VARCHAR(50) NOT NULL,
              "provider_task_id" VARCHAR(200),
              "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
              "provider_status" VARCHAR(50),
              "progress" INTEGER,
              "error_code" VARCHAR(100),
              "error_message" TEXT,
              "retry_count" INTEGER NOT NULL DEFAULT 0,
              "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "completed_at" TIMESTAMP(3)
            );

            CREATE TABLE IF NOT EXISTS "model_assets" (
              "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
              "generation_job_id" UUID REFERENCES "generation_jobs"("id") ON DELETE SET NULL,
              "source_type" VARCHAR(20) NOT NULL DEFAULT 'GENERATION',
              "local_file_path" TEXT NOT NULL,
              "format" VARCHAR(20) NOT NULL,
              "mime_type" VARCHAR(100) NOT NULL,
              "file_size" INTEGER NOT NULL,
              "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'model_assets') THEN
              ALTER TABLE "model_assets" ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(20) DEFAULT 'GENERATION';
              ALTER TABLE "model_assets" ALTER COLUMN "generation_job_id" DROP NOT NULL;
            END IF;
          END $$;
        `);
        console.log('✓ Database schema synchronized successfully');
      } catch (schemaErr) {
        console.warn('⚠️  Could not auto-sync database schema:', (schemaErr as Error).message);
      }
    } catch (dbErr) {
      console.warn('⚠️  Could not connect to PostgreSQL database:', (dbErr as Error).message);
      console.warn('   Ensure DATABASE_URL is set correctly in your Render Environment Variables.');
      console.warn('   The server will continue running. Static assets, demo viewer, and health checks remain active.');
    }

    // 4. Create and start server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Qibo3D API running at ${config.apiUrl}`);
      console.log(`   Health: ${config.apiUrl}/health`);
      console.log(`   API:    ${config.apiUrl}/api/v1\n`);
    });

    // 5. Resume any incomplete jobs if database is connected
    if (isDbConnected) {
      await resumeIncompleteJobs();
    }

    // ─── Graceful Shutdown ──────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      shutdownJobProcessor();
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
