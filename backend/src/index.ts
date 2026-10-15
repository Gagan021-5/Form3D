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
    } catch (dbErr) {
      console.warn('⚠️  Could not connect to PostgreSQL database:', (dbErr as Error).message);
      console.warn('   Ensure DATABASE_URL is set correctly in your Render Environment Variables.');
      console.warn('   The server will continue running. Static assets, demo viewer, and health checks remain active.');
    }

    // 4. Create and start server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Forma3D API running at ${config.apiUrl}`);
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
